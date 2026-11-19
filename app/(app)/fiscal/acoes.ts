"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { lerNFe, marcaModeloDaDescricao, type NFeLida } from "@/lib/nfe/xml-parser";
import { provedorFiscal, type NotaSaida, type ResultadoFiscal } from "@/lib/integracoes/fiscal";
import { textoOpc } from "@/lib/estoque/esquemas";
import { apenasDigitos } from "@/lib/utils";
import type { Json } from "@/lib/supabase/database.types";
import { dispararWebhooks } from "@/lib/webhooks/entregar";

const TAMANHO_MAX = 2_000_000;

export type Previa = {
  nota: NFeLida;
  jaImportada: { id: string } | null;
  fornecedor: { id: string; nome: string } | null;
  veiculo: { id: string; nome: string } | null;
  direcao: "entrada" | "saida";
};

export async function previsualizarXml(xml: string): Promise<EstadoAcao<Previa>> {
  await exigirPermissao("fiscal");
  if (!xml || xml.length > TAMANHO_MAX) return { ok: false, erro: "Arquivo vazio ou grande demais (máx. 2 MB)." };
  let nota: NFeLida;
  try {
    nota = lerNFe(xml);
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "XML inválido." };
  }
  const supabase = await criarClienteServidor();
  const { data: cfg } = await supabase.from("configuracoes_fiscais").select("cnpj").single();
  const chassi = nota.itens.find((i) => i.veiculo?.chassi)?.veiculo?.chassi ?? null;
  const [{ data: existente }, { data: fornecedor }, { data: veiculo }] = await Promise.all([
    supabase.from("notas_fiscais").select("id").eq("chave_acesso", nota.chave).maybeSingle(),
    nota.emitente.documento
      ? supabase.from("fornecedores").select("id, nome").eq("documento", nota.emitente.documento).maybeSingle()
      : Promise.resolve({ data: null }),
    chassi ? supabase.from("veiculos").select("id, marca, modelo, placa").eq("chassi", chassi).order("criado_em", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const direcao = cfg?.cnpj && nota.emitente.documento === cfg.cnpj ? "saida" : "entrada";
  return {
    ok: true,
    dados: {
      nota,
      jaImportada: existente ? { id: existente.id } : null,
      fornecedor: fornecedor ?? null,
      veiculo: veiculo ? { id: veiculo.id, nome: `${veiculo.marca} ${veiculo.modelo}${veiculo.placa ? ` ${veiculo.placa}` : ""}` } : null,
      direcao,
    },
  };
}

const opcoesImportacao = z.object({
  criarFornecedor: z.boolean(),
  tipoFornecedor: z.enum(["locadora", "lojista", "particular", "oficina", "despachante", "outro"]).default("outro"),
  veiculo: z.enum(["nenhum", "vincular", "criar"]),
  veiculoId: z.uuid().nullable().optional(),
  lancarContaPagar: z.boolean(),
  categoriaId: z.uuid().nullable().optional(),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function importarXml(xml: string, opcoes: z.input<typeof opcoesImportacao>): Promise<EstadoAcao<{ id: string }>> {
  await exigirPermissao("fiscal");
  const o = opcoesImportacao.safeParse(opcoes);
  if (!o.success) return { ok: false, erro: "Opções inválidas." };
  const previa = await previsualizarXml(xml);
  if (!previa.ok || !previa.dados) return { ok: false, erro: previa.erro };
  const { nota, jaImportada, direcao } = previa.dados;
  if (jaImportada) return { ok: false, erro: "Esta nota já foi importada." };
  const supabase = await criarClienteServidor();

  // 1) Fornecedor
  let fornecedorId = previa.dados.fornecedor?.id ?? null;
  if (!fornecedorId && o.data.criarFornecedor && direcao === "entrada" && nota.emitente.documento) {
    const { data, error } = await supabase
      .from("fornecedores")
      .insert({
        tipo: o.data.tipoFornecedor,
        nome: nota.emitente.fantasia ?? nota.emitente.nome,
        razao_social: nota.emitente.nome,
        documento: nota.emitente.documento,
        cidade: nota.emitente.cidade,
        uf: nota.emitente.uf,
        observacoes: "Cadastrado a partir do XML de NF-e.",
      })
      .select("id")
      .single();
    if (error) return { ok: false, erro: `Fornecedor: ${mensagemDeErro(error)}` };
    fornecedorId = data.id;
  }

  // 2) Veículo
  let veiculoId: string | null = o.data.veiculo === "vincular" ? o.data.veiculoId ?? previa.dados.veiculo?.id ?? null : null;
  const itemVeiculo = nota.itens.find((i) => i.veiculo) ?? nota.itens[0];
  if (o.data.veiculo === "criar" && itemVeiculo) {
    const mm = marcaModeloDaDescricao(itemVeiculo.descricao);
    const v = itemVeiculo.veiculo;
    const dataEntrada = nota.dataEmissao?.slice(0, 10) ?? null;
    const { data, error } = await supabase.rpc("salvar_veiculo", {
      p_id: null as unknown as string,
      p_veiculo: {
        tipo: "proprio",
        origem: "compra",
        status: "em_preparacao",
        marca: mm.marca,
        modelo: mm.modelo || "Modelo",
        versao: mm.versao,
        chassi: v?.chassi ?? null,
        renavam: v?.renavam ?? null,
        placa: v?.placa ?? null,
        cor: v?.cor ? v.cor.charAt(0) + v.cor.slice(1).toLowerCase() : null,
        ano_fabricacao: v?.anoFabricacao ?? null,
        ano_modelo: v?.anoModelo ?? null,
        combustivel: v?.combustivel ?? null,
        ...(dataEntrada ? { data_entrada: dataEntrada } : {}),
        observacoes: `Entrada pela NF-e ${nota.numero}/${nota.serie}.`,
      } as Json,
      p_sigilo: { valor_compra: itemVeiculo.valorTotal ?? nota.valorTotal, data_compra: dataEntrada, fornecedor_id: fornecedorId } as Json,
    });
    if (error) return { ok: false, erro: `Veículo: ${mensagemDeErro(error)}` };
    veiculoId = data;
  }

  // 3) Nota, itens e XML no Storage
  const { data: notaDb, error: errNota } = await supabase
    .from("notas_fiscais")
    .insert({
      direcao,
      origem: "xml_importado",
      status: nota.autorizada ? "importada" : "importada",
      chave_acesso: nota.chave,
      numero: nota.numero,
      serie: nota.serie,
      modelo: nota.modelo,
      data_emissao: nota.dataEmissao,
      natureza_operacao: nota.naturezaOperacao,
      cfop: nota.itens[0]?.cfop ?? null,
      valor_total: nota.valorTotal,
      valor_produtos: nota.valorProdutos,
      valor_icms: nota.valorICMS,
      emitente_documento: nota.emitente.documento,
      emitente_nome: nota.emitente.nome,
      destinatario_documento: nota.destinatario.documento,
      destinatario_nome: nota.destinatario.nome,
      protocolo: nota.protocolo,
      motivo_status: nota.situacao,
      veiculo_id: veiculoId,
      fornecedor_id: direcao === "entrada" ? fornecedorId : null,
      dados: { informacoes_complementares: nota.informacoesComplementares } as Json,
    })
    .select("id")
    .single();
  if (errNota || !notaDb) return { ok: false, erro: mensagemDeErro(errNota) };

  if (nota.itens.length) {
    await supabase.from("notas_fiscais_itens").insert(
      nota.itens.map((i) => ({
        nota_id: notaDb.id,
        numero_item: i.numero,
        codigo: i.codigo,
        descricao: i.descricao,
        ncm: i.ncm,
        cfop: i.cfop,
        unidade: i.unidade,
        quantidade: i.quantidade,
        valor_unitario: i.valorUnitario,
        valor_total: i.valorTotal,
        chassi: i.veiculo?.chassi ?? null,
        dados_veiculo: (i.veiculo ?? null) as Json,
      })),
    );
  }
  const path = `notas/${nota.chave}.xml`;
  const up = await supabase.storage.from("fiscal").upload(path, new Blob([xml], { type: "application/xml" }), { contentType: "application/xml", upsert: true });
  if (!up.error) {
    const { data: arq } = await supabase
      .from("arquivos")
      .insert({ bucket: "fiscal", path, nome: `NFe-${nota.numero}.xml`, mime: "application/xml", tamanho: xml.length, entidade: "nota", entidade_id: notaDb.id, categoria: "nf_xml", sigiloso: true })
      .select("id")
      .single();
    if (arq) await supabase.from("notas_fiscais").update({ xml_arquivo_id: arq.id }).eq("id", notaDb.id);
  }
  await supabase.from("notas_fiscais_eventos").insert({ nota_id: notaDb.id, tipo: "importacao", mensagem: `XML importado (${nota.situacao ?? "sem protocolo"})`, protocolo: nota.protocolo });

  // 4) Conta a pagar (quando não veio de compra de veículo, que já gera a sua)
  if (o.data.lancarContaPagar && direcao === "entrada" && o.data.veiculo !== "criar") {
    const categoria = o.data.categoriaId ?? null;
    if (!categoria) return { ok: true, mensagem: "Nota importada. Escolha a categoria para lançar a conta a pagar.", dados: { id: notaDb.id } };
    await supabase.from("lancamentos").insert({
      tipo: "despesa",
      descricao: `NF-e ${nota.numero} — ${nota.emitente.fantasia ?? nota.emitente.nome}`,
      categoria_id: categoria,
      valor: nota.valorTotal,
      data_competencia: nota.dataEmissao?.slice(0, 10),
      data_vencimento: o.data.vencimento ?? nota.dataEmissao?.slice(0, 10),
      fornecedor_id: fornecedorId,
      veiculo_id: veiculoId,
      nota_fiscal_id: notaDb.id,
    });
  } else if (o.data.veiculo === "criar" && veiculoId) {
    await supabase.from("lancamentos").update({ nota_fiscal_id: notaDb.id }).eq("veiculo_id", veiculoId).eq("status", "pendente");
  }

  revalidatePath("/fiscal");
  revalidatePath("/estoque", "layout");
  revalidatePath("/financeiro", "layout");
  dispararWebhooks();
  return { ok: true, mensagem: "Nota importada.", dados: { id: notaDb.id } };
}

// ---------------------------------------------------------------------------
// Emissão de NF-e de saída
// ---------------------------------------------------------------------------
const esquemaEmissao = z.object({
  venda_id: z.uuid(),
  natureza_operacao: z.string().trim().min(3, "Informe a natureza da operação."),
  cfop: z.string().trim().regex(/^\d{4}$/, "CFOP com 4 dígitos."),
  ncm: z.string().trim().regex(/^\d{8}$/, "NCM com 8 dígitos."),
  csosn_cst: z.string().trim().min(2, "Informe o CSOSN/CST."),
  informacoes: textoOpc,
});

function faltasConfig(cfg: Record<string, unknown> | null): string[] {
  const obrig: [string, string][] = [
    ["cnpj", "CNPJ"], ["inscricao_estadual", "inscrição estadual"], ["razao_social", "razão social"], ["regime_tributario", "regime tributário"],
    ["logradouro", "endereço"], ["numero", "número"], ["bairro", "bairro"], ["cep", "CEP"],
  ];
  return obrig.filter(([k]) => !cfg?.[k]).map(([, r]) => r);
}

export async function emitirNotaVenda(_: EstadoAcao<{ id: string }>, fd: FormData): Promise<EstadoAcao<{ id: string }>> {
  await exigirPermissao("fiscal");
  const dados = esquemaEmissao.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const supabase = await criarClienteServidor();
  const [{ data: cfg }, { data: venda }] = await Promise.all([
    supabase.from("configuracoes_fiscais").select("*").single(),
    supabase.from("vendas").select("*, veiculos(*), clientes(id, nome, email, whatsapp, telefone), vendas_pagamentos(forma, valor), vendas_trocas(valor_avaliacao)").eq("id", dados.data.venda_id).single(),
  ]);
  if (!venda || venda.status !== "fechada") return { ok: false, erro: "Só é possível emitir nota de venda fechada." };
  const faltas = faltasConfig(cfg as Record<string, unknown> | null);
  const provedor = provedorFiscal();
  const simulado = provedor.nome.startsWith("Simulado");
  if (faltas.length && !simulado) return { ok: false, erro: `Configuração fiscal incompleta: ${faltas.join(", ")}.` };
  if (!provedor.configurado) return { ok: false, erro: `Provedor ${provedor.nome} sem credenciais. Configure as variáveis de ambiente.` };

  const { data: pessoais } = await supabase
    .from("clientes_dados_pessoais")
    .select("logradouro, numero, complemento, bairro, cidade, uf, cep")
    .eq("cliente_id", venda.cliente_id)
    .maybeSingle();
  const { data: cpf } = await supabase.rpc("revelar_dado_pessoal", { p_cliente: venda.cliente_id, p_campo: "cpf", p_motivo: "Emissão de NF-e de venda" });
  if (!cpf && !simulado) return { ok: false, erro: "Cliente sem CPF cadastrado. Preencha os dados pessoais do cliente." };
  if ((!pessoais?.logradouro || !pessoais?.cep) && !simulado) return { ok: false, erro: "Cliente sem endereço completo. Preencha na ficha do cliente." };

  const v = venda.veiculos as { id: string; marca: string; modelo: string; versao: string | null; ano_fabricacao: number | null; ano_modelo: number | null; cor: string | null; placa: string | null; chassi: string | null; renavam: string | null };
  const cliente = venda.clientes as { id: string; nome: string; email: string | null };
  const descricao = [
    `${v.marca} ${v.modelo}${v.versao ? ` ${v.versao}` : ""}`.toUpperCase(),
    v.ano_fabricacao && v.ano_modelo ? `${v.ano_fabricacao}/${v.ano_modelo}` : v.ano_modelo,
    v.cor?.toUpperCase(),
    v.placa && `PLACA ${v.placa}`,
    v.chassi && `CHASSI ${v.chassi}`,
    v.renavam && `RENAVAM ${v.renavam}`,
  ].filter(Boolean).join(" ");

  const end = (e: { logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; municipio?: string | null; cidade?: string | null; uf?: string | null; cep?: string | null; codigo_municipio?: string | null } | null) => ({
    logradouro: e?.logradouro ?? "", numero: e?.numero ?? "S/N", complemento: e?.complemento ?? null, bairro: e?.bairro ?? "",
    municipio: e?.municipio ?? e?.cidade ?? "", codigoMunicipio: e?.codigo_municipio ?? null, uf: e?.uf ?? "MG", cep: e?.cep ?? "",
  });

  // Registra a nota antes de enviar (referência única para o provedor)
  const { data: notaDb, error: errNota } = await supabase
    .from("notas_fiscais")
    .insert({
      direcao: "saida",
      origem: "emitida",
      status: "processando",
      natureza_operacao: dados.data.natureza_operacao,
      cfop: dados.data.cfop,
      valor_total: venda.valor_venda,
      emitente_documento: cfg?.cnpj,
      emitente_nome: cfg?.razao_social,
      destinatario_documento: cpf ?? null,
      destinatario_nome: cliente.nome,
      veiculo_id: v.id,
      cliente_id: cliente.id,
      venda_id: venda.id,
      provedor: provedor.nome,
      simulada: simulado,
    })
    .select("id")
    .single();
  if (errNota || !notaDb) return { ok: false, erro: mensagemDeErro(errNota) };

  const pagamentos = [
    ...((venda.vendas_pagamentos as { forma: string; valor: number }[]) ?? []).map((p) => ({ forma: p.forma, valor: Number(p.valor) })),
    ...((venda.vendas_trocas as { valor_avaliacao: number }[]) ?? []).map((t) => ({ forma: "troca", valor: Number(t.valor_avaliacao) })),
  ];
  const notaSaida: NotaSaida = {
    referencia: notaDb.id,
    ambiente: (cfg?.ambiente as "homologacao" | "producao") ?? "homologacao",
    dataEmissao: new Date().toISOString(),
    naturezaOperacao: dados.data.natureza_operacao,
    emitente: {
      cnpj: cfg?.cnpj ?? "",
      inscricaoEstadual: cfg?.inscricao_estadual ?? "",
      razaoSocial: cfg?.razao_social ?? "Caetano Auto",
      nomeFantasia: cfg?.nome_fantasia,
      regime: cfg?.regime_tributario ?? "",
      endereco: end(cfg),
      telefone: cfg?.telefone,
    },
    destinatario: { nome: cliente.nome, documento: apenasDigitos(cpf ?? ""), email: cliente.email, endereco: end(pessoais) },
    itens: [{ numero: 1, codigo: v.placa ?? v.id.slice(0, 8), descricao, ncm: dados.data.ncm, cfop: dados.data.cfop, quantidade: 1, valorUnitario: Number(venda.valor_venda), valorTotal: Number(venda.valor_venda), csosnCst: dados.data.csosn_cst }],
    pagamentos,
    valorTotal: Number(venda.valor_venda),
    informacoesComplementares: [dados.data.informacoes, cfg?.informacoes_complementares].filter(Boolean).join(" | ") || null,
  };

  let r: ResultadoFiscal;
  try {
    r = await provedor.emitir(notaSaida);
  } catch (e) {
    r = { status: "erro", mensagem: e instanceof Error ? e.message : "Falha ao comunicar com o provedor." };
  }
  await aplicarResultado(notaDb.id, r, "envio");
  revalidatePath("/fiscal");
  revalidatePath(`/vendas/${venda.id}`);
  if (r.status === "erro" || r.status === "rejeitada") return { ok: false, erro: `Nota não autorizada: ${r.mensagem ?? "erro no provedor"}`, dados: { id: notaDb.id } };
  dispararWebhooks();
  return { ok: true, mensagem: r.status === "autorizada" ? (r.simulada ? "Nota SIMULADA gerada (sem valor fiscal)." : "NF-e autorizada.") : "Nota enviada; aguardando autorização.", dados: { id: notaDb.id } };
}

async function aplicarResultado(notaId: string, r: ResultadoFiscal, tipoEvento: "envio" | "consulta" | "cancelamento") {
  const supabase = await criarClienteServidor();
  const status = r.status === "erro" ? "rejeitada" : r.status;
  await supabase
    .from("notas_fiscais")
    .update({
      status,
      chave_acesso: r.chave ?? undefined,
      numero: r.numero ?? undefined,
      serie: r.serie ?? undefined,
      protocolo: r.protocolo ?? undefined,
      motivo_status: r.mensagem ?? undefined,
      provedor_ref: r.referenciaProvedor ?? undefined,
      pdf_url_externa: r.pdfUrl ?? undefined,
      data_emissao: r.status === "autorizada" ? new Date().toISOString() : undefined,
      simulada: r.simulada ?? undefined,
    })
    .eq("id", notaId);
  await supabase.from("notas_fiscais_eventos").insert({
    nota_id: notaId,
    tipo: r.status === "autorizada" ? "autorizacao" : r.status === "cancelada" ? "cancelamento" : r.status === "erro" || r.status === "rejeitada" ? (tipoEvento === "envio" ? "rejeicao" : "erro") : tipoEvento,
    protocolo: r.protocolo ?? null,
    mensagem: r.mensagem ?? null,
    payload: (r.bruto ?? null) as Json,
  });
}

export async function consultarNota(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("fiscal");
  const id = String(fd.get("id"));
  const supabase = await criarClienteServidor();
  const { data: n } = await supabase.from("notas_fiscais").select("provedor_ref, id").eq("id", id).single();
  try {
    const r = await provedorFiscal().consultar(n?.provedor_ref ?? id);
    await aplicarResultado(id, r, "consulta");
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha na consulta." };
  }
  revalidatePath(`/fiscal/${id}`);
  dispararWebhooks();
  return { ok: true, mensagem: "Situação atualizada." };
}

export async function cancelarNota(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("fiscal");
  const id = String(fd.get("id"));
  const justificativa = String(fd.get("justificativa") ?? "").trim();
  if (justificativa.length < 15) return { ok: false, erro: "A justificativa precisa ter pelo menos 15 caracteres (exigência da SEFAZ)." };
  const supabase = await criarClienteServidor();
  const { data: n } = await supabase.from("notas_fiscais").select("provedor_ref, status, direcao").eq("id", id).single();
  if (!n || n.direcao !== "saida" || n.status !== "autorizada") return { ok: false, erro: "Só notas de saída autorizadas podem ser canceladas." };
  try {
    const r = await provedorFiscal().cancelar(n.provedor_ref ?? id, justificativa);
    await aplicarResultado(id, r, "cancelamento");
    if (r.status !== "cancelada") return { ok: false, erro: r.mensagem ?? "Cancelamento não aceito." };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha no cancelamento." };
  }
  revalidatePath(`/fiscal/${id}`);
  return { ok: true, mensagem: "Nota cancelada." };
}

// ---------------------------------------------------------------------------
// Configuração fiscal (dono)
// ---------------------------------------------------------------------------
const esquemaConfig = z.object({
  cnpj: z.string().optional().transform((v) => (v ? apenasDigitos(v) : null)).refine((v) => !v || v.length === 14, "CNPJ com 14 dígitos."),
  inscricao_estadual: textoOpc,
  inscricao_municipal: textoOpc,
  razao_social: textoOpc,
  nome_fantasia: textoOpc,
  regime_tributario: z.preprocess((v) => (v === "" ? null : v), z.enum(["simples_nacional", "simples_excesso", "lucro_presumido", "lucro_real", "mei"]).nullable().optional()),
  logradouro: textoOpc,
  numero: textoOpc,
  complemento: textoOpc,
  bairro: textoOpc,
  cep: z.string().optional().transform((v) => (v ? apenasDigitos(v) : null)).refine((v) => !v || v.length === 8, "CEP com 8 dígitos."),
  municipio: z.string().trim().min(2),
  codigo_municipio: z.string().trim().regex(/^\d{7}$/, "Código IBGE com 7 dígitos."),
  uf: z.string().trim().length(2).transform((v) => v.toUpperCase()),
  telefone: textoOpc,
  email: textoOpc,
  ambiente: z.enum(["homologacao", "producao"]),
  serie_nfe: z.coerce.number().int().min(1).max(999),
  ncm_veiculos: z.string().optional().transform((v) => (v ? apenasDigitos(v) : null)).refine((v) => !v || v.length === 8, "NCM com 8 dígitos."),
  natureza_venda: z.string().trim().min(3),
  cfop_venda_proprio: textoOpc,
  cfop_venda_proprio_fora_uf: textoOpc,
  cfop_venda_consignado: textoOpc,
  cfop_entrada_compra: textoOpc,
  cfop_entrada_consignacao: textoOpc,
  cfop_devolucao_consignacao: textoOpc,
  csosn_cst_padrao: textoOpc,
  informacoes_complementares: textoOpc,
});

export async function salvarConfigFiscal(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("fiscal.configurar");
  const dados = esquemaConfig.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("configuracoes_fiscais").update(dados.data).eq("id", true);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/configuracoes/fiscal");
  return { ok: true, mensagem: "Configuração fiscal salva." };
}

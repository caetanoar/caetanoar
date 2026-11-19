"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mensagemDeErro } from "@/lib/acoes";
import { ORIGEM_LEAD, ETAPA_FUNIL, MOTIVO_PERDA, CANAL_CONTATO } from "@/lib/clientes/rotulos";
import { nomeVeiculo } from "@/lib/estoque/rotulos";
import { diasEntre, formatarData, hojeISO } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/moeda";
import { normalizarTexto } from "@/lib/utils";
import { ErroIA, gerarEstruturado, iaAtiva, limiteDiario } from "./claude";
import { SaidaAnuncio, SaidaCliente, type ResultadoAnuncio, type ResultadoCliente } from "./esquemas";
import { laudoAprovado, limitar, montarLegenda, pendenciasAnuncio, textosComprovados, type DadosAnuncio } from "./legenda";
import { entradaAnuncio, SISTEMA_ANUNCIO, SISTEMA_CLIENTE, type EntradaCliente } from "./prompts";
import { limparDadosPessoais, primeiroNome } from "./privacidade";
import { anuncioSimulado, clienteSimulado } from "./simulado";
import { removerTrechosProibidos, validarTexto, type ContextoValidacao } from "./validador";

type Retorno<T> = { ok: true; dados: T } | { ok: false; erro: string };

const Id = z.uuid();

async function checarLimite(supabase: Awaited<ReturnType<typeof criarClienteServidor>>): Promise<string | null> {
  if (!iaAtiva()) return null;
  const { data } = await supabase.rpc("ia_geracoes_hoje");
  return (data ?? 0) >= limiteDiario() ? `Limite diário de ${limiteDiario()} gerações com IA atingido. Tente amanhã.` : null;
}

/** Gera, valida e, se preciso, pede uma nova versão sem as expressões proibidas. */
async function gerarValidado<S extends z.ZodType>(
  esquema: S,
  sistema: string,
  entrada: object,
  textos: (s: z.infer<S>) => string[],
  ctx: ContextoValidacao,
) {
  const json = JSON.stringify(entrada, null, 2);
  let r = await gerarEstruturado(esquema, sistema, json);
  let proibidas = [...new Set(textos(r.dados).flatMap((t) => validarTexto(t, ctx)))];
  if (proibidas.length) {
    const nova = await gerarEstruturado(
      esquema,
      sistema,
      `${json}\n\nA versão anterior usou expressões não permitidas para este carro: ${proibidas.join(", ")}. Reescreva sem elas.`,
    );
    r = { ...nova, tokensEntrada: r.tokensEntrada + nova.tokensEntrada, tokensSaida: r.tokensSaida + nova.tokensSaida };
    proibidas = [...new Set(textos(r.dados).flatMap((t) => validarTexto(t, ctx)))];
  }
  return { ...r, proibidas };
}

// -----------------------------------------------------------------------------
// Anúncios do veículo (Instagram, OLX, Marketplace) — qualquer usuário ativo
// -----------------------------------------------------------------------------
export async function gerarAnuncios(veiculoId: string): Promise<Retorno<ResultadoAnuncio>> {
  const usuario = await exigirUsuario();
  if (!Id.safeParse(veiculoId).success) return { ok: false, erro: "Veículo inválido." };
  const supabase = await criarClienteServidor();

  const [{ data: v }, { data: itens }, { data: hist }, { data: cfg }] = await Promise.all([
    supabase
      .from("v_veiculos")
      .select("marca, modelo, versao, motor, ano_fabricacao, ano_modelo, cor, km, combustivel, cambio, portas, preco_anunciado, laudo_cautelar, laudo_resultado, descricao, status")
      .eq("id", veiculoId)
      .maybeSingle(),
    supabase.from("veiculo_itens").select("item").eq("veiculo_id", veiculoId).eq("confirmado", true).order("ordem").order("item"),
    supabase.from("veiculo_historico").select("descricao, comprovado, tipo").eq("veiculo_id", veiculoId).eq("visivel_anuncio", true).order("data"),
    supabase.from("configuracoes").select("regiao_anuncio, assinatura, telefones_assinatura").single(),
  ]);
  if (!v || !cfg) return { ok: false, erro: "Veículo não encontrado." };
  if (v.status === "vendido" || v.status === "devolvido") return { ok: false, erro: "Este carro não está mais à venda." };

  const limite = await checarLimite(supabase);
  if (limite) return { ok: false, erro: limite };

  const d: DadosAnuncio = {
    marca: v.marca!, modelo: v.modelo!, versao: v.versao, motor: v.motor, ano_fabricacao: v.ano_fabricacao, ano_modelo: v.ano_modelo,
    cor: v.cor, km: v.km, combustivel: v.combustivel, cambio: v.cambio, portas: v.portas, preco_anunciado: v.preco_anunciado,
    laudo_cautelar: !!v.laudo_cautelar, laudo_resultado: v.laudo_resultado, descricao: limparDadosPessoais(v.descricao) || null,
    itens_confirmados: (itens ?? []).map((i) => i.item),
    historico: (hist ?? []).map((h) => ({ descricao: h.descricao, comprovado: h.comprovado, tipo: h.tipo })),
  };
  const ctx: ContextoValidacao = { laudoAprovado: laudoAprovado(d), comprovados: textosComprovados(d) };
  const entrada = entradaAnuncio(d);
  const textos = (s: SaidaAnuncio) => [s.frase_instagram, s.olx.titulo, s.olx.descricao, s.marketplace.titulo, s.marketplace.descricao];

  let saida: SaidaAnuncio;
  let meta = { modelo: "simulado", tokensEntrada: 0, tokensSaida: 0, simulado: true };
  const avisos: string[] = [];
  try {
    if (iaAtiva()) {
      const r = await gerarValidado(SaidaAnuncio, SISTEMA_ANUNCIO, entrada, textos, ctx);
      saida = r.dados;
      meta = { modelo: r.modelo, tokensEntrada: r.tokensEntrada, tokensSaida: r.tokensSaida, simulado: false };
      if (r.proibidas.length) avisos.push(`Trechos removidos por conter expressões não permitidas sem laudo: ${r.proibidas.join(", ")}.`);
    } else {
      saida = anuncioSimulado(d);
    }
  } catch (erro) {
    return { ok: false, erro: erro instanceof ErroIA ? erro.message : "Falha ao gerar os textos." };
  }

  // Limpeza final, sempre: nada de expressão proibida chega à tela.
  const limpo = (t: string) => removerTrechosProibidos(t, ctx);
  const telefones = cfg.telefones_assinatura;
  const resultado = {
    instagram: montarLegenda(d, limpo(saida.frase_instagram), cfg),
    olx: { titulo: limitar(limpo(saida.olx.titulo), 70), descricao: limpo(saida.olx.descricao) },
    marketplace: {
      titulo: limitar(limpo(saida.marketplace.titulo), 100),
      descricao: `${limpo(saida.marketplace.descricao)}\n\n${cfg.assinatura}\n📲 ${telefones}`,
    },
  };
  const pendencias = pendenciasAnuncio(d);
  const extras = { pendencias, laudoAprovado: ctx.laudoAprovado, comprovados: ctx.comprovados ?? [] };

  const { data: salvo, error } = await supabase
    .from("ia_geracoes")
    .insert({
      tipo: "anuncio",
      veiculo_id: veiculoId,
      entrada,
      saida: { ...resultado, ...extras },
      avisos,
      modelo: meta.simulado ? "simulado" : meta.modelo,
      simulado: meta.simulado,
      tokens_entrada: meta.tokensEntrada || null,
      tokens_saida: meta.tokensSaida || null,
      usuario_id: usuario.id,
    })
    .select("id, criado_em")
    .single();
  if (error) return { ok: false, erro: mensagemDeErro(error) };

  revalidatePath(`/estoque/${veiculoId}`);
  return {
    ok: true,
    dados: { id: salvo.id, ...resultado, ...extras, avisos, simulado: meta.simulado, criadoEm: salvo.criado_em },
  };
}

// -----------------------------------------------------------------------------
// Resumo do cliente e sugestão de follow-up — gestor ou vendedor do cliente
// -----------------------------------------------------------------------------
const PALAVRAS_IGNORADAS = new Set(["carro", "quero", "procura", "procurando", "ate", "mil", "com", "para", "uma", "um", "de", "do", "da", "e", "ou", "ano", "km"]);

export async function gerarResumoCliente(clienteId: string): Promise<Retorno<ResultadoCliente>> {
  const usuario = await exigirUsuario();
  if (!Id.safeParse(clienteId).success) return { ok: false, erro: "Cliente inválido." };
  const supabase = await criarClienteServidor();

  // A RLS garante: vendedor só enxerga os próprios clientes.
  const [{ data: c }, { data: interesses }, { data: contatos }, { data: compras }, { data: estoque }] = await Promise.all([
    supabase.from("v_clientes").select("nome, origem, etapa, motivo_perda, criado_em, ultimo_contato_em, proximo_contato_em, vendedor_nome").eq("id", clienteId).maybeSingle(),
    supabase.from("clientes_interesses").select("descricao, preco_max, veiculo_id, veiculos(marca, modelo, versao)").eq("cliente_id", clienteId).eq("ativo", true),
    supabase.from("clientes_contatos").select("data_hora, canal, resumo, proximo_passo").eq("cliente_id", clienteId).order("data_hora", { ascending: false }).limit(10),
    supabase.from("v_vendas").select("data_venda, veiculo_nome").eq("cliente_id", clienteId).eq("status", "fechada"),
    supabase.from("v_veiculos").select("id, marca, modelo, versao, ano_modelo, preco_anunciado").eq("status", "disponivel").limit(200),
  ]);
  if (!c) return { ok: false, erro: "Cliente não encontrado." };

  const limite = await checarLimite(supabase);
  if (limite) return { ok: false, erro: limite };

  // Carros disponíveis que combinam com os interesses (marca/modelo citados ou faixa de preço).
  const tokens = new Set(
    (interesses ?? [])
      .flatMap((i) => normalizarTexto([i.descricao, i.veiculos?.marca, i.veiculos?.modelo].filter(Boolean).join(" ")).split(/[^a-z0-9-]+/))
      .filter((t) => t.length >= 2 && !PALAVRAS_IGNORADAS.has(t) && !/^\d+$/.test(t)),
  );
  const tetos = (interesses ?? []).map((i) => Number(i.preco_max)).filter((n) => n > 0);
  const teto = tetos.length ? Math.max(...tetos) : null;
  const idsInteresse = new Set((interesses ?? []).map((i) => i.veiculo_id).filter(Boolean));
  const compativeis = (estoque ?? [])
    .map((v) => {
      const texto = normalizarTexto(`${v.marca} ${v.modelo} ${v.versao ?? ""}`);
      const casa = [...tokens].filter((t) => texto.includes(t)).length;
      const preco = Number(v.preco_anunciado ?? 0);
      const noPreco = teto === null || (preco > 0 && preco <= teto * 1.1);
      const pontos = (idsInteresse.has(v.id) ? 10 : 0) + casa * 3 + (noPreco && teto !== null ? 1 : 0);
      return { v, pontos, noPreco };
    })
    .filter((x) => x.noPreco && x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 8)
    .map(({ v }) => ({ id: v.id!, nome: `${nomeVeiculo({ marca: v.marca!, modelo: v.modelo!, versao: v.versao })} ${v.ano_modelo ?? ""}`.trim(), preco: v.preco_anunciado }));

  const hoje = hojeISO();
  const entrada: EntradaCliente = {
    primeiro_nome: primeiroNome(c.nome),
    vendedor: c.vendedor_nome ? primeiroNome(c.vendedor_nome) : null,
    origem: ORIGEM_LEAD[c.origem!],
    etapa: ETAPA_FUNIL[c.etapa!].rotulo.toLocaleLowerCase("pt-BR"),
    motivo_perda: c.motivo_perda ? MOTIVO_PERDA[c.motivo_perda] : null,
    dias_desde_cadastro: diasEntre(c.criado_em!.slice(0, 10), hoje),
    dias_desde_ultimo_contato: c.ultimo_contato_em ? diasEntre(c.ultimo_contato_em.slice(0, 10), hoje) : null,
    proximo_contato_marcado: c.proximo_contato_em ? formatarData(c.proximo_contato_em) : null,
    interesses: (interesses ?? []).map((i) => ({
      descricao: limparDadosPessoais(i.descricao) || (i.veiculos ? nomeVeiculo(i.veiculos) : "—"),
      faixa_preco: i.preco_max ? `até ${formatarMoeda(Number(i.preco_max))}` : null,
      veiculo: i.veiculos ? nomeVeiculo(i.veiculos) : null,
    })),
    contatos: (contatos ?? []).map((k) => ({
      data: formatarData(k.data_hora),
      canal: CANAL_CONTATO[k.canal],
      resumo: limparDadosPessoais(k.resumo),
      resultado: null,
      proximo_passo: limparDadosPessoais(k.proximo_passo) || null,
    })),
    compras: (compras ?? []).map((v) => ({ data: formatarData(v.data_venda), veiculo: v.veiculo_nome ?? "" })),
    estoque_compativel: compativeis,
  };

  const ctx: ContextoValidacao = { laudoAprovado: false };
  let saida: SaidaCliente;
  let meta = { modelo: "simulado", tokensEntrada: 0, tokensSaida: 0, simulado: true };
  const avisos: string[] = [];
  try {
    if (iaAtiva()) {
      const r = await gerarValidado(SaidaCliente, SISTEMA_CLIENTE, entrada, (s) => [s.mensagem_whatsapp, s.resumo], ctx);
      saida = r.dados;
      meta = { modelo: r.modelo, tokensEntrada: r.tokensEntrada, tokensSaida: r.tokensSaida, simulado: false };
      if (r.proibidas.length) avisos.push(`Trechos removidos por conter expressões não permitidas: ${r.proibidas.join(", ")}.`);
    } else {
      saida = clienteSimulado(entrada);
    }
  } catch (erro) {
    return { ok: false, erro: erro instanceof ErroIA ? erro.message : "Falha ao gerar o resumo." };
  }

  const sugeridos = saida.veiculos_sugeridos.map((id) => compativeis.find((x) => x.id === id)).filter((x): x is (typeof compativeis)[number] => !!x).slice(0, 3);
  const resultado = {
    resumo: removerTrechosProibidos(saida.resumo, ctx),
    temperatura: saida.temperatura,
    proximo_passo: saida.proximo_passo,
    prazo_dias: Math.max(0, Math.min(30, Math.round(saida.prazo_dias))),
    mensagem_whatsapp: removerTrechosProibidos(saida.mensagem_whatsapp, ctx),
    veiculos: sugeridos,
  };

  const { data: salvo, error } = await supabase
    .from("ia_geracoes")
    .insert({
      tipo: "cliente",
      cliente_id: clienteId,
      entrada,
      saida: resultado,
      avisos,
      modelo: meta.simulado ? "simulado" : meta.modelo,
      simulado: meta.simulado,
      tokens_entrada: meta.tokensEntrada || null,
      tokens_saida: meta.tokensSaida || null,
      usuario_id: usuario.id,
    })
    .select("id, criado_em")
    .single();
  if (error) return { ok: false, erro: mensagemDeErro(error) };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true, dados: { id: salvo.id, ...resultado, avisos, simulado: meta.simulado, criadoEm: salvo.criado_em } };
}

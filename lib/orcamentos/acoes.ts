"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { parseMoeda } from "@/lib/format/moeda";
import { apenasDigitos } from "@/lib/utils";
import { validarTextoConsulta } from "@/lib/ia/validador";
import { consultarPlaca } from "@/lib/consulta-veicular/acoes";
import { consultaPorId } from "@/lib/consulta-veicular/consultas";
import { simular, taxasValidas } from "./simulacao";
import type { Json } from "@/lib/supabase/database.types";

const FORMAS = ["dinheiro", "pix", "ted", "cartao_credito", "cartao_debito", "financiamento", "boleto", "cheque"] as const;
const moeda = (obrigatorio = false) =>
  z.union([z.string(), z.number()]).optional().transform((v) => (typeof v === "number" ? v : parseMoeda(v ?? ""))).refine((v) => !obrigatorio || (v !== null && v > 0), "Informe o valor.");

const esquemaPagamento = z.object({
  forma: z.enum(FORMAS),
  valor: moeda(true),
  banco_financiamento: z.string().trim().max(60).nullish().transform((v) => v || null),
  parcelas: z.coerce.number().int().min(1).max(120).nullish().catch(null),
  observacoes: z.string().trim().max(300).nullish().transform((v) => v || null),
});
const esquemaTroca = z.object({
  consulta_id: z.uuid().nullish().catch(null),
  placa: z.string().trim().toUpperCase().nullish().transform((v) => (v ? v.replace(/[^A-Z0-9]/g, "") : null)),
  marca: z.string().trim().min(1, "Informe a marca do carro de troca."),
  modelo: z.string().trim().min(1, "Informe o modelo do carro de troca."),
  versao: z.string().trim().nullish().transform((v) => v || null),
  ano_fabricacao: z.coerce.number().int().min(1950).max(2100).nullish().catch(null),
  ano_modelo: z.coerce.number().int().min(1950).max(2100).nullish().catch(null),
  cor: z.string().trim().nullish().transform((v) => v || null),
  km: z.coerce.number().int().min(0).nullish().catch(null),
  valor_fipe: moeda(),
  valor_avaliacao: moeda(true),
  selo: z.enum(["verde", "amarelo", "vermelho"]).nullish().catch(null),
  observacoes: z.string().trim().max(300).nullish().transform((v) => v || null),
});

const esquema = z.object({
  id: z.uuid().optional().or(z.literal("")).transform((v) => v || null),
  veiculo_id: z.uuid("Escolha o carro."),
  cliente_id: z.uuid().optional().or(z.literal("")).transform((v) => v || null),
  novo_cliente_nome: z.string().trim().max(120).optional(),
  novo_cliente_telefone: z.string().optional(),
  valor_final: moeda(true),
  valor_entrada: moeda(),
  validade: z.iso.date().optional().or(z.literal("")).transform((v) => v || null),
  observacoes: z.string().trim().max(2000).optional().transform((v) => v || null),
  desconto_motivo: z.string().trim().max(500).optional().transform((v) => v || null),
  simulacao_prazo: z.coerce.number().int().optional().catch(undefined),
  pagamentos: z.string().default("[]"),
  trocas: z.string().default("[]"),
});

export async function salvarOrcamento(_: EstadoAcao<{ id: string }>, fd: FormData): Promise<EstadoAcao<{ id: string }>> {
  const usuario = await exigirPermissao("orcamentos");
  const d = esquema.safeParse(Object.fromEntries(fd));
  if (!d.success) return { ok: false, erros: errosDoZod(d.error), erro: "Confira os campos." };
  const pag = z.array(esquemaPagamento).safeParse(JSON.parse(d.data.pagamentos || "[]"));
  const tro = z.array(esquemaTroca).safeParse(JSON.parse(d.data.trocas || "[]"));
  if (!pag.success) return { ok: false, erro: pag.error.issues[0]?.message ?? "Confira as formas de pagamento." };
  if (!tro.success) return { ok: false, erro: tro.error.issues[0]?.message ?? "Confira o carro de troca." };
  if (pag.data.some((p) => p.forma === "financiamento" && !p.banco_financiamento)) return { ok: false, erro: "Informe o banco do financiamento." };
  const proibidas = validarTextoConsulta(d.data.observacoes ?? "");
  if (proibidas.length) return { ok: false, erros: { observacoes: [`Não use: ${proibidas.join(", ")}.`] }, erro: `Observações com termo não permitido: ${proibidas.join(", ")}.` };

  const supabase = await criarClienteServidor();

  // Cliente novo direto do orçamento (sem duplicar telefone).
  let clienteId = d.data.cliente_id;
  if (!clienteId) {
    const nome = d.data.novo_cliente_nome ?? "";
    const tel = apenasDigitos(d.data.novo_cliente_telefone ?? "");
    if (nome.length < 2 || tel.length < 10) return { ok: false, erros: { cliente_id: ["Escolha um cliente ou informe nome e WhatsApp do novo cliente."] }, erro: "Informe o cliente." };
    const { data: existentes } = await supabase.rpc("cliente_existe", { p_telefone: tel });
    const meu = (existentes ?? []).find((c) => c.cliente_id);
    if (meu?.cliente_id) clienteId = meu.cliente_id;
    else if ((existentes ?? []).length) return { ok: false, erro: "Este telefone já é de um cliente de outro vendedor. Fale com o gerente." };
    else {
      const { data: novo, error } = await supabase.rpc("salvar_cliente", {
        p_id: null as unknown as string,
        p_cliente: { nome, whatsapp: tel, origem: "loja", vendedor_id: usuario.papel === "vendedor" ? usuario.id : null } as Json,
      });
      if (error || !novo) return { ok: false, erro: mensagemDeErro(error) };
      clienteId = novo;
    }
  }

  // Simulação (só se houver financiamento e taxa configurada).
  const { data: cfg } = await supabase.from("configuracoes").select("financiamento_taxas").single();
  const taxas = taxasValidas(cfg?.financiamento_taxas);
  const financiado = pag.data.filter((p) => p.forma === "financiamento").reduce((s, p) => s + (p.valor ?? 0), 0);
  const opcao = taxas.find((t) => t.prazo === d.data.simulacao_prazo);
  const simulacao = financiado > 0 && opcao ? simular(financiado, opcao) : null;

  const { data: id, error } = await supabase.rpc("salvar_orcamento", {
    p_id: d.data.id as string,
    p_orcamento: {
      veiculo_id: d.data.veiculo_id, cliente_id: clienteId, valor_final: d.data.valor_final, valor_entrada: d.data.valor_entrada ?? 0,
      validade: d.data.validade, observacoes: d.data.observacoes, desconto_motivo: d.data.desconto_motivo, simulacao,
    } as Json,
    p_pagamentos: pag.data as Json,
    p_trocas: tro.data as Json,
  });
  if (error || !id) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/orcamentos", "layout");
  return { ok: true, mensagem: "Orçamento salvo.", dados: { id } };
}

export async function avaliarDesconto(veiculoId: string, valor: number): Promise<"dentro" | "fora" | null> {
  await exigirPermissao("orcamentos");
  if (!/^[0-9a-f-]{36}$/i.test(veiculoId) || !(valor > 0)) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("avaliar_desconto", { p_veiculo: veiculoId, p_valor: valor });
  return data === "dentro" ? "dentro" : "fora";
}

function rpcSimples(nome: string, mensagem: string) {
  return async (_: EstadoAcao, fd: FormData): Promise<EstadoAcao> => {
    await exigirPermissao("orcamentos");
    const id = String(fd.get("id") ?? "");
    const supabase = await criarClienteServidor();
    const { error } =
      nome === "enviar_orcamento" ? await supabase.rpc("enviar_orcamento", { p_orcamento: id })
      : nome === "reabrir_orcamento" ? await supabase.rpc("reabrir_orcamento", { p_orcamento: id })
      : await supabase.rpc("responder_orcamento", { p_orcamento: id, p_aceito: fd.get("aceito") === "true", p_motivo: String(fd.get("motivo") ?? "") || undefined });
    if (error) return { ok: false, erro: mensagemDeErro(error) };
    revalidatePath("/orcamentos", "layout");
    revalidatePath("/tarefas");
    return { ok: true, mensagem };
  };
}

export async function enviarOrcamento(e: EstadoAcao, fd: FormData) {
  return rpcSimples("enviar_orcamento", "Orçamento pronto para enviar ao cliente.")(e, fd);
}
export async function reabrirOrcamento(e: EstadoAcao, fd: FormData) {
  return rpcSimples("reabrir_orcamento", "Orçamento reaberto para edição.")(e, fd);
}
export async function responderOrcamento(e: EstadoAcao, fd: FormData) {
  return rpcSimples("responder_orcamento", fd.get("aceito") === "true" ? "Orçamento aceito pelo cliente." : "Orçamento marcado como recusado.")(e, fd);
}

export async function decidirDesconto(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("orcamentos.aprovar");
  const supabase = await criarClienteServidor();
  const aprovar = fd.get("aprovar") === "true";
  const { error } = await supabase.rpc("decidir_desconto", { p_orcamento: String(fd.get("id")), p_aprovar: aprovar, p_motivo: String(fd.get("motivo") ?? "") });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/orcamentos", "layout");
  revalidatePath("/tarefas");
  return { ok: true, mensagem: aprovar ? "Desconto aprovado." : "Desconto recusado." };
}

export async function converterEmVenda(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("orcamentos");
  const supabase = await criarClienteServidor();
  const { data: venda, error } = await supabase.rpc("converter_orcamento_em_venda", { p_orcamento: String(fd.get("id")) });
  if (error || !venda) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/orcamentos", "layout");
  revalidatePath("/vendas", "layout");
  redirect(`/vendas/${venda}`);
}

/** Consulta a placa do carro de troca e devolve os dados para preencher o orçamento. */
export async function consultarTroca(placa: string) {
  const usuario = await exigirPermissao("orcamentos");
  if (!pode(usuario.papel, "placa.consultar")) return { ok: false as const, erro: "Seu perfil não faz consultas de placa." };
  const r = await consultarPlaca(placa);
  if (!r.ok) return { ok: false as const, erro: r.erro };
  const c = await consultaPorId(r.dados.id);
  if (!c) return { ok: false as const, erro: "Consulta não encontrada." };
  return {
    ok: true as const,
    dados: {
      consulta_id: c.id, placa: c.placa, status: c.status, selo: c.selo, provedor: c.provedor, simulado: c.simulado,
      marca: c.dados.marca ?? "", modelo: c.dados.modelo ?? "", versao: c.dados.versao ?? null, ano_fabricacao: c.dados.ano_fabricacao ?? null,
      ano_modelo: c.dados.ano_modelo ?? null, cor: c.dados.cor ?? null, valor_fipe: c.dados.valor_fipe ?? null,
    },
  };
}

const esquemaConfig = z.object({
  orcamento_validade_dias: z.string().trim().optional().transform((v) => (v ? Number(v) : null)).pipe(z.number().int().min(1).max(90).nullable()),
  limite_vendedor: z.string().trim().optional().transform((v) => (v ? Number(v.replace(",", ".")) : null)).pipe(z.number().min(0).max(100).nullable()),
  limite_gerente: z.string().trim().optional().transform((v) => (v ? Number(v.replace(",", ".")) : null)).pipe(z.number().min(0).max(100).nullable()),
  taxas: z.string().optional(),
});

export async function salvarConfigOrcamentos(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const d = esquemaConfig.safeParse(Object.fromEntries(fd));
  if (!d.success) return { ok: false, erros: errosDoZod(d.error), erro: "Confira os campos." };
  // Taxas: uma por linha, "prazo; taxa" (ex.: "48; 1,99").
  const linhas = (d.data.taxas ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const taxas = linhas.map((l) => {
    const [p, t] = l.split(/[;\t]| - /).map((x) => x.trim());
    return { prazo: Number(p), taxa_mensal: Number((t ?? "").replace("%", "").replace(",", ".")) };
  });
  const validas = taxasValidas(taxas);
  if (validas.length !== linhas.length) return { ok: false, erros: { taxas: ["Use uma linha por prazo no formato: 48; 1,99"] }, erro: "Confira as taxas." };
  const limites: Record<string, number> = {};
  if (d.data.limite_vendedor !== null) limites.vendedor = d.data.limite_vendedor;
  if (d.data.limite_gerente !== null) limites.gerente = d.data.limite_gerente;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("configuracoes")
    .update({ orcamento_validade_dias: d.data.orcamento_validade_dias, desconto_limites: limites, financiamento_taxas: validas })
    .eq("id", true);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/configuracoes/orcamentos");
  revalidatePath("/orcamentos", "layout");
  return { ok: true, mensagem: "Configuração de orçamentos salva." };
}

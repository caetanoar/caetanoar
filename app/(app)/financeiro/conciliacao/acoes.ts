"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { lerOFX } from "@/lib/extrato/ofx";
import { lerCSV, detectarLayout, type LayoutCSV } from "@/lib/extrato/csv";
import type { ExtratoLido, TransacaoExtrato } from "@/lib/extrato/tipos";
import { agregadorBancario } from "@/lib/integracoes/bancos";
import { hojeISO, somarDias } from "@/lib/format/data";

const CAMINHO = "/financeiro/conciliacao";

function hashes(transacoes: TransacaoExtrato[]) {
  const vistos = new Map<string, number>();
  return transacoes.map((t) => {
    if (t.fitid) return `fitid:${t.fitid}`;
    const base = `${t.data}|${t.valor.toFixed(2)}|${t.descricao.trim().toUpperCase()}|${t.documento ?? ""}`;
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);
    return createHash("sha256").update(`${base}|${n}`).digest("hex");
  });
}

async function gravarExtrato(contaId: string, origem: "ofx" | "csv" | "open_finance", extrato: ExtratoLido, nomeArquivo: string | null) {
  const supabase = await criarClienteServidor();
  if (extrato.transacoes.length === 0) return { ok: false as const, erro: "Nenhuma transação encontrada no arquivo." };
  const { data: imp, error } = await supabase
    .from("extratos_importacoes")
    .insert({ conta_id: contaId, origem, nome_arquivo: nomeArquivo, periodo_inicio: extrato.inicio, periodo_fim: extrato.fim, qtd_transacoes: extrato.transacoes.length, saldo_final: extrato.saldoFinal })
    .select("id")
    .single();
  if (error || !imp) return { ok: false as const, erro: mensagemDeErro(error) };
  const hs = hashes(extrato.transacoes);
  const { data: inseridas, error: e2 } = await supabase
    .from("extratos_transacoes")
    .upsert(
      extrato.transacoes.map((t, i) => ({ importacao_id: imp.id, conta_id: contaId, data: t.data, valor: t.valor, descricao: t.descricao, documento: t.documento, fitid: t.fitid, hash: hs[i] })),
      { onConflict: "conta_id,hash", ignoreDuplicates: true },
    )
    .select("id");
  if (e2) return { ok: false as const, erro: mensagemDeErro(e2) };
  const novas = inseridas?.length ?? 0;
  await supabase.from("extratos_importacoes").update({ qtd_novas: novas }).eq("id", imp.id);
  const { data: auto } = await supabase.rpc("conciliar_automatico", { p_conta: contaId });
  return { ok: true as const, novas, repetidas: extrato.transacoes.length - novas, auto: auto ?? 0 };
}

const esquemaLayout = z.object({
  separador: z.string().min(1).max(2),
  colunaData: z.string().min(1),
  colunaDescricao: z.string().min(1),
  colunaValor: z.string().nullable().optional(),
  colunaDebito: z.string().nullable().optional(),
  colunaCredito: z.string().nullable().optional(),
  formatoData: z.enum(["dd/mm/aaaa", "aaaa-mm-dd", "dd/mm/aa"]),
  decimal: z.enum([",", "."]),
});

export async function importarExtrato(
  contaId: string,
  nomeArquivo: string,
  conteudo: string,
  layout?: LayoutCSV,
): Promise<EstadoAcao<{ novas: number; repetidas: number; auto: number; cabecalho?: string[] }>> {
  await exigirPermissao("financeiro");
  if (!z.uuid().safeParse(contaId).success) return { ok: false, erro: "Escolha a conta do extrato." };
  if (!conteudo || conteudo.length > 5_000_000) return { ok: false, erro: "Arquivo vazio ou grande demais (máx. 5 MB)." };
  const ehOFX = /<OFX>/i.test(conteudo) || /\.ofx$/i.test(nomeArquivo);
  let extrato: ExtratoLido;
  try {
    if (ehOFX) extrato = lerOFX(conteudo);
    else {
      const l = layout ? esquemaLayout.parse(layout) : undefined;
      if (!l && !detectarLayout(conteudo)) {
        const primeira = conteudo.split(/\r?\n/).find((x) => x.includes(";") || x.includes(",")) ?? "";
        const sep = primeira.includes(";") ? ";" : ",";
        return { ok: false, erro: "Não reconheci as colunas. Indique quais são data, descrição e valor.", dados: { novas: 0, repetidas: 0, auto: 0, cabecalho: primeira.split(sep).map((c) => c.trim()) } };
      }
      extrato = lerCSV(conteudo, l);
    }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível ler o arquivo." };
  }
  const r = await gravarExtrato(contaId, ehOFX ? "ofx" : "csv", extrato, nomeArquivo);
  if (!r.ok) return { ok: false, erro: r.erro };
  revalidatePath(CAMINHO);
  revalidatePath("/financeiro", "layout");
  return {
    ok: true,
    mensagem: `${r.novas} transação(ões) nova(s)${r.repetidas ? `, ${r.repetidas} já importada(s)` : ""}${r.auto ? `; ${r.auto} conciliada(s) automaticamente` : ""}.`,
    dados: { novas: r.novas, repetidas: r.repetidas, auto: r.auto },
  };
}

async function rpcSimples(nome: "conciliar_transacao" | "desfazer_conciliacao", args: Record<string, string>): Promise<EstadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc(nome, args as never);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  revalidatePath("/financeiro", "layout");
  return { ok: true };
}

export async function conciliar(transacaoId: string, lancamentoId: string): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const r = await rpcSimples("conciliar_transacao", { p_transacao: transacaoId, p_lancamento: lancamentoId });
  return r.ok ? { ok: true, mensagem: "Conciliado." } : r;
}

export async function desfazer(transacaoId: string): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  return rpcSimples("desfazer_conciliacao", { p_transacao: transacaoId });
}

export async function lancarTransacao(transacaoId: string, categoriaId: string, descricao: string): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  if (!z.uuid().safeParse(categoriaId).success) return { ok: false, erro: "Escolha a categoria." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("lancar_transacao", { p_transacao: transacaoId, p_categoria: categoriaId, p_descricao: descricao });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  revalidatePath("/financeiro", "layout");
  return { ok: true, mensagem: "Lançamento criado e conciliado." };
}

export async function ignorarTransacao(transacaoId: string): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("extratos_transacoes").update({ status: "ignorada" }).eq("id", transacaoId).eq("status", "pendente");
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: "Transação ignorada." };
}

export async function conciliarAutomatico(contaId: string): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("conciliar_automatico", { p_conta: contaId });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  revalidatePath("/financeiro", "layout");
  return { ok: true, mensagem: data ? `${data} transação(ões) conciliada(s).` : "Nenhuma correspondência exata encontrada." };
}

// ---------------------------------------------------------------------------
// Open Finance (somente quando configurado por variável de ambiente)
// ---------------------------------------------------------------------------
export async function registrarConexao(itemId: string, contaExternaId: string, contaId: string, nome: string): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("open_finance_conexoes").insert({ provedor: "pluggy", item_id: itemId, conta_externa_id: contaExternaId, conta_id: contaId, nome });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: "Conexão registrada." };
}

export async function sincronizarConexao(conexaoId: string): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const agregador = agregadorBancario();
  if (!agregador.configurado) return { ok: false, erro: "Open Finance não configurado." };
  const supabase = await criarClienteServidor();
  const { data: c } = await supabase.from("open_finance_conexoes").select("*").eq("id", conexaoId).single();
  if (!c?.conta_id || !c.conta_externa_id) return { ok: false, erro: "Conexão sem conta vinculada." };
  try {
    const de = c.ultimo_sync ? somarDias(c.ultimo_sync.slice(0, 10), -3) : somarDias(hojeISO(), -60);
    const transacoes = await agregador.transacoes(c.conta_externa_id, de, hojeISO());
    const datas = transacoes.map((t) => t.data).sort();
    const r = await gravarExtrato(c.conta_id, "open_finance", { transacoes, inicio: datas[0] ?? null, fim: datas.at(-1) ?? null, saldoFinal: null, conta: null }, `Open Finance ${c.nome ?? ""}`);
    await supabase.from("open_finance_conexoes").update({ ultimo_sync: new Date().toISOString() }).eq("id", conexaoId);
    revalidatePath(CAMINHO);
    if (!r.ok) return { ok: false, erro: r.erro };
    return { ok: true, mensagem: `${r.novas} transação(ões) nova(s) sincronizada(s).` };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha na sincronização." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { esquemaVenda, esquemaPagamento, esquemaTroca } from "@/lib/vendas/esquemas";
import { parseMoeda } from "@/lib/format/moeda";
import type { Json } from "@/lib/supabase/database.types";

function revalidar(id?: string) {
  revalidatePath("/vendas");
  revalidatePath("/estoque", "layout");
  revalidatePath("/clientes", "layout");
  revalidatePath("/financeiro", "layout");
  if (id) revalidatePath(`/vendas/${id}`);
}

function semNulos<T extends Record<string, unknown>>(o: T) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));
}

export async function salvarVenda(_: EstadoAcao<{ id: string }>, fd: FormData): Promise<EstadoAcao<{ id: string }>> {
  const usuario = await exigirPermissao("vendas");
  const bruto = Object.fromEntries(fd) as Record<string, string>;
  const id = bruto.id || null;
  const venda = esquemaVenda.safeParse(bruto);
  let pagamentosBrutos: unknown[] = [];
  let trocasBrutas: unknown[] = [];
  try {
    pagamentosBrutos = JSON.parse(bruto.pagamentos_json || "[]");
    trocasBrutas = JSON.parse(bruto.trocas_json || "[]");
  } catch {
    return { ok: false, erro: "Dados de pagamento inválidos." };
  }
  const pagamentos = z.array(esquemaPagamento).safeParse(pagamentosBrutos);
  const trocas = z.array(esquemaTroca).max(3).safeParse(trocasBrutas);
  const erros: Record<string, string[]> = {};
  if (!venda.success) Object.assign(erros, errosDoZod(venda.error));
  if (!pagamentos.success) erros.pagamentos = [pagamentos.error.issues[0]?.message ?? "Confira os pagamentos."];
  if (!trocas.success) erros.trocas = [trocas.error.issues[0]?.message ?? "Confira o carro da troca."];
  if (!venda.success || !pagamentos.success || !trocas.success) return { ok: false, erros, erro: "Confira os campos destacados." };

  const total = pagamentos.data.reduce((s, p) => s + (p.valor ?? 0), 0) + trocas.data.reduce((s, t) => s + (t.valor_avaliacao ?? 0), 0);
  if (Math.abs(total - (venda.data.valor_venda ?? 0)) > 0.009) {
    return { ok: false, erros: { pagamentos: ["A soma dos pagamentos e da troca precisa fechar o valor da venda."] }, erro: "Pagamentos não fecham o valor da venda." };
  }

  const dadosVenda: Record<string, unknown> = { ...venda.data };
  // Entrada não informada = tudo que não é financiado (inclui a troca).
  if (!bruto.valor_entrada || !venda.data.valor_entrada) {
    dadosVenda.valor_entrada =
      pagamentos.data.filter((p) => p.forma !== "financiamento").reduce((s, p) => s + (p.valor ?? 0), 0) +
      trocas.data.reduce((s, t) => s + (t.valor_avaliacao ?? 0), 0);
  }
  if (usuario.papel === "vendedor") {
    dadosVenda.vendedor_id = usuario.id;
    delete dadosVenda.recebimento_consignado;
    // Vendedor não define recebimento nem marca valores como recebidos.
    for (const p of pagamentos.data) {
      p.recebido = false;
      p.conta_id = null;
    }
  } else if (!dadosVenda.vendedor_id) {
    dadosVenda.vendedor_id = usuario.id;
  }
  if (!id) dadosVenda.status = "aguardando_aprovacao";

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("salvar_venda", {
    p_id: id as string,
    p_venda: semNulos(dadosVenda) as Json,
    p_pagamentos: pagamentos.data.map((p) => semNulos(p)) as Json,
    p_trocas: trocas.data.map((t) => semNulos(t)) as Json,
  });
  if (error || !data) {
    if ((error as { code?: string } | null)?.code === "23505") return { ok: false, erro: "Já existe uma venda em andamento para este carro." };
    return { ok: false, erro: mensagemDeErro(error) };
  }
  revalidar(data);
  return {
    ok: true,
    mensagem: usuario.papel === "vendedor" ? "Venda enviada para aprovação do gerente." : "Venda registrada. Revise e feche.",
    dados: { id: data },
  };
}

export async function fecharVenda(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("vendas.fechar");
  const id = String(fd.get("id"));
  const manuais: Record<string, number> = {};
  for (const k of ["loja", "vendedor", "parceiro"]) {
    const v = fd.get(`manual_${k}`);
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseMoeda(v);
      if (n === null || n < 0) return { ok: false, erro: "Valor de comissão inválido." };
      manuais[k] = n;
    }
  }
  const supabase = await criarClienteServidor();
  const recebimento = String(fd.get("recebimento_consignado") ?? "");
  if (recebimento === "loja_repassa" || recebimento === "direto_dono") {
    const { error } = await supabase.from("vendas").update({ recebimento_consignado: recebimento }).eq("id", id);
    if (error) return { ok: false, erro: mensagemDeErro(error) };
  }
  const { error } = await supabase.rpc("fechar_venda", { p_venda: id, p_manuais: manuais as Json });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar(id);
  return { ok: true, mensagem: "Venda fechada: comissões, garantia e lançamentos gerados." };
}

export async function cancelarVenda(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("vendas.fechar");
  const id = String(fd.get("id"));
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("cancelar_venda", { p_venda: id, p_motivo: String(fd.get("motivo") ?? "") });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar(id);
  return { ok: true, mensagem: "Venda cancelada." };
}

export async function excluirVenda(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("vendas");
  const supabase = await criarClienteServidor();
  const { error, count } = await supabase.from("vendas").delete({ count: "exact" }).eq("id", String(fd.get("id")));
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  if (!count) return { ok: false, erro: "Só vendas ainda não fechadas podem ser excluídas." };
  revalidar();
  return { ok: true, mensagem: "Venda excluída e carro liberado." };
}

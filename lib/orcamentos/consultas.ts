import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { taxasValidas } from "./simulacao";
import type { Alerta } from "./rotulos";

export async function configOrcamento() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("configuracoes")
    .select("orcamento_validade_dias, desconto_limites, financiamento_taxas, whatsapp_numero, nome_loja, cidade, uf, telefones_assinatura, assinatura")
    .single();
  return {
    validadeDias: data?.orcamento_validade_dias ?? null,
    limites: (data?.desconto_limites ?? {}) as Record<string, number>,
    taxas: taxasValidas(data?.financiamento_taxas),
    whatsapp: data?.whatsapp_numero ?? "5537991193815",
    loja: { nome: data?.nome_loja ?? "Caetano Auto", cidade: data?.cidade ?? "Divinópolis", uf: data?.uf ?? "MG", telefones: data?.telefones_assinatura ?? "", assinatura: data?.assinatura ?? "" },
  };
}

export async function listarOrcamentos(f: { status?: string; desconto?: string }) {
  const supabase = await criarClienteServidor();
  let q = supabase.from("v_orcamentos").select("*").order("criado_em", { ascending: false }).limit(200);
  if (f.desconto === "aguardando") q = q.eq("desconto_status", "aguardando_aprovacao");
  const { data } = await q;
  const lista = data ?? [];
  return f.status ? lista.filter((o) => o.status_efetivo === f.status) : lista;
}

export type Pagamento = { forma: string; valor: number; banco_financiamento: string | null; parcelas: number | null; observacoes: string | null };
export type Troca = {
  consulta_id: string | null; placa: string | null; marca: string; modelo: string; versao: string | null; ano_fabricacao: number | null; ano_modelo: number | null;
  cor: string | null; km: number | null; valor_fipe: number | null; valor_avaliacao: number; selo: "verde" | "amarelo" | "vermelho" | null; observacoes: string | null;
};

export async function carregarOrcamento(id: string) {
  const supabase = await criarClienteServidor();
  const [{ data: o }, { data: pagamentos }, { data: trocas }] = await Promise.all([
    supabase.from("v_orcamentos").select("*").eq("id", id).maybeSingle(),
    supabase.from("orcamentos_pagamentos").select("forma, valor, banco_financiamento, parcelas, observacoes").eq("orcamento_id", id).order("criado_em"),
    supabase.from("orcamentos_trocas").select("consulta_id, placa, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, km, valor_fipe, valor_avaliacao, selo, observacoes").eq("orcamento_id", id).order("criado_em"),
  ]);
  if (!o) return null;
  return {
    o: { ...o, alertas: (o.alertas ?? []) as unknown as Alerta[] },
    pagamentos: (pagamentos ?? []).map((p) => ({ ...p, valor: Number(p.valor) })) as Pagamento[],
    trocas: (trocas ?? []).map((t) => ({ ...t, valor_avaliacao: Number(t.valor_avaliacao), valor_fipe: t.valor_fipe === null ? null : Number(t.valor_fipe) })) as Troca[],
  };
}

/** Carros que podem entrar num orçamento (ainda à venda). */
export async function carrosParaOrcamento() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("v_veiculos")
    .select("id, marca, modelo, versao, ano_modelo, placa, preco_anunciado, preco_negociavel, status")
    .in("status", ["disponivel", "reservado", "em_preparacao"])
    .order("marca");
  return data ?? [];
}

export async function clientesParaOrcamento() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("clientes").select("id, nome, whatsapp, telefone").is("anonimizado_em", null).order("nome").limit(500);
  return data ?? [];
}

export async function alertasDoCarro(veiculoId: string): Promise<Alerta[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("alertas_veiculo", { p_veiculo: veiculoId });
  return (data ?? []) as unknown as Alerta[];
}

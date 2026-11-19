"use server";

import { revalidatePath } from "next/cache";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { esquemaLancamento, esquemaConta, esquemaBaixa, esquemaTransferencia, esquemaCategoria } from "@/lib/financeiro/esquemas";
import type { Json } from "@/lib/supabase/database.types";

function revalidar() {
  revalidatePath("/financeiro", "layout");
}

export async function criarLancamento(_: EstadoAcao<{ id: string }>, fd: FormData): Promise<EstadoAcao<{ id: string }>> {
  await exigirPermissao("financeiro");
  const dados = esquemaLancamento.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos destacados." };
  const { pago, parcelas, ...resto } = dados.data;
  const registro: Record<string, unknown> = {
    ...resto,
    data_competencia: resto.data_competencia ?? resto.data_vencimento,
    status: pago ? "pago" : "pendente",
    data_pagamento: pago ? resto.data_pagamento ?? resto.data_vencimento : null,
  };
  for (const k of Object.keys(registro)) if (registro[k] === null) delete registro[k];
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("criar_lancamento", { p_dados: registro as Json, p_parcelas: parcelas });
  if (error || !data) return { ok: false, erro: mensagemDeErro(error) };
  revalidar();
  return { ok: true, mensagem: parcelas > 1 ? `${parcelas} parcelas lançadas.` : "Lançamento registrado.", dados: { id: data } };
}

export async function baixarLancamento(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const dados = esquemaBaixa.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os dados da baixa." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("baixar_lancamento", {
    p_id: dados.data.id,
    p_data: dados.data.data_pagamento!,
    p_conta: dados.data.conta_id,
    p_forma: dados.data.forma_pagamento ?? undefined,
    p_valor: dados.data.valor ?? undefined,
  });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar();
  return { ok: true, mensagem: "Pagamento registrado." };
}

export async function estornarBaixa(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("estornar_baixa", { p_id: String(fd.get("id")) });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar();
  return { ok: true, mensagem: "Baixa estornada: o lançamento voltou a pendente." };
}

export async function cancelarLancamento(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const { error, count } = await supabase
    .from("lancamentos")
    .update({ status: "cancelado" }, { count: "exact" })
    .eq("id", String(fd.get("id")))
    .eq("status", "pendente");
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  if (!count) return { ok: false, erro: "Só lançamentos pendentes podem ser cancelados (estorne a baixa antes)." };
  revalidar();
  return { ok: true, mensagem: "Lançamento cancelado." };
}

export async function excluirLancamento(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const id = String(fd.get("id"));
  const { data: l } = await supabase.from("lancamentos").select("status, custo_veiculo_id, venda_id, transferencia_id").eq("id", id).maybeSingle();
  if (!l) return { ok: false, erro: "Lançamento não encontrado." };
  if (l.status === "pago") return { ok: false, erro: "Estorne a baixa antes de excluir." };
  if (l.custo_veiculo_id) return { ok: false, erro: "Este lançamento vem de um custo de preparação: exclua o custo na tela do carro." };
  if (l.venda_id) return { ok: false, erro: "Lançamento de venda: cancele a venda para desfazer." };
  if (l.transferencia_id) return { ok: false, erro: "Exclua a transferência para desfazer." };
  const { error } = await supabase.from("lancamentos").delete().eq("id", id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar();
  return { ok: true, mensagem: "Lançamento excluído." };
}

export async function salvarConta(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const id = String(fd.get("id") ?? "") || null;
  const dados = esquemaConta.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const registro = { ...dados.data, data_saldo_inicial: dados.data.data_saldo_inicial ?? undefined };
  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("contas_financeiras").update(registro).eq("id", id)
    : await supabase.from("contas_financeiras").insert(registro);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar();
  return { ok: true, mensagem: id ? "Conta atualizada." : "Conta criada." };
}

export async function transferir(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const dados = esquemaTransferencia.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("transferir", {
    p_origem: dados.data.origem,
    p_destino: dados.data.destino,
    p_valor: dados.data.valor as number,
    p_data: dados.data.data ?? undefined,
    p_descricao: dados.data.descricao ?? undefined,
  });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar();
  return { ok: true, mensagem: "Transferência registrada." };
}

export async function excluirTransferencia(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const id = String(fd.get("id"));
  const { data: conciliados } = await supabase.from("lancamentos").select("id").eq("transferencia_id", id).eq("conciliado", true);
  if (conciliados?.length) return { ok: false, erro: "A transferência já foi conciliada com o extrato." };
  const { error } = await supabase.from("transferencias").delete().eq("id", id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar();
  return { ok: true, mensagem: "Transferência excluída." };
}

export async function salvarCategoria(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("financeiro");
  const id = String(fd.get("id") ?? "") || null;
  const dados = esquemaCategoria.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("categorias_financeiras").update(dados.data).eq("id", id)
    : await supabase.from("categorias_financeiras").insert(dados.data);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar();
  return { ok: true, mensagem: "Categoria salva." };
}

"use server";

import { revalidatePath } from "next/cache";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mensagemDeErro, type EstadoAcao } from "@/lib/acoes";

const uuid = (v: FormDataEntryValue | null) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);

function revalidar(id: string) {
  revalidatePath(`/vendas/${id}`);
  revalidatePath("/vendas");
}

/** Vendedor (ou gestão) confirma que informou o cliente de todos os alertas. */
export async function registrarCiencia(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("vendas");
  const id = uuid(fd.get("id"));
  if (!id) return { ok: false, erro: "Venda inválida." };
  if (fd.get("confirmo") !== "on") return { ok: false, erros: { confirmo: ["Confirme que informou o cliente."] }, erro: "Confirme que informou o cliente." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_ciencia", { p_venda: id });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar(id);
  return { ok: true, mensagem: "Ciência registrada. Gere o Termo de Ciência para o cliente assinar." };
}

/** Só o dono: libera a venda com impeditivo ou sem consulta válida, com justificativa. */
export async function liberarBloqueio(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("vendas");
  const id = uuid(fd.get("id"));
  const justificativa = String(fd.get("justificativa") ?? "").trim();
  if (!id) return { ok: false, erro: "Venda inválida." };
  if (justificativa.length < 15) return { ok: false, erros: { justificativa: ["Escreva a justificativa (pelo menos 15 caracteres)."] }, erro: "Justificativa obrigatória." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("liberar_bloqueio", { p_venda: id, p_justificativa: justificativa });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar(id);
  return { ok: true, mensagem: "Venda liberada. O cliente ainda precisa ser informado dos alertas." };
}

/** Rascunho → aguardando aprovação do gerente (o banco confere a verificação). */
export async function enviarParaAprovacao(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("vendas");
  const id = uuid(fd.get("id"));
  if (!id) return { ok: false, erro: "Venda inválida." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("enviar_venda_para_aprovacao", { p_venda: id });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar(id);
  return { ok: true, mensagem: "Venda enviada para aprovação do gerente." };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { ESCOPOS, gerarChave, gerarSegredoWebhook } from "@/lib/api/chaves";
import { EVENTOS_WEBHOOK } from "@/lib/webhooks/eventos";
import { urlSegura } from "@/lib/webhooks/url-segura";
import { dispararWebhooks } from "@/lib/webhooks/entregar";

const CAMINHO = "/configuracoes/integracoes";

export async function criarChaveApi(_: EstadoAcao<{ chave: string }>, fd: FormData): Promise<EstadoAcao<{ chave: string }>> {
  await exigirPermissao("configuracoes");
  const dados = z
    .object({
      nome: z.string().trim().min(2, "Informe um nome (ex.: Site da loja)."),
      escopos: z.array(z.enum(Object.keys(ESCOPOS) as [keyof typeof ESCOPOS, ...(keyof typeof ESCOPOS)[]])).min(1, "Escolha ao menos um escopo."),
      expira_em: z.iso.date().optional(),
    })
    .safeParse({ nome: fd.get("nome"), escopos: fd.getAll("escopos"), expira_em: fd.get("expira_em") || undefined });
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };

  const { chave, prefixo, hash } = gerarChave();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("api_chaves").insert({ nome: dados.data.nome, prefixo, hash, escopos: dados.data.escopos, expira_em: dados.data.expira_em ?? null });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: "Chave criada. Copie agora: ela não será mostrada de novo.", dados: { chave } };
}

export async function revogarChaveApi(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("api_chaves").update({ revogada_em: new Date().toISOString() }).eq("id", String(fd.get("id")));
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: "Chave revogada." };
}

export async function criarWebhook(_: EstadoAcao<{ segredo: string }>, fd: FormData): Promise<EstadoAcao<{ segredo: string }>> {
  await exigirPermissao("configuracoes");
  const dados = z
    .object({
      nome: z.string().trim().min(2, "Informe um nome."),
      url: z.url("URL inválida.").max(500),
      eventos: z.array(z.enum(Object.keys(EVENTOS_WEBHOOK) as [string, ...string[]])).min(1, "Escolha ao menos um evento."),
    })
    .safeParse({ nome: fd.get("nome"), url: String(fd.get("url") ?? "").trim(), eventos: fd.getAll("eventos") });
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const bloqueio = await urlSegura(dados.data.url);
  if (bloqueio) return { ok: false, erros: { url: [bloqueio] }, erro: bloqueio };

  const segredo = gerarSegredoWebhook();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("webhooks").insert({ ...dados.data, segredo });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: "Webhook criado. Copie o segredo de assinatura agora.", dados: { segredo } };
}

export async function alternarWebhook(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const ativo = fd.get("ativo") === "true";
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("webhooks").update({ ativo, ...(ativo ? { falhas_consecutivas: 0 } : {}) }).eq("id", String(fd.get("id")));
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: ativo ? "Webhook ativado." : "Webhook pausado." };
}

export async function excluirWebhook(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("webhooks").delete().eq("id", String(fd.get("id")));
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: "Webhook excluído." };
}

export async function testarWebhook(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("testar_webhook", { p_webhook: String(fd.get("id")) });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  dispararWebhooks();
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: "Teste enviado. Atualize a página em alguns segundos para ver o resultado." };
}

export async function reenviarEntrega(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("reenviar_entrega", { p_entrega: Number(fd.get("id")) });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  dispararWebhooks();
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: "Reenvio agendado." };
}

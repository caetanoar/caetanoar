"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";

const texto = z.string().trim().max(2000).optional().transform((v) => v || null);

const esquemaTarefa = z.object({
  titulo: z.string().trim().min(3, "Descreva a tarefa (mínimo 3 letras).").max(200),
  descricao: texto,
  prazo: z.iso.date().optional().or(z.literal("")).transform((v) => v || null),
  responsavel_id: z.uuid().optional().or(z.literal("")).transform((v) => v || null),
  entidade: z.enum(["veiculo", "venda", "cliente", "garantia", "orcamento"]).optional().or(z.literal("")).transform((v) => v || null),
  entidade_id: z.uuid().optional().or(z.literal("")).transform((v) => v || null),
  voltar: z.string().optional(),
});

function revalidar(voltar?: string) {
  revalidatePath("/tarefas");
  if (voltar?.startsWith("/")) revalidatePath(voltar);
}

export async function criarTarefa(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const usuario = await exigirPermissao("tarefas");
  const dados = esquemaTarefa.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const { voltar, ...t } = dados.data;
  // Quem não é da gestão só cria tarefa para si (a RLS confere de novo).
  const responsavel = pode(usuario.papel, "estoque.gerenciar") ? (t.responsavel_id ?? usuario.id) : usuario.id;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("tarefas").insert({ ...t, responsavel_id: responsavel });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar(voltar);
  return { ok: true, mensagem: "Tarefa criada." };
}

export async function mudarStatusTarefa(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("tarefas");
  const dados = z
    .object({ id: z.uuid(), status: z.enum(["pendente", "em_andamento", "concluida", "cancelada"]), voltar: z.string().optional() })
    .safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erro: "Dados inválidos." };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("tarefas").update({ status: dados.data.status }).eq("id", dados.data.id).select("id");
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  if (!data?.length) return { ok: false, erro: "Tarefa não encontrada ou sem permissão." };
  revalidar(dados.data.voltar);
  return { ok: true, mensagem: dados.data.status === "concluida" ? "Tarefa concluída." : "Tarefa atualizada." };
}

export async function marcarItemChecklist(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("tarefas");
  const dados = z
    .object({
      id: z.uuid(),
      feito: z.enum(["true", "false"]).transform((v) => v === "true"),
      observacao: texto,
      voltar: z.string().optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erro: "Dados inválidos." };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("checklist_itens")
    .update({ feito: dados.data.feito, ...(dados.data.observacao !== null ? { observacao: dados.data.observacao } : {}) })
    .eq("id", dados.data.id)
    .select("id");
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  if (!data?.length) return { ok: false, erro: "Item não encontrado ou sem permissão." };
  if (dados.data.voltar?.startsWith("/")) revalidatePath(dados.data.voltar);
  return { ok: true };
}

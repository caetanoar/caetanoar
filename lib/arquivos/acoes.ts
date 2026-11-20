"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mensagemDeErro, type EstadoAcao } from "@/lib/acoes";

const esquema = z.object({
  bucket: z.enum(["documentos", "fiscal", "extratos"]),
  path: z.string().min(3).max(300),
  nome: z.string().min(1).max(200),
  mime: z.string().max(100).nullable().optional(),
  tamanho: z.number().int().nonnegative().nullable().optional(),
  entidade: z.enum(["venda", "garantia", "cliente", "lancamento", "nota", "extrato"]),
  entidade_id: z.uuid(),
  categoria: z.enum(["contrato", "documento", "comprovante", "nf_xml", "nf_pdf", "outro", "termo_ciencia", "baixa_gravame", "atpv", "vistoria", "comprovante_debitos"]),
  sigiloso: z.boolean().default(false),
});

/** Registra no índice um arquivo já enviado ao Storage (a RLS confere a permissão). */
export async function registrarArquivo(dados: z.input<typeof esquema>, revalidar: string): Promise<EstadoAcao<{ id: string }>> {
  await exigirUsuario();
  const a = esquema.safeParse(dados);
  if (!a.success) return { ok: false, erro: "Arquivo inválido." };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("arquivos").insert(a.data).select("id").single();
  if (error || !data) {
    await supabase.storage.from(a.data.bucket).remove([a.data.path]);
    return { ok: false, erro: mensagemDeErro(error) };
  }
  if (revalidar.startsWith("/")) revalidatePath(revalidar);
  return { ok: true, mensagem: "Arquivo anexado.", dados: { id: data.id } };
}

export async function removerArquivo(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirUsuario();
  const id = String(fd.get("id"));
  const revalidar = String(fd.get("revalidar") ?? "");
  const supabase = await criarClienteServidor();
  const { data: arq } = await supabase.from("arquivos").select("bucket, path").eq("id", id).maybeSingle();
  const { error, count } = await supabase.from("arquivos").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  if (!count) return { ok: false, erro: "Sem permissão para remover." };
  if (arq) await supabase.storage.from(arq.bucket).remove([arq.path]);
  if (revalidar.startsWith("/")) revalidatePath(revalidar);
  return { ok: true, mensagem: "Arquivo removido." };
}

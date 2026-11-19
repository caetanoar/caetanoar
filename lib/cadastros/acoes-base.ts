import "server-only";
import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";

type TabelaCadastro = "fornecedores" | "consignantes" | "parceiros";

/** Cria ou atualiza (se vier `id`) um cadastro simples, validando com zod. */
export async function salvarCadastro(
  tabela: TabelaCadastro,
  esquema: ZodType<Record<string, unknown>>,
  fd: FormData,
  rotulo: string,
): Promise<EstadoAcao<{ id: string }>> {
  const bruto = Object.fromEntries(fd) as Record<string, string>;
  const id = bruto.id || null;
  const dados = esquema.safeParse(bruto);
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos destacados." };
  const supabase = await criarClienteServidor();
  // O tipo exato depende da tabela; a validação já foi feita pelo zod e a RLS protege no banco.
  const tabelaDb = supabase.from(tabela) as unknown as {
    insert: (v: unknown) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } };
    update: (v: unknown) => { eq: (c: string, v: string) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } } };
  };
  const { data, error } = id
    ? await tabelaDb.update(dados.data).eq("id", id).select("id").single()
    : await tabelaDb.insert(dados.data).select("id").single();
  if (error || !data) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(`/${tabela}`);
  return { ok: true, mensagem: `${rotulo} ${id ? "atualizado" : "cadastrado"}.`, dados: { id: data.id } };
}

export async function excluirCadastro(tabela: TabelaCadastro, fd: FormData, rotulo: string): Promise<EstadoAcao> {
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, erro: "Registro inválido." };
  const supabase = await criarClienteServidor();
  const { error, count } = await supabase.from(tabela).delete({ count: "exact" }).eq("id", id);
  if (error) {
    if ((error as { code?: string }).code === "23503") {
      return { ok: false, erro: `Este ${rotulo.toLowerCase()} tem histórico vinculado. Em vez de excluir, marque como inativo.` };
    }
    return { ok: false, erro: mensagemDeErro(error) };
  }
  if (!count) return { ok: false, erro: "Você não tem permissão para excluir este registro." };
  revalidatePath(`/${tabela}`);
  return { ok: true, mensagem: `${rotulo} excluído.` };
}

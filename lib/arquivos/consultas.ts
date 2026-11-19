import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Entidade = Database["public"]["Enums"]["entidade_arquivo"];

/** Anexos de uma entidade com links assinados (1 hora). */
export async function carregarAnexos(entidade: Entidade, id: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("arquivos")
    .select("id, nome, categoria, bucket, path, criado_em")
    .eq("entidade", entidade)
    .eq("entidade_id", id)
    .order("criado_em", { ascending: false });
  return Promise.all(
    (data ?? []).map(async (a) => {
      const { data: s } = await supabase.storage.from(a.bucket).createSignedUrl(a.path, 3600);
      return { id: a.id, nome: a.nome, categoria: a.categoria, criado_em: a.criado_em, url: s?.signedUrl ?? null };
    }),
  );
}

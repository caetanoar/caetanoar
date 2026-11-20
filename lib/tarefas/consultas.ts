import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";

export type TarefaLista = {
  id: string;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  status: "pendente" | "em_andamento" | "concluida" | "cancelada";
  origem: string;
  entidade: "veiculo" | "venda" | "cliente" | "garantia" | "orcamento" | null;
  entidade_id: string | null;
  responsavel_id: string | null;
  responsavel: string | null;
  concluida_em: string | null;
};

/** Tarefas visíveis ao usuário (a RLS limita: gestão vê todas, os demais as suas). */
export async function listarTarefas(f: { abertas?: boolean; responsavel?: string | null; entidade?: string; entidadeId?: string; limite?: number }) {
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("tarefas")
    .select("id, titulo, descricao, prazo, status, origem, entidade, entidade_id, responsavel_id, concluida_em, usuarios!tarefas_responsavel_id_fkey(nome)")
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("criado_em", { ascending: false })
    .limit(f.limite ?? 200);
  if (f.abertas !== false) q = q.in("status", ["pendente", "em_andamento"]);
  else q = q.in("status", ["concluida", "cancelada"]);
  if (f.responsavel) q = q.eq("responsavel_id", f.responsavel);
  if (f.entidade && f.entidadeId) q = q.eq("entidade", f.entidade as "veiculo").eq("entidade_id", f.entidadeId);
  const { data } = await q;
  return (data ?? []).map((t) => ({ ...t, responsavel: (t.usuarios as { nome: string } | null)?.nome ?? null })) as TarefaLista[];
}

export async function listarUsuariosAtivos() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("usuarios").select("id, nome, papel").eq("ativo", true).order("nome");
  return data ?? [];
}

export async function contarTarefasAtrasadas(usuarioId: string, hoje: string) {
  const supabase = await criarClienteServidor();
  const { count } = await supabase
    .from("tarefas")
    .select("id", { count: "exact", head: true })
    .eq("responsavel_id", usuarioId)
    .in("status", ["pendente", "em_andamento"])
    .lte("prazo", hoje);
  return count ?? 0;
}

export async function itensChecklist(f: { tipo: "preparacao" | "documentacao"; veiculoId?: string; vendaId?: string }) {
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("checklist_itens")
    .select("id, item, ordem, feito, feito_em, prazo, observacao, usuarios!checklist_itens_feito_por_fkey(nome)")
    .eq("tipo", f.tipo)
    .order("ordem")
    .order("item");
  if (f.veiculoId) q = q.eq("veiculo_id", f.veiculoId);
  if (f.vendaId) q = q.eq("venda_id", f.vendaId);
  const { data } = await q;
  return (data ?? []).map((i) => ({ ...i, feito_por: (i.usuarios as { nome: string } | null)?.nome ?? null }));
}

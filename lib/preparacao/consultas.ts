import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Carros em preparação com o andamento do checklist e a quantidade de fotos. */
export async function carrosEmPreparacao() {
  const supabase = await criarClienteServidor();
  const { data: carros } = await supabase
    .from("v_veiculos")
    .select("id, marca, modelo, versao, ano_modelo, placa, cor, data_entrada")
    .eq("status", "em_preparacao")
    .order("data_entrada", { ascending: true });
  const ids = (carros ?? []).map((c) => c.id!).filter(Boolean);
  if (!ids.length) return [];
  const [{ data: itens }, { data: fotos }] = await Promise.all([
    supabase.from("checklist_itens").select("veiculo_id, feito").eq("tipo", "preparacao").in("veiculo_id", ids),
    supabase.from("arquivos").select("entidade_id").eq("entidade", "veiculo").eq("categoria", "foto").in("entidade_id", ids),
  ]);
  return (carros ?? []).map((c) => {
    const meus = (itens ?? []).filter((i) => i.veiculo_id === c.id);
    return {
      ...c,
      total: meus.length,
      feitos: meus.filter((i) => i.feito).length,
      fotos: (fotos ?? []).filter((f) => f.entidade_id === c.id).length,
    };
  });
}

/** Custos de preparação visíveis (o preparador vê só os que ele lançou; a RLS garante). */
export async function custosDaPreparacao(veiculoId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("custos_veiculo")
    .select("id, tipo, descricao, valor, data, criado_por")
    .eq("veiculo_id", veiculoId)
    .order("data", { ascending: false });
  const ids = [...new Set((data ?? []).map((c) => c.criado_por).filter((x): x is string => !!x))];
  const { data: nomes } = ids.length ? await supabase.from("usuarios").select("id, nome").in("id", ids) : { data: [] };
  return (data ?? []).map((c) => ({ ...c, lancado_por: (nomes ?? []).find((u) => u.id === c.criado_por)?.nome ?? null }));
}

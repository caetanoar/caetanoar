import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/format/data";

/** Vendas fechadas com o andamento do checklist de documentação (transferência). */
export async function vendasParaDocumentar() {
  const supabase = await criarClienteServidor();
  const { data: vendas } = await supabase
    .from("v_vendas")
    .select("id, numero, data_venda, veiculo_nome, veiculo_placa, cliente_nome")
    .eq("status", "fechada")
    .order("data_venda", { ascending: false })
    .limit(150);
  const ids = (vendas ?? []).map((v) => v.id!).filter(Boolean);
  if (!ids.length) return [];
  const { data: itens } = await supabase.from("checklist_itens").select("venda_id, feito, prazo").eq("tipo", "documentacao").in("venda_id", ids);
  const hoje = hojeISO();
  return (vendas ?? []).map((v) => {
    const meus = (itens ?? []).filter((i) => i.venda_id === v.id);
    const abertos = meus.filter((i) => !i.feito);
    const prazos = abertos.map((i) => i.prazo).filter((p): p is string => !!p).sort();
    return {
      ...v,
      total: meus.length,
      feitos: meus.length - abertos.length,
      atrasados: abertos.filter((i) => i.prazo && i.prazo < hoje).length,
      proximoPrazo: prazos[0] ?? null,
    };
  });
}

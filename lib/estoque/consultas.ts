import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";

export function urlFoto(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos-veiculos/${path}`;
}

export async function opcoesCadastro() {
  const supabase = await criarClienteServidor();
  const [{ data: fornecedores }, { data: consignantes }] = await Promise.all([
    supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("consignantes").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  return { fornecedores: fornecedores ?? [], consignantes: consignantes ?? [] };
}

/** Veículo com dados de gestão (custos, margem, consignação) — só dono e gerente. */
export async function carregarVeiculoGestao(id: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("v_veiculos_gestao").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  let consignacao = null;
  if (data.consignacao_id) {
    const { data: c } = await supabase.from("consignacoes").select("*").eq("id", data.consignacao_id).maybeSingle();
    consignacao = c;
  }
  return { veiculo: data, consignacao };
}

/** Veículo com os dados públicos (todos os perfis). */
export async function carregarVeiculoPublico(id: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("v_veiculos").select("*").eq("id", id).maybeSingle();
  return data;
}

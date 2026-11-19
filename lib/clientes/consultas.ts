import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function opcoesCliente() {
  const supabase = await criarClienteServidor();
  const [{ data: vendedores }, { data: parceiros }] = await Promise.all([
    supabase.rpc("listar_vendedores"),
    supabase.rpc("listar_parceiros_ativos"),
  ]);
  return {
    vendedores: (vendedores ?? []).map((v) => ({ id: v.id, nome: v.papel === "vendedor" ? v.nome : `${v.nome} (${v.papel})` })),
    parceiros: parceiros ?? [],
  };
}

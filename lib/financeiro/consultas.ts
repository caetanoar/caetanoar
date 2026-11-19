import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function opcoesFinanceiro() {
  const supabase = await criarClienteServidor();
  const [{ data: contas }, { data: categorias }, { data: veiculos }, { data: fornecedores }] = await Promise.all([
    supabase.from("contas_financeiras").select("id, nome, tipo").eq("ativa", true).order("nome"),
    supabase.from("categorias_financeiras").select("id, nome, tipo, grupo, natureza, sistema").eq("ativa", true).order("grupo").order("nome"),
    supabase.from("veiculos").select("id, marca, modelo, placa, status").neq("status", "devolvido").order("data_entrada", { ascending: false }).limit(300),
    supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  return {
    contas: contas ?? [],
    categorias: categorias ?? [],
    veiculos: (veiculos ?? []).map((v) => ({ id: v.id, nome: `${v.marca} ${v.modelo}${v.placa ? ` ${v.placa}` : ""}${v.status === "vendido" ? " (vendido)" : ""}` })),
    fornecedores: fornecedores ?? [],
  };
}

export type OpcoesFinanceiro = Awaited<ReturnType<typeof opcoesFinanceiro>>;

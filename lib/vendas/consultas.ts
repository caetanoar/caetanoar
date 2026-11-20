import "server-only";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { nomeVeiculo } from "@/lib/estoque/rotulos";
import type { UsuarioAtual } from "@/lib/auth/sessao";
import type { VeiculoOpcao } from "@/app/(app)/vendas/form-venda";

export async function opcoesVenda(usuario: UsuarioAtual, incluirVeiculo?: string) {
  const supabase = await criarClienteServidor();
  const gestor = pode(usuario.papel, "vendas.fechar");
  const [{ data: veiculos }, { data: clientes }, { data: parceiros }, { data: vendedores }, contas, { data: config }] = await Promise.all([
    supabase
      .from("veiculos")
      .select("id, marca, modelo, versao, ano_modelo, placa, tipo, status, preco_anunciado, preco_negociavel")
      .or(`status.in.(em_preparacao,disponivel,reservado)${incluirVeiculo ? `,id.eq.${incluirVeiculo}` : ""}`)
      .order("marca"),
    supabase.from("clientes").select("id, nome").is("anonimizado_em", null).order("nome").limit(1000),
    supabase.rpc("listar_parceiros_ativos"),
    supabase.rpc("listar_vendedores"),
    gestor ? supabase.from("contas_financeiras").select("id, nome").eq("ativa", true).order("nome") : Promise.resolve({ data: [] }),
    supabase.from("configuracoes").select("garantia_dias_padrao, garantia_cobertura_padrao").single(),
  ]);
  return {
    veiculos: (veiculos ?? []).map(
      (v): VeiculoOpcao => ({
        id: v.id,
        nome: `${nomeVeiculo(v)} ${v.ano_modelo ?? ""}${v.placa ? ` · ${v.placa}` : ""}${v.status === "reservado" ? " (reservado)" : ""}`.trim(),
        tipo: v.tipo,
        preco_anunciado: v.preco_anunciado,
        preco_negociavel: v.preco_negociavel,
      }),
    ),
    clientes: clientes ?? [],
    parceiros: parceiros ?? [],
    vendedores: (vendedores ?? []).map((v) => ({ id: v.id, nome: v.nome })),
    contas: (contas.data ?? []) as { id: string; nome: string }[],
    gestor,
    config: { garantia_dias: config?.garantia_dias_padrao ?? 90, garantia_cobertura: config?.garantia_cobertura_padrao ?? null },
  };
}

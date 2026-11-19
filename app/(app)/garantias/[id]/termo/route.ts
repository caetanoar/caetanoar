import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { gerarTermoGarantia } from "@/lib/vendas/termo-garantia";
import { nomeVeiculo } from "@/lib/estoque/rotulos";

/** Termo de garantia em PDF para o cliente assinar (dono e gerente). */
export async function GET(_: Request, ctx: RouteContext<"/garantias/[id]/termo">) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!pode(usuario.papel, "garantias")) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  const { id } = await ctx.params;

  const supabase = await criarClienteServidor();
  const { data: g } = await supabase.from("garantias").select("data_inicio, data_fim, dias, cobertura, cancelada, venda_id, veiculo_id, cliente_id").eq("id", id).maybeSingle();
  if (!g) return NextResponse.json({ erro: "Garantia não encontrada." }, { status: 404 });
  if (g.cancelada) return NextResponse.json({ erro: "Garantia cancelada." }, { status: 409 });

  const [{ data: venda }, { data: v }, { data: cliente }, { data: cfg }] = await Promise.all([
    supabase.from("vendas").select("numero, data_venda").eq("id", g.venda_id).single(),
    supabase.from("veiculos").select("marca, modelo, versao, ano_fabricacao, ano_modelo, cor, placa, chassi, km").eq("id", g.veiculo_id).single(),
    supabase.from("clientes").select("nome").eq("id", g.cliente_id).single(),
    supabase.from("configuracoes").select("nome_loja, cidade, uf, telefones_assinatura, garantia_cobertura_padrao").single(),
  ]);
  if (!venda || !v || !cliente || !cfg) return NextResponse.json({ erro: "Dados incompletos." }, { status: 404 });
  const cobertura = g.cobertura?.trim() || cfg.garantia_cobertura_padrao?.trim();
  if (!cobertura) return NextResponse.json({ erro: "Defina o texto da cobertura em Configurações → Dados da loja." }, { status: 409 });

  const pdf = await gerarTermoGarantia({
    loja: { nome: cfg.nome_loja, cidade: cfg.cidade, uf: cfg.uf, telefones: cfg.telefones_assinatura },
    cliente: cliente.nome,
    veiculo: {
      descricao: nomeVeiculo({ marca: v.marca, modelo: v.modelo, versao: v.versao }),
      ano: v.ano_fabricacao && v.ano_modelo ? `${v.ano_fabricacao}/${v.ano_modelo}` : String(v.ano_modelo ?? v.ano_fabricacao ?? ""),
      cor: v.cor, placa: v.placa, chassi: v.chassi, km: v.km,
    },
    venda: { numero: venda.numero, data: venda.data_venda },
    garantia: { inicio: g.data_inicio, fim: g.data_fim ?? g.data_inicio, dias: g.dias, cobertura },
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="termo-garantia-${venda.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

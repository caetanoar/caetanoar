import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarVerificacao } from "@/lib/vendas/verificacao";
import { gerarTermoCiencia } from "@/lib/vendas/termo-ciencia";
import { nomeVeiculo } from "@/lib/estoque/rotulos";
import { formatarAno } from "@/lib/format/veiculo";

/** Termo de Ciência em PDF: lista exatamente os alertas da ciência registrada. */
export async function GET(_: Request, ctx: RouteContext<"/vendas/[id]/termo-ciencia">) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!pode(usuario.papel, "vendas")) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ erro: "Venda inválida." }, { status: 404 });

  const supabase = await criarClienteServidor();
  const [{ data: venda }, verif] = await Promise.all([
    supabase.from("vendas").select("numero, data_venda, valor_venda, veiculo_id, cliente_id, vendedor_id").eq("id", id).maybeSingle(),
    carregarVerificacao(id),
  ]);
  if (!venda || !verif) return NextResponse.json({ erro: "Venda não encontrada." }, { status: 404 });
  if (!verif.ciencia) return NextResponse.json({ erro: "Registre a ciência do cliente antes de gerar o termo." }, { status: 409 });

  const [{ data: v }, { data: cliente }, { data: vendedor }, { data: cfg }] = await Promise.all([
    supabase.from("veiculos").select("marca, modelo, versao, ano_fabricacao, ano_modelo, cor, placa, chassi, km").eq("id", venda.veiculo_id).single(),
    supabase.from("clientes").select("nome").eq("id", venda.cliente_id).single(),
    supabase.from("usuarios").select("nome").eq("id", venda.vendedor_id).single(),
    supabase.from("configuracoes").select("nome_loja, cidade, uf, telefones_assinatura").single(),
  ]);
  if (!v || !cliente || !cfg) return NextResponse.json({ erro: "Dados incompletos." }, { status: 404 });

  await supabase.rpc("marcar_termo_gerado", { p_ciencia: verif.ciencia.id });
  const pdf = await gerarTermoCiencia({
    loja: { nome: cfg.nome_loja, cidade: cfg.cidade, uf: cfg.uf, telefones: cfg.telefones_assinatura },
    cliente: cliente.nome,
    vendedor: vendedor?.nome ?? "",
    veiculo: {
      descricao: nomeVeiculo({ marca: v.marca, modelo: v.modelo, versao: v.versao }),
      ano: formatarAno(v.ano_fabricacao, v.ano_modelo),
      cor: v.cor, placa: v.placa, chassi: v.chassi, km: v.km,
    },
    venda: { numero: venda.numero, data: venda.data_venda, valor: Number(venda.valor_venda) },
    alertas: verif.ciencia.alertas,
    informadoEm: verif.ciencia.em,
    informadoPor: verif.ciencia.por ?? "",
    consulta: verif.consulta ? { em: verif.consulta.consultado_em, provedor: verif.consulta.provedor, simulado: verif.consulta.simulado } : null,
    liberacao: verif.liberacao ? { em: verif.liberacao.em, por: verif.liberacao.por ?? "dono", justificativa: verif.liberacao.justificativa } : null,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="termo-ciencia-${venda.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

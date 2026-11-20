import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { gerarPdfOrcamento } from "@/lib/orcamentos/pdf";
import { dadosPdfDoPublico } from "@/lib/orcamentos/dados-pdf";

/** PDF do orçamento enviado (o mesmo conteúdo que o cliente vê pelo link). */
export async function GET(_: Request, ctx: RouteContext<"/orcamentos/[id]/pdf">) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!pode(usuario.papel, "orcamentos")) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  const { id } = await ctx.params;
  const supabase = await criarClienteServidor();
  const { data: o } = await supabase.from("orcamentos").select("token_publico, numero, clientes(nome)").eq("id", id).maybeSingle();
  if (!o?.token_publico) return NextResponse.json({ erro: "Envie o orçamento antes de gerar o PDF." }, { status: 409 });
  const { data: publico } = await supabase.rpc("orcamento_publico", { p_token: o.token_publico });
  if (!publico) return NextResponse.json({ erro: "Orçamento indisponível." }, { status: 404 });
  const dados = dadosPdfDoPublico(publico as Record<string, unknown>);
  dados.cliente = (o.clientes as { nome: string } | null)?.nome ?? dados.cliente;
  const pdf = await gerarPdfOrcamento(dados);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="orcamento-${o.numero}.pdf"`, "Cache-Control": "private, no-store" },
  });
}

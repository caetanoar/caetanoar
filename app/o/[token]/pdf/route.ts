import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { gerarPdfOrcamento } from "@/lib/orcamentos/pdf";
import { dadosPdfDoPublico } from "@/lib/orcamentos/dados-pdf";

/** PDF do link público (sem login; só com o token do orçamento enviado). */
export async function GET(_: Request, ctx: RouteContext<"/o/[token]/pdf">) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("orcamento_publico", { p_token: token });
  if (!data) return NextResponse.json({ erro: "Orçamento não encontrado." }, { status: 404 });
  const dados = dadosPdfDoPublico(data as Record<string, unknown>);
  const pdf = await gerarPdfOrcamento(dados);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="orcamento-${dados.numero}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}

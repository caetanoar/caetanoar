import { NextResponse, type NextRequest } from "next/server";
import { obterUsuarioAtual } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { gerarRelatorio, TIPOS_RELATORIO, type TipoRelatorio } from "@/lib/relatorios/definicoes";
import { lerPeriodo, montarCSV, nomeArquivo } from "@/lib/relatorios/formato";
import { gerarPDF } from "@/lib/relatorios/pdf";

/** Exporta o relatório em CSV ou PDF: /relatorios/vendas/exportar?formato=csv&de=…&ate=… */
export async function GET(req: NextRequest, ctx: RouteContext<"/relatorios/[tipo]/exportar">) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!pode(usuario.papel, "relatorios")) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });

  const { tipo } = await ctx.params;
  if (!(tipo in TIPOS_RELATORIO)) return NextResponse.json({ erro: "Relatório inexistente." }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const formato = sp.get("formato") === "pdf" ? "pdf" : "csv";
  const periodo = lerPeriodo({ de: sp.get("de") ?? undefined, ate: sp.get("ate") ?? undefined });
  const rel = await gerarRelatorio(tipo as TipoRelatorio, periodo.de, periodo.ate);
  const arquivo = nomeArquivo(tipo, periodo, formato);
  const cabecalhos = {
    "Content-Disposition": `attachment; filename="${arquivo}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  if (formato === "csv") {
    return new Response(montarCSV(rel.colunas, rel.linhas), { headers: { ...cabecalhos, "Content-Type": "text/csv; charset=utf-8" } });
  }

  const supabase = await criarClienteServidor();
  const { data: cfg } = await supabase.from("configuracoes").select("nome_loja").maybeSingle();
  const pdf = await gerarPDF(rel, periodo, usuario.nome, cfg?.nome_loja ?? "Caetano Auto");
  return new Response(new Uint8Array(pdf), { headers: { ...cabecalhos, "Content-Type": "application/pdf" } });
}

import { NextResponse, type NextRequest } from "next/server";
import { obterUsuarioAtual } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { provedorFipe, valorPorCodigo } from "@/lib/integracoes/fipe";
import { normalizarMarca, normalizarCombustivel } from "@/lib/integracoes/fipe/normalizar";

/** Consulta FIPE para usuários logados: ?acao=marcas|modelos|anos|valor|codigo */
export async function GET(req: NextRequest) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const acao = sp.get("acao");
  const marca = sp.get("marca") ?? "";
  const modelo = sp.get("modelo") ?? "";
  const ano = sp.get("ano") ?? "";
  const apenasCodigo = /^[0-9A-Za-z-]+$/;
  if ([marca, modelo, ano].some((v) => v && !apenasCodigo.test(v))) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  try {
    const fipe = provedorFipe();
    switch (acao) {
      case "marcas":
        return NextResponse.json(await fipe.marcas());
      case "modelos":
        return NextResponse.json(await fipe.modelos(marca));
      case "anos":
        return NextResponse.json(await fipe.anos(marca, modelo));
      case "valor":
      case "codigo": {
        const v =
          acao === "valor"
            ? await fipe.valor(marca, modelo, ano)
            : await valorPorCodigo(sp.get("codigoFipe") ?? "", Number(sp.get("anoModelo")), sp.get("combustivel"));
        if (!v) return NextResponse.json({ erro: "Código FIPE sem valor para este ano." }, { status: 404 });
        const supabase = await criarClienteServidor();
        await supabase.from("fipe_cache").upsert({
          codigo_fipe: v.codigoFipe,
          ano_modelo: v.anoModelo,
          combustivel: v.combustivel,
          marca: v.marca,
          modelo: v.modelo,
          valor: v.valor,
          mes_referencia: v.mesReferencia,
          consultado_em: new Date().toISOString(),
        });
        return NextResponse.json({
          ...v,
          marcaNormalizada: normalizarMarca(v.marca),
          combustivelNormalizado: normalizarCombustivel(v.combustivel),
        });
      }
      default:
        return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro na consulta FIPE." }, { status: 502 });
  }
}

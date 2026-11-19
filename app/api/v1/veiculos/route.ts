import type { NextRequest } from "next/server";
import { autenticar, erroApi, inteiro, json } from "@/lib/api/http";
import { listarVeiculosApi, STATUS_PUBLICOS } from "@/lib/api/veiculos";

/** GET /api/v1/veiculos?status=disponivel,reservado&limite=50&pagina=1 */
export async function GET(req: NextRequest) {
  const auth = await autenticar(req, "estoque:ler");
  if (!auth.ok) return auth.resposta;
  const sp = req.nextUrl.searchParams;
  const status = (sp.get("status") ?? "disponivel").split(",").map((s) => s.trim());
  if (!status.every((s) => (STATUS_PUBLICOS as readonly string[]).includes(s))) {
    return erroApi(400, "parametro_invalido", "status aceita: disponivel, reservado.");
  }
  const limite = inteiro(sp.get("limite"), 50, 1, 100);
  const pagina = inteiro(sp.get("pagina"), 1, 1, 10_000);
  const { dados, total } = await listarVeiculosApi({ status, limite, pagina });
  return json({ dados, pagina, limite, total });
}

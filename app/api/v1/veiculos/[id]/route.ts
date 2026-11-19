import { autenticar, erroApi, json } from "@/lib/api/http";
import { buscarVeiculoApi } from "@/lib/api/veiculos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/v1/veiculos/{id} */
export async function GET(req: Request, ctx: RouteContext<"/api/v1/veiculos/[id]">) {
  const auth = await autenticar(req, "estoque:ler");
  if (!auth.ok) return auth.resposta;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return erroApi(400, "parametro_invalido", "id inválido.");
  const v = await buscarVeiculoApi(id);
  return v ? json({ dados: v }) : erroApi(404, "nao_encontrado", "Carro não encontrado ou não está à venda.");
}

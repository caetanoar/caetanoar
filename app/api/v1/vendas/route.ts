import type { NextRequest } from "next/server";
import { autenticar, erroApi, json } from "@/lib/api/http";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { diasEntre, hojeISO, inicioDoMes } from "@/lib/format/data";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/v1/vendas?de=2026-11-01&ate=2026-11-30 — vendas fechadas (sem cliente, lucro ou comissão). */
export async function GET(req: NextRequest) {
  const auth = await autenticar(req, "vendas:ler");
  if (!auth.ok) return auth.resposta;
  const sp = req.nextUrl.searchParams;
  const de = sp.get("de") ?? inicioDoMes();
  const ate = sp.get("ate") ?? hojeISO();
  if (!ISO.test(de) || !ISO.test(ate) || de > ate) return erroApi(400, "parametro_invalido", "Use de e ate no formato aaaa-mm-dd.");
  if (diasEntre(de, ate) > 366) return erroApi(400, "parametro_invalido", "Período máximo de 366 dias.");

  const { data, error } = await criarClienteAdmin()
    .from("v_vendas")
    .select("id, numero, data_venda, veiculo_id, veiculo_nome, veiculo_ano, tipo_veiculo, valor_venda, formas, qtd_trocas")
    .eq("status", "fechada")
    .gte("data_venda", de)
    .lte("data_venda", ate)
    .order("data_venda");
  if (error) return erroApi(500, "erro_interno", "Não foi possível consultar as vendas.");
  return json({ dados: data, de, ate, total: data.length });
}

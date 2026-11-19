import { timingSafeEqual } from "node:crypto";
import { processarEntregas } from "@/lib/webhooks/entregar";

/**
 * Reenvio dos webhooks pendentes. Chamado por agendador (Vercel Cron ou
 * pg_cron + pg_net no Supabase) com Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  const recebido = req.headers.get("authorization") ?? "";
  const esperado = `Bearer ${segredo ?? ""}`;
  const valido = !!segredo && segredo.length >= 16 && recebido.length === esperado.length && timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
  if (!valido) return Response.json({ erro: "Não autorizado." }, { status: 401 });
  const resumo = await processarEntregas(50);
  return Response.json(resumo, { headers: { "Cache-Control": "no-store" } });
}

export const POST = GET;

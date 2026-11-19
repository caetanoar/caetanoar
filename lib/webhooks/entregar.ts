import "server-only";
import { after } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { assinar } from "./assinatura";
import { urlSegura } from "./url-segura";

export type ResumoEntregas = { processadas: number; entregues: number; falhas: number };

/** Entrega as notificações pendentes (com reenvio progressivo em caso de falha). */
export async function processarEntregas(limite = 20): Promise<ResumoEntregas> {
  const admin = criarClienteAdmin();
  const { data: lote, error } = await admin.rpc("webhooks_reservar", { p_limite: limite });
  if (error) throw new Error(error.message);
  const resultados = await Promise.allSettled(
    (lote ?? []).map(async (e) => {
      const corpo = JSON.stringify({ id: e.evento_id, tipo: e.tipo, criado_em: e.evento_em, dados: e.payload });
      let ok = false;
      let status: number | null = null;
      let erro: string | null = null;
      const bloqueio = await urlSegura(e.url);
      if (bloqueio) {
        erro = bloqueio;
      } else {
        try {
          const ts = Math.floor(Date.now() / 1000);
          const r = await fetch(e.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "CaetanoAuto-Webhooks/1.0",
              "X-Caetano-Evento": e.tipo,
              "X-Caetano-Entrega": String(e.entrega_id),
              "X-Caetano-Assinatura": assinar(e.segredo, ts, corpo),
            },
            body: corpo,
            redirect: "manual",
            signal: AbortSignal.timeout(10_000),
          });
          status = r.status;
          ok = r.status >= 200 && r.status < 300;
          if (!ok) erro = `HTTP ${r.status}`;
        } catch (falha) {
          erro = falha instanceof Error ? falha.message : "Falha de rede";
        }
      }
      await admin.rpc("webhooks_registrar", { p_entrega: e.entrega_id, p_ok: ok, p_status: status as number, p_erro: erro as string });
      return ok;
    }),
  );
  const entregues = resultados.filter((r) => r.status === "fulfilled" && r.value).length;
  return { processadas: resultados.length, entregues, falhas: resultados.length - entregues };
}

/** Dispara as entregas logo depois da resposta (sem atrasar quem salvou). */
export function dispararWebhooks() {
  after(async () => {
    try {
      await processarEntregas();
    } catch (e) {
      console.error("[webhooks]", e instanceof Error ? e.message : e);
    }
  });
}

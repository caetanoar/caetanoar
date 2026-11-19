import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Assinatura enviada no cabeçalho X-Caetano-Assinatura: "t=<unix>,v1=<hex>",
 * onde v1 = HMAC-SHA256(segredo, `${t}.${corpo}`). O receptor recalcula e
 * rejeita assinaturas com mais de 5 minutos (proteção contra reenvio).
 */
export function assinar(segredo: string, timestamp: number, corpo: string): string {
  const v1 = createHmac("sha256", segredo).update(`${timestamp}.${corpo}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

export function verificarAssinatura(segredo: string, cabecalho: string, corpo: string, agora = Math.floor(Date.now() / 1000), toleranciaSeg = 300): boolean {
  const partes = Object.fromEntries(cabecalho.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(partes.t);
  if (!Number.isFinite(t) || !partes.v1 || Math.abs(agora - t) > toleranciaSeg) return false;
  const esperado = Buffer.from(assinar(segredo, t, corpo).split("v1=")[1], "hex");
  const recebido = Buffer.from(partes.v1, "hex");
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

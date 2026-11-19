import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PRIVADO_V4 = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];
const ehPrivado = (ip: string) =>
  isIP(ip) === 4 ? PRIVADO_V4.some((r) => r.test(ip)) : /^(::1|::|fc|fd|fe80|::ffff:(10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\.)/i.test(ip);

/**
 * Evita que um webhook aponte para a rede interna (SSRF): em produção só https
 * para endereços públicos. Em desenvolvimento, aceita localhost.
 */
export async function urlSegura(url: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "URL inválida.";
  }
  const dev = process.env.NODE_ENV !== "production";
  const local = ["localhost", "127.0.0.1"].includes(u.hostname);
  if (u.username || u.password) return "A URL não pode conter usuário e senha.";
  if (local) return dev ? null : "Endereço local não é permitido.";
  if (u.protocol !== "https:") return "Use uma URL https://.";
  try {
    const ips = await lookup(u.hostname, { all: true });
    if (ips.some((e) => ehPrivado(e.address))) return "A URL aponta para um endereço interno.";
  } catch {
    return "Não foi possível resolver o endereço.";
  }
  return null;
}

import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { hojeISO } from "@/lib/format/data";
import { FORMATO_CHAVE, hashChave, type Escopo } from "./chaves";

const CABECALHOS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export function json(dados: unknown, status = 200, extra?: Record<string, string>) {
  return Response.json(dados, { status, headers: { ...CABECALHOS, ...extra } });
}

export function erroApi(status: number, codigo: string, mensagem: string) {
  return json({ erro: { codigo, mensagem } }, status, status === 401 ? { "WWW-Authenticate": 'Bearer realm="caetano-auto"' } : undefined);
}

export type ChaveApi = { id: string; nome: string };

/**
 * Autentica a requisição pela chave (Authorization: Bearer ca_... ou X-API-Key)
 * e confere o escopo. Usa a chave de serviço só para achar o hash.
 */
export async function autenticar(req: Request, escopo: Escopo): Promise<{ ok: true; chave: ChaveApi } | { ok: false; resposta: Response }> {
  const auth = req.headers.get("authorization") ?? "";
  const valor = (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : req.headers.get("x-api-key") ?? "").trim();
  if (!valor) return { ok: false, resposta: erroApi(401, "sem_chave", "Envie a chave no cabeçalho Authorization: Bearer <chave>.") };
  if (!FORMATO_CHAVE.test(valor)) return { ok: false, resposta: erroApi(401, "chave_invalida", "Chave inválida.") };

  const admin = criarClienteAdmin();
  const { data: k } = await admin
    .from("api_chaves")
    .select("id, nome, escopos, expira_em, revogada_em, ultimo_uso_em")
    .eq("hash", hashChave(valor))
    .maybeSingle();
  if (!k) return { ok: false, resposta: erroApi(401, "chave_invalida", "Chave inválida.") };
  if (k.revogada_em) return { ok: false, resposta: erroApi(401, "chave_revogada", "Esta chave foi revogada.") };
  if (k.expira_em && k.expira_em < hojeISO()) return { ok: false, resposta: erroApi(401, "chave_expirada", "Esta chave expirou.") };
  if (!k.escopos.includes(escopo)) return { ok: false, resposta: erroApi(403, "sem_permissao", `A chave não tem o escopo ${escopo}.`) };

  if (!k.ultimo_uso_em || Date.now() - new Date(k.ultimo_uso_em).getTime() > 60_000) {
    await admin.from("api_chaves").update({ ultimo_uso_em: new Date().toISOString() }).eq("id", k.id);
  }
  return { ok: true, chave: { id: k.id, nome: k.nome } };
}

export function inteiro(v: string | null, padrao: number, min: number, max: number): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
}

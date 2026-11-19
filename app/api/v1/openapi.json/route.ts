import { documentoOpenApi } from "@/lib/api/openapi";

/** Documentação pública da API (não exige chave). */
export function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  return Response.json(documentoOpenApi(base.replace(/\/$/, "")), { headers: { "Cache-Control": "public, max-age=3600" } });
}

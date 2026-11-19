import type { FipeValor } from "./tipos";
import { anoFipe, valorFipe } from "./normalizar";

/** BrasilAPI: valor atual por código FIPE (todas as versões/anos do código). */
export async function precoPorCodigoBrasilAPI(codigoFipe: string): Promise<FipeValor[]> {
  const resp = await fetch(`https://brasilapi.com.br/api/fipe/preco/v1/${encodeURIComponent(codigoFipe)}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!resp.ok) throw new Error(`BrasilAPI indisponível (HTTP ${resp.status}).`);
  const lista = (await resp.json()) as {
    valor: string; marca: string; modelo: string; anoModelo: number; combustivel: string; codigoFipe: string; mesReferencia: string;
  }[];
  return lista.map((r) => ({
    valor: valorFipe(r.valor),
    marca: r.marca,
    modelo: r.modelo,
    anoModelo: anoFipe(r.anoModelo),
    combustivel: r.combustivel,
    codigoFipe: r.codigoFipe,
    mesReferencia: r.mesReferencia.trim(),
  }));
}

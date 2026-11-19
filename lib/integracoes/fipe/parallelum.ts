import type { FipeOpcao, FipeValor, ProvedorFipe } from "./tipos";
import { anoFipe, valorFipe } from "./normalizar";

const UM_DIA = 60 * 60 * 24;

async function obter<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const resp = await fetch(url, { headers: { Accept: "application/json", ...headers }, next: { revalidate: UM_DIA } });
  if (resp.status === 429) throw new Error("Limite de consultas da FIPE atingido. Tente de novo em alguns minutos.");
  if (!resp.ok) throw new Error(`FIPE indisponível (HTTP ${resp.status}).`);
  return (await resp.json()) as T;
}

/** Parallelum v1 (gratuita, sem conta). */
export function criarParallelumV1(base = "https://parallelum.com.br/fipe/api/v1/carros"): ProvedorFipe {
  return {
    nome: "Parallelum",
    async marcas() {
      const r = await obter<{ codigo: string; nome: string }[]>(`${base}/marcas`);
      return r.map((m) => ({ codigo: String(m.codigo), nome: m.nome }));
    },
    async modelos(marca) {
      const r = await obter<{ modelos: { codigo: number | string; nome: string }[] }>(`${base}/marcas/${marca}/modelos`);
      return r.modelos.map((m) => ({ codigo: String(m.codigo), nome: m.nome }));
    },
    async anos(marca, modelo) {
      const r = await obter<{ codigo: string; nome: string }[]>(`${base}/marcas/${marca}/modelos/${modelo}/anos`);
      return r.map((a) => ({ codigo: a.codigo, nome: a.nome.replace(/^32000/, "Zero km") }));
    },
    async valor(marca, modelo, ano): Promise<FipeValor> {
      const r = await obter<{
        Valor: string; Marca: string; Modelo: string; AnoModelo: number; Combustivel: string; CodigoFipe: string; MesReferencia: string;
      }>(`${base}/marcas/${marca}/modelos/${modelo}/anos/${ano}`);
      return {
        valor: valorFipe(r.Valor),
        marca: r.Marca,
        modelo: r.Modelo,
        anoModelo: anoFipe(r.AnoModelo),
        combustivel: r.Combustivel,
        codigoFipe: r.CodigoFipe,
        mesReferencia: r.MesReferencia.trim(),
      };
    },
  };
}

/** Parallelum v2 (com token opcional, limites maiores). */
export function criarParallelumV2(token: string, base = "https://fipe.parallelum.com.br/api/v2/cars"): ProvedorFipe {
  const h = { "X-Subscription-Token": token };
  return {
    nome: "Parallelum v2",
    async marcas() {
      const r = await obter<{ code: string; name: string }[]>(`${base}/brands`, h);
      return r.map((m): FipeOpcao => ({ codigo: m.code, nome: m.name }));
    },
    async modelos(marca) {
      const r = await obter<{ code: string; name: string }[]>(`${base}/brands/${marca}/models`, h);
      return r.map((m) => ({ codigo: m.code, nome: m.name }));
    },
    async anos(marca, modelo) {
      const r = await obter<{ code: string; name: string }[]>(`${base}/brands/${marca}/models/${modelo}/years`, h);
      return r.map((a) => ({ codigo: a.code, nome: a.name.replace(/^32000/, "Zero km") }));
    },
    async valor(marca, modelo, ano) {
      const r = await obter<{
        price: string; brand: string; model: string; modelYear: number; fuel: string; codeFipe: string; referenceMonth: string;
      }>(`${base}/brands/${marca}/models/${modelo}/years/${ano}`, h);
      return {
        valor: valorFipe(r.price),
        marca: r.brand,
        modelo: r.model,
        anoModelo: anoFipe(r.modelYear),
        combustivel: r.fuel,
        codigoFipe: r.codeFipe,
        mesReferencia: r.referenceMonth.trim(),
      };
    },
  };
}

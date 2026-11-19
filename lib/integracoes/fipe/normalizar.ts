import { parseMoeda } from "@/lib/format/moeda";

const MARCAS: Record<string, string> = {
  "VW - VolksWagen": "Volkswagen",
  "GM - Chevrolet": "Chevrolet",
  "Mercedes-Benz": "Mercedes-Benz",
  "Citroën": "Citroën",
  "Caoa Chery": "Caoa Chery",
  "Caoa Chery/Chery": "Caoa Chery",
};

/** "VW - VolksWagen" → "Volkswagen"; "GM - Chevrolet" → "Chevrolet". */
export function normalizarMarca(nome: string): string {
  const limpo = nome.trim();
  if (MARCAS[limpo]) return MARCAS[limpo];
  const semPrefixo = limpo.includes(" - ") ? limpo.split(" - ").pop()! : limpo;
  return semPrefixo
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (p.length <= 3 && p === p.toUpperCase() ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** Combustível da FIPE → enum do sistema. */
export function normalizarCombustivel(nome: string | null | undefined): "flex" | "gasolina" | "etanol" | "diesel" | "hibrido" | "eletrico" | null {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("flex")) return "flex";
  if (n.includes("gasolina")) return "gasolina";
  if (n.includes("álcool") || n.includes("alcool") || n.includes("etanol")) return "etanol";
  if (n.includes("diesel")) return "diesel";
  if (n.includes("híbrido") || n.includes("hibrido")) return "hibrido";
  if (n.includes("elétrico") || n.includes("eletrico")) return "eletrico";
  return null;
}

export function valorFipe(texto: string): number {
  const v = parseMoeda(texto);
  if (v === null) throw new Error(`Valor FIPE inválido: ${texto}`);
  return v;
}

/** Ano "32000" na FIPE significa "Zero km". */
export function anoFipe(ano: number | string): number {
  const n = Number(ano);
  return n >= 32000 ? new Date().getFullYear() + 1 : n;
}

const PLACA_ANTIGA = /^[A-Z]{3}\d{4}$/;
const PLACA_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export function normalizarPlaca(valor: string | null | undefined): string {
  return (valor ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function validarPlaca(valor: string | null | undefined): boolean {
  const p = normalizarPlaca(valor);
  return PLACA_ANTIGA.test(p) || PLACA_MERCOSUL.test(p);
}

/** "abc1234" → "ABC-1234"; Mercosul "abc1d23" → "ABC1D23". */
export function formatarPlaca(valor: string | null | undefined): string {
  const p = normalizarPlaca(valor);
  if (PLACA_ANTIGA.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return p;
}

/** RENAVAM: 11 dígitos com dígito verificador (antigos de 9 dígitos são completados com zeros). */
export function validarRenavam(valor: string | null | undefined): boolean {
  let d = (valor ?? "").replace(/\D/g, "");
  if (!d || d.length > 11) return false;
  d = d.padStart(11, "0");
  if (/^0+$/.test(d)) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = pesos.reduce((acc, p, i) => acc + Number(d[i]) * p, 0);
  let dv = (soma * 10) % 11;
  if (dv === 10) dv = 0;
  return dv === Number(d[10]);
}

export function normalizarChassi(valor: string | null | undefined): string {
  return (valor ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);
}

/** Chassi (VIN): 17 caracteres, sem as letras I, O e Q. */
export function validarChassi(valor: string | null | undefined): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizarChassi(valor));
}

/** km: 40000 → "40.000 km". */
export function formatarKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return `${km.toLocaleString("pt-BR")} km`;
}

/** "2025/2026" ou "1995" quando só um ano é conhecido. */
export function formatarAno(fabricacao: number | null | undefined, modelo: number | null | undefined): string {
  if (fabricacao && modelo) return fabricacao === modelo ? `${fabricacao}/${modelo}` : `${fabricacao}/${modelo}`;
  return String(modelo ?? fabricacao ?? "—");
}

export const COMBUSTIVEIS = {
  flex: "Flex",
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  gnv: "GNV",
  hibrido: "Híbrido",
  eletrico: "Elétrico",
} as const;

export const CAMBIOS = {
  manual: "Manual",
  automatico: "Automático",
  cvt: "CVT",
  automatizado: "Automatizado",
} as const;

import { apenasDigitos } from "@/lib/utils";

/** "37991193815" → "(37) 99119-3815". */
export function formatarTelefone(valor: string | null | undefined): string {
  let d = apenasDigitos(valor);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Telefone brasileiro → formato internacional sem símbolos: "5537991193815". */
export function telefoneInternacional(valor: string | null | undefined): string | null {
  let d = apenasDigitos(valor);
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (!d.startsWith("55") || d.length < 12 || d.length > 13) return null;
  return d;
}

export function validarTelefone(valor: string | null | undefined): boolean {
  return telefoneInternacional(valor) !== null;
}

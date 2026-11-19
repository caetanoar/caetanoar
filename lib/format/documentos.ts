import { apenasDigitos } from "@/lib/utils";

function todosIguais(d: string) {
  return /^(\d)\1+$/.test(d);
}

export function validarCPF(valor: string | null | undefined): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 11 || todosIguais(d)) return false;
  const calc = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function validarCNPJ(valor: string | null | undefined): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 14 || todosIguais(d)) return false;
  const calc = (len: number) => {
    const pesos = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((acc, p, i) => acc + Number(d[i]) * p, 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Aceita CPF (11) ou CNPJ (14). */
export function validarDocumento(valor: string | null | undefined): boolean {
  const d = apenasDigitos(valor);
  return d.length === 11 ? validarCPF(d) : d.length === 14 ? validarCNPJ(d) : false;
}

export function formatarCPF(valor: string | null | undefined): string {
  const d = apenasDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function formatarCNPJ(valor: string | null | undefined): string {
  const d = apenasDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Formata conforme a quantidade de dígitos (máscara de digitação). */
export function formatarDocumento(valor: string | null | undefined): string {
  const d = apenasDigitos(valor);
  if (!d) return "";
  return d.length <= 11 ? formatarCPF(d) : formatarCNPJ(d);
}

/** LGPD: "123.456.789-09" → "***.456.789-**". CNPJ não é dado pessoal e não é mascarado. */
export function mascararCPF(valor: string | null | undefined): string {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return d ? formatarDocumento(d) : "—";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function tipoPessoa(valor: string | null | undefined): "PF" | "PJ" | null {
  const d = apenasDigitos(valor);
  return d.length === 11 ? "PF" : d.length === 14 ? "PJ" : null;
}

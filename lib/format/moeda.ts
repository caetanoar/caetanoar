const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatadorNumero = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 129999.9 → "R$ 129.999,90". Valores nulos viram "—". */
export function formatarMoeda(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return "—";
  // Intl usa espaço não separável depois de "R$"; trocamos por espaço comum para copiar/colar.
  return formatador.format(n).replace(/ /g, " ");
}

/** 129999.9 → "129.999,90" (sem o símbolo). */
export function formatarNumeroMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "";
  return formatadorNumero.format(valor);
}

/**
 * Converte texto digitado em reais para número.
 * Aceita "129.999,90", "R$ 129.999,90", "129999,9", "129999.90".
 */
export function parseMoeda(texto: string | number | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;
  if (typeof texto === "number") return Number.isFinite(texto) ? texto : null;
  let s = texto.replace(/[R$\s ]/g, "").trim();
  if (!s) return null;
  const negativo = s.startsWith("-");
  s = s.replace(/^-/, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "");
  } else if (/\.\d{3}$/.test(s)) {
    // "42.000" no padrão brasileiro = quarenta e dois mil
    s = s.replace(".", "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round((negativo ? -n : n) * 100) / 100;
}

/** Máscara de digitação: a cada dígito, desloca os centavos. "12345" → "123,45". */
export function mascararMoedaDigitada(texto: string): string {
  const digitos = texto.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digitos) return "";
  const centavos = Number(digitos) / 100;
  return formatadorNumero.format(centavos);
}

/** Percentual: 0.1 → "10%"; 12.5 (já em %) com emPercentual=true → "12,5%". */
export function formatarPercentual(valor: number | null | undefined, emPercentual = true): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  const v = emPercentual ? valor : valor * 100;
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

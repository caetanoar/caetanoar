export const FUSO = "America/Sao_Paulo";

const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const fmtPartes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

const SO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-11-19" ou timestamp → "19/11/2026". Datas puras não sofrem deslocamento de fuso. */
export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  if (typeof valor === "string") {
    const m = SO_DATA.exec(valor);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return "—";
  return fmtData.format(d);
}

/** Timestamp → "19/11/2026 14:30" no horário de Brasília. */
export function formatarDataHora(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  const d = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return "—";
  return fmtDataHora.format(d).replace(",", "");
}

/** Data de hoje em Brasília no formato ISO "aaaa-mm-dd". */
export function hojeISO(agora: Date = new Date()): string {
  return fmtPartes.format(agora);
}

/** Converte "19/11/2026" → "2026-11-19". Retorna null se inválida. */
export function parseDataBR(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return SO_DATA.test(texto.trim()) ? texto.trim() : null;
  const [, dd, mm, aaaa] = m;
  const d = new Date(Date.UTC(Number(aaaa), Number(mm) - 1, Number(dd)));
  if (d.getUTCDate() !== Number(dd) || d.getUTCMonth() !== Number(mm) - 1) return null;
  return `${aaaa}-${mm}-${dd}`;
}

function paraUTC(iso: string): number {
  const m = SO_DATA.exec(iso);
  if (!m) return new Date(iso).getTime();
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Dias corridos entre duas datas ISO (fim - início). */
export function diasEntre(inicio: string, fim: string = hojeISO()): number {
  return Math.round((paraUTC(fim) - paraUTC(inicio)) / 86_400_000);
}

/** Soma dias a uma data ISO. */
export function somarDias(iso: string, dias: number): string {
  const d = new Date(paraUTC(iso) + dias * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Primeiro dia do mês da data ISO: "2026-11-19" → "2026-11-01". */
export function inicioDoMes(iso: string = hojeISO()): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Último dia do mês da data ISO. */
export function fimDoMes(iso: string = hojeISO()): string {
  const [a, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(a, m, 0));
  return d.toISOString().slice(0, 10);
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11-01" → "novembro de 2026". */
export function nomeDoMes(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

/** Texto relativo curto: "hoje", "ontem", "há 5 dias", "em 3 dias". */
export function relativoDias(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = diasEntre(iso.slice(0, 10));
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d === -1) return "amanhã";
  return d > 0 ? `há ${d} dias` : `em ${-d} dias`;
}

import { formatarData, hojeISO, inicioDoMes, somarDias } from "@/lib/format/data";
import { formatarMoeda, formatarPercentual } from "@/lib/format/moeda";

export type TipoValor = "texto" | "moeda" | "data" | "numero" | "percentual";

const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimalCSV = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

/** Valor formatado para tela e PDF (R$ 1.234,56 · 19/11/2026 · 12,5%). */
export function formatarCelula(tipo: TipoValor, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  switch (tipo) {
    case "moeda":
      return formatarMoeda(Number(valor));
    case "data":
      return formatarData(String(valor));
    case "numero":
      return numero.format(Number(valor));
    case "percentual":
      return formatarPercentual(Number(valor));
    default:
      return String(valor);
  }
}

/**
 * Valor para CSV no padrão do Excel em português: decimal com vírgula e sem
 * separador de milhar (o Excel reconhece como número), datas dd/mm/aaaa.
 */
export function valorCSV(tipo: TipoValor, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "";
  switch (tipo) {
    case "moeda":
      return decimalCSV.format(Number(valor));
    case "percentual":
      return decimalCSV.format(Number(valor));
    case "numero":
      return String(Number(valor)).replace(".", ",");
    case "data":
      return formatarData(String(valor));
    default: {
      const s = String(valor);
      // Evita que o Excel interprete o texto como fórmula (injeção de CSV).
      return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    }
  }
}

function escaparCSV(campo: string): string {
  return /[";\r\n]/.test(campo) ? `"${campo.replace(/"/g, '""')}"` : campo;
}

/** CSV separado por ";" com BOM UTF-8, para abrir certo no Excel (acentos e colunas). */
export function montarCSV(colunas: { rotulo: string; tipo: TipoValor; chave: string }[], linhas: Record<string, unknown>[]): string {
  const cab = colunas.map((c) => escaparCSV(c.rotulo)).join(";");
  const corpo = linhas.map((l) => colunas.map((c) => escaparCSV(valorCSV(c.tipo, l[c.chave]))).join(";"));
  return "﻿" + [cab, ...corpo].join("\r\n") + "\r\n";
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export type Periodo = { de: string; ate: string };

/** Lê ?de=&ate= (ISO). Padrão: do início do mês até hoje. Inverte se vierem trocadas. */
export function lerPeriodo(params: { de?: string | string[]; ate?: string | string[] }, hoje = hojeISO()): Periodo {
  const valido = (v: unknown) => (typeof v === "string" && ISO.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
  let de = valido(params.de) ?? inicioDoMes(hoje);
  let ate = valido(params.ate) ?? hoje;
  if (de > ate) [de, ate] = [ate, de];
  return { de, ate };
}

/** Atalhos de período mostrados como chips. */
export function atalhosPeriodo(hoje = hojeISO()): { rotulo: string; de: string; ate: string }[] {
  const ini = inicioDoMes(hoje);
  const fimMesPassado = somarDias(ini, -1);
  const iniMesPassado = inicioDoMes(fimMesPassado);
  return [
    { rotulo: "Este mês", de: ini, ate: hoje },
    { rotulo: "Mês passado", de: iniMesPassado, ate: fimMesPassado },
    { rotulo: "Últimos 90 dias", de: somarDias(hoje, -89), ate: hoje },
    { rotulo: "Este ano", de: `${hoje.slice(0, 4)}-01-01`, ate: hoje },
  ];
}

/** Nome de arquivo seguro: relatorio-vendas-2026-11-01-a-2026-11-19.csv */
export function nomeArquivo(tipo: string, periodo: Periodo, ext: "csv" | "pdf"): string {
  return `relatorio-${tipo}-${periodo.de}-a-${periodo.ate}.${ext}`;
}

import { parseMoeda } from "@/lib/format/moeda";
import type { ExtratoLido, TransacaoExtrato } from "./tipos";

export type LayoutCSV = {
  separador: string;
  colunaData: string;
  colunaDescricao: string;
  colunaValor?: string | null;
  colunaDebito?: string | null;
  colunaCredito?: string | null;
  formatoData: "dd/mm/aaaa" | "aaaa-mm-dd" | "dd/mm/aa";
  decimal: "," | ".";
};

function separarLinha(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas;
    } else if (c === sep && !aspas) {
      campos.push(atual.trim());
      atual = "";
    } else atual += c;
  }
  campos.push(atual.trim());
  return campos;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Descobre separador, linha de cabeçalho e colunas pelos nomes mais comuns. */
export function detectarLayout(conteudo: string): { layout: LayoutCSV; cabecalho: string[]; linhaCabecalho: number } | null {
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim() !== "");
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    for (const sep of [";", ",", "\t"]) {
      const cols = separarLinha(linhas[i], sep);
      if (cols.length < 3) continue;
      const n = cols.map(norm);
      const achar = (...nomes: string[]) => cols[n.findIndex((c) => nomes.some((x) => c === x || c.startsWith(x)))] ?? null;
      const data = achar("data", "dt", "date");
      const desc = achar("historico", "descricao", "lancamento", "memo", "detalhe", "description");
      const valor = achar("valor", "value", "montante", "quantia");
      const debito = achar("debito", "saida");
      const credito = achar("credito", "entrada");
      if (data && desc && (valor || (debito && credito))) {
        const amostra = linhas[i + 1] ? separarLinha(linhas[i + 1], sep)[cols.indexOf(data)] ?? "" : "";
        return {
          layout: {
            separador: sep,
            colunaData: data,
            colunaDescricao: desc,
            colunaValor: valor,
            colunaDebito: valor ? null : debito,
            colunaCredito: valor ? null : credito,
            formatoData: /^\d{4}-\d{2}-\d{2}/.test(amostra) ? "aaaa-mm-dd" : /^\d{2}\/\d{2}\/\d{2}$/.test(amostra) ? "dd/mm/aa" : "dd/mm/aaaa",
            decimal: sep === "," ? "." : ",",
          },
          cabecalho: cols,
          linhaCabecalho: i,
        };
      }
    }
  }
  return null;
}

function data(v: string, formato: LayoutCSV["formatoData"]): string | null {
  const s = v.trim();
  if (formato === "aaaa-mm-dd") return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
  const m = /^(\d{2})\/(\d{2})\/(\d{2,4})$/.exec(s);
  if (!m) return null;
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${ano}-${m[2]}-${m[1]}`;
}

function valor(v: string | undefined, decimal: "," | "."): number | null {
  if (!v || !v.trim()) return null;
  let s = v.replace(/[R$\s]/g, "");
  const negativo = /^-|\(.*\)|D$/i.test(s);
  s = s.replace(/[()DC]/gi, "").replace(/^-/, "");
  const n = decimal === "," ? parseMoeda(s) : Number(s.replace(/,/g, ""));
  if (n === null || !Number.isFinite(n)) return null;
  return negativo ? -Math.abs(n) : n;
}

/** Lê CSV de extrato com o layout informado (ou detectado). */
export function lerCSV(conteudo: string, layoutInformado?: LayoutCSV): ExtratoLido {
  const detectado = detectarLayout(conteudo);
  const layout = layoutInformado ?? detectado?.layout;
  if (!layout) throw new Error("Não reconheci as colunas do CSV. Informe quais são data, descrição e valor.");
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim() !== "");
  const inicioCab = detectado?.linhaCabecalho ?? 0;
  const cab = separarLinha(linhas[inicioCab], layout.separador);
  const idx = (c?: string | null) => (c ? cab.indexOf(c) : -1);
  const iData = idx(layout.colunaData), iDesc = idx(layout.colunaDescricao), iValor = idx(layout.colunaValor), iDeb = idx(layout.colunaDebito), iCred = idx(layout.colunaCredito);
  if (iData < 0 || iDesc < 0 || (iValor < 0 && (iDeb < 0 || iCred < 0))) throw new Error("Colunas do layout não encontradas no arquivo.");
  const iDoc = cab.findIndex((c) => /^doc/i.test(norm(c)));

  const transacoes: TransacaoExtrato[] = [];
  for (const linha of linhas.slice(inicioCab + 1)) {
    const c = separarLinha(linha, layout.separador);
    const d = data(c[iData] ?? "", layout.formatoData);
    let v: number | null;
    if (iValor >= 0) v = valor(c[iValor], layout.decimal);
    else {
      const cr = valor(c[iCred], layout.decimal) ?? 0;
      const db = valor(c[iDeb], layout.decimal) ?? 0;
      v = Math.abs(cr) - Math.abs(db);
    }
    if (!d || v === null || v === 0) continue;
    if (/saldo/i.test(c[iDesc] ?? "")) continue;
    transacoes.push({ data: d, valor: Math.round(v * 100) / 100, descricao: c[iDesc] ?? "", documento: iDoc >= 0 ? c[iDoc] || null : null, fitid: null });
  }
  const datas = transacoes.map((t) => t.data).sort();
  return { transacoes, inicio: datas[0] ?? null, fim: datas.at(-1) ?? null, saldoFinal: null, conta: null };
}

import type { ExtratoLido, TransacaoExtrato } from "./tipos";

function dataOFX(v: string | null): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v ?? "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function numeroOFX(v: string | null): number | null {
  if (!v) return null;
  let s = v.trim();
  // Alguns bancos usam vírgula como decimal no OFX
  if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  else if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Valor de uma tag OFX (funciona com SGML sem fechamento e com XML). */
function tag(bloco: string, nome: string): string | null {
  const m = new RegExp(`<${nome}>([^<\\r\\n]*)`, "i").exec(bloco);
  return m ? m[1].trim() || null : null;
}

/** Lê extrato OFX 1.x (SGML) ou 2.x (XML), como os exportados por bancos brasileiros. */
export function lerOFX(conteudo: string): ExtratoLido {
  if (!/<OFX>/i.test(conteudo)) throw new Error("Arquivo não parece ser um OFX.");
  const blocos = conteudo.split(/<STMTTRN>/i).slice(1).map((b) => b.split(/<\/STMTTRN>/i)[0]);
  const transacoes: TransacaoExtrato[] = [];
  for (const b of blocos) {
    const data = dataOFX(tag(b, "DTPOSTED"));
    const valor = numeroOFX(tag(b, "TRNAMT"));
    if (!data || valor === null || valor === 0) continue;
    const memo = tag(b, "MEMO");
    const nome = tag(b, "NAME");
    transacoes.push({
      data,
      valor: Math.round(valor * 100) / 100,
      descricao: [memo, nome && nome !== memo ? nome : null].filter(Boolean).join(" · ") || (valor > 0 ? "Crédito" : "Débito"),
      documento: tag(b, "CHECKNUM") ?? tag(b, "REFNUM"),
      fitid: tag(b, "FITID"),
    });
  }
  const saldo = /<LEDGERBAL>[\s\S]*?<BALAMT>([^<\r\n]+)/i.exec(conteudo)?.[1] ?? null;
  return {
    transacoes,
    inicio: dataOFX(tag(conteudo, "DTSTART")),
    fim: dataOFX(tag(conteudo, "DTEND")),
    saldoFinal: numeroOFX(saldo),
    conta: tag(conteudo, "ACCTID"),
  };
}

/** Lê o arquivo respeitando o CHARSET do cabeçalho (muitos bancos usam Windows-1252). */
export function decodificarOFX(bytes: ArrayBuffer): string {
  const amostra = new TextDecoder("ascii").decode(bytes.slice(0, 400));
  const latin = /CHARSET:\s*(1252|ISO-8859-1|8859)/i.test(amostra) || /encoding="(windows-1252|iso-8859-1)"/i.test(amostra);
  return new TextDecoder(latin ? "windows-1252" : "utf-8").decode(bytes);
}

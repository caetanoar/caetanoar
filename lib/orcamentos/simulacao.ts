/** Simulação de financiamento pela tabela Price. Sempre marcada como simulação, sem aprovação de crédito. */

export type TaxaPrazo = { prazo: number; taxa_mensal: number };
export type Simulacao = { valor_financiado: number; prazo: number; taxa_mensal: number; parcela: number; total: number };

/** Parcela fixa: PV × i / (1 − (1 + i)^−n). Taxa em % ao mês. */
export function parcelaPrice(valor: number, taxaMensalPct: number, prazo: number): number {
  if (valor <= 0 || prazo <= 0) return 0;
  const i = taxaMensalPct / 100;
  const p = i === 0 ? valor / prazo : (valor * i) / (1 - Math.pow(1 + i, -prazo));
  return Math.round(p * 100) / 100;
}

export function simular(valor: number, opcao: TaxaPrazo): Simulacao {
  const parcela = parcelaPrice(valor, opcao.taxa_mensal, opcao.prazo);
  return { valor_financiado: Math.round(valor * 100) / 100, prazo: opcao.prazo, taxa_mensal: opcao.taxa_mensal, parcela, total: Math.round(parcela * opcao.prazo * 100) / 100 };
}

/** Lê a configuração (lista de {prazo, taxa_mensal}), ignorando entradas inválidas. */
export function taxasValidas(bruto: unknown): TaxaPrazo[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .map((t) => ({ prazo: Number((t as TaxaPrazo)?.prazo), taxa_mensal: Number((t as TaxaPrazo)?.taxa_mensal) }))
    .filter((t) => Number.isInteger(t.prazo) && t.prazo > 0 && t.prazo <= 120 && Number.isFinite(t.taxa_mensal) && t.taxa_mensal >= 0 && t.taxa_mensal < 20)
    .sort((a, b) => a.prazo - b.prazo);
}

export const AVISO_SIMULACAO = "Simulação, sem aprovação de crédito. Taxa, parcela e prazo dependem da análise do banco.";

export type TransacaoExtrato = {
  data: string; // aaaa-mm-dd
  valor: number; // positivo = entrada, negativo = saída
  descricao: string;
  documento: string | null;
  fitid: string | null;
};

export type ExtratoLido = {
  transacoes: TransacaoExtrato[];
  inicio: string | null;
  fim: string | null;
  saldoFinal: number | null;
  conta: string | null;
};

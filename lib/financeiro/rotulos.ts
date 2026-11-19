import type { Database } from "@/lib/supabase/database.types";

type E = Database["public"]["Enums"];

export const TIPO_CONTA: Record<E["tipo_conta"], string> = { caixa: "Caixa", banco: "Banco", carteira_digital: "Carteira digital" };

export const TIPO_LANCAMENTO: Record<E["tipo_lancamento"], string> = {
  receita: "Receita",
  despesa: "Despesa",
  transferencia_saida: "Transferência (saída)",
  transferencia_entrada: "Transferência (entrada)",
};

export const STATUS_LANCAMENTO: Record<E["status_lancamento"], { rotulo: string; variante: "warning" | "success" | "muted" }> = {
  pendente: { rotulo: "Pendente", variante: "warning" },
  pago: { rotulo: "Pago", variante: "success" },
  cancelado: { rotulo: "Cancelado", variante: "muted" },
};

export const FORMA_PAGAMENTO: Record<E["forma_pagamento"], string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  ted: "TED/transferência",
  boleto: "Boleto",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  financiamento: "Financiamento",
  cheque: "Cheque",
  permuta: "Permuta (troca)",
  outro: "Outro",
};

export const NATUREZA: Record<E["natureza_categoria"], string> = {
  operacional: "Operacional",
  terceiros: "Valores de terceiros",
  transferencia: "Transferência",
  estoque: "Estoque (compra de veículos)",
};

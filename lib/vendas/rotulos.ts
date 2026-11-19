import type { Database } from "@/lib/supabase/database.types";

type E = Database["public"]["Enums"];

export const STATUS_VENDA: Record<E["status_venda"], { rotulo: string; variante: "muted" | "warning" | "success" | "destructive" }> = {
  rascunho: { rotulo: "Rascunho", variante: "muted" },
  aguardando_aprovacao: { rotulo: "Aguardando aprovação", variante: "warning" },
  fechada: { rotulo: "Fechada", variante: "success" },
  cancelada: { rotulo: "Cancelada", variante: "destructive" },
};

export const FORMA_VENDA: Record<E["forma_pagamento_venda"], string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  ted: "TED/transferência",
  financiamento: "Financiamento",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  boleto: "Boleto",
  cheque: "Cheque",
};

export const BANCOS_FINANCIAMENTO = [
  "BV", "Santander", "Itaú", "Bradesco", "Banco Pan", "Safra", "C6 Bank", "Banco do Brasil", "Caixa", "Sicoob", "Sicredi", "Omni", "Outro",
];

export const TIPO_COMISSAO: Record<E["tipo_comissao"], string> = {
  loja_consignado: "Comissão da loja (consignado)",
  vendedor: "Comissão do vendedor",
  parceiro: "Comissão de indicação",
};

export const BASE_COMISSAO: Record<E["base_comissao"], string> = {
  valor_venda: "Valor da venda",
  comissao_loja: "Comissão da loja",
  lucro: "Lucro da venda",
};

export const STATUS_COMISSAO: Record<E["status_comissao"], { rotulo: string; variante: "warning" | "success" | "muted" }> = {
  pendente: { rotulo: "Pendente", variante: "warning" },
  quitada: { rotulo: "Quitada", variante: "success" },
  cancelada: { rotulo: "Cancelada", variante: "muted" },
};

export const STATUS_GARANTIA: Record<string, { rotulo: string; variante: "success" | "muted" | "destructive" | "warning" }> = {
  ativa: { rotulo: "Ativa", variante: "success" },
  vencida: { rotulo: "Vencida", variante: "muted" },
  acionada: { rotulo: "Acionada", variante: "destructive" },
  cancelada: { rotulo: "Cancelada", variante: "muted" },
};

export const STATUS_ACIONAMENTO: Record<E["status_acionamento"], string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  negado: "Negado (fora da cobertura)",
};

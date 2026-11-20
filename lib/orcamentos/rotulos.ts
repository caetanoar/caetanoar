import type { Database } from "@/lib/supabase/database.types";

type E = Database["public"]["Enums"];

export const STATUS_ORCAMENTO: Record<E["status_orcamento"], { rotulo: string; variante: "muted" | "info" | "success" | "destructive" | "warning" }> = {
  rascunho: { rotulo: "Rascunho", variante: "muted" },
  enviado: { rotulo: "Enviado", variante: "info" },
  aceito: { rotulo: "Aceito", variante: "success" },
  recusado: { rotulo: "Recusado", variante: "destructive" },
  expirado: { rotulo: "Expirado", variante: "warning" },
};

export const STATUS_DESCONTO: Record<E["status_desconto"], { rotulo: string; variante: "muted" | "success" | "warning" | "destructive" }> = {
  sem_desconto: { rotulo: "Sem desconto", variante: "muted" },
  dentro_limite: { rotulo: "Desconto dentro do limite", variante: "success" },
  aguardando_aprovacao: { rotulo: "Desconto aguardando aprovação", variante: "warning" },
  aprovado: { rotulo: "Desconto aprovado", variante: "success" },
  recusado: { rotulo: "Desconto recusado", variante: "destructive" },
};

export type Alerta = { codigo: string; nivel: "vermelho" | "amarelo" | "pendente" | "info"; origem: "consulta" | "cadastro"; descricao: string; fonte?: string; data?: string };

export function nivelGeral(alertas: Alerta[]): "vermelho" | "amarelo" | "pendente" | "verde" {
  if (alertas.some((a) => a.nivel === "vermelho")) return "vermelho";
  if (alertas.some((a) => a.nivel === "amarelo")) return "amarelo";
  if (alertas.some((a) => a.nivel === "pendente")) return "pendente";
  return "verde";
}

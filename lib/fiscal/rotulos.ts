import type { Database } from "@/lib/supabase/database.types";

type E = Database["public"]["Enums"];

export const STATUS_NOTA: Record<E["status_nota"], { rotulo: string; variante: "info" | "muted" | "warning" | "success" | "destructive" }> = {
  importada: { rotulo: "Importada", variante: "info" },
  rascunho: { rotulo: "Rascunho", variante: "muted" },
  processando: { rotulo: "Processando", variante: "warning" },
  autorizada: { rotulo: "Autorizada", variante: "success" },
  rejeitada: { rotulo: "Rejeitada", variante: "destructive" },
  cancelada: { rotulo: "Cancelada", variante: "muted" },
  denegada: { rotulo: "Denegada", variante: "destructive" },
};

export const REGIME: Record<string, string> = {
  simples_nacional: "Simples Nacional",
  simples_excesso: "Simples Nacional (excesso de sublimite)",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
};

export function formatarChave(chave: string | null | undefined): string {
  if (!chave) return "—";
  return chave.replace(/(\d{4})(?=\d)/g, "$1 ");
}

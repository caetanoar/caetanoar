import type { Database } from "@/lib/supabase/database.types";

type E = Database["public"]["Enums"];

export const STATUS_TAREFA: Record<E["status_tarefa"], { rotulo: string; variante: "info" | "warning" | "success" | "muted" }> = {
  pendente: { rotulo: "Pendente", variante: "info" },
  em_andamento: { rotulo: "Em andamento", variante: "warning" },
  concluida: { rotulo: "Concluída", variante: "success" },
  cancelada: { rotulo: "Cancelada", variante: "muted" },
};

export const ENTIDADE_TAREFA: Record<E["entidade_tarefa"], { rotulo: string; caminho: string }> = {
  veiculo: { rotulo: "Carro", caminho: "/estoque" },
  venda: { rotulo: "Venda", caminho: "/vendas" },
  cliente: { rotulo: "Cliente", caminho: "/clientes" },
  garantia: { rotulo: "Garantia", caminho: "/garantias" },
  orcamento: { rotulo: "Orçamento", caminho: "/orcamentos" },
};

export function linkEntidade(entidade: E["entidade_tarefa"] | null, id: string | null): string | null {
  return entidade && id ? `${ENTIDADE_TAREFA[entidade].caminho}/${id}` : null;
}

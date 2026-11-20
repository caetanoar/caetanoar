import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Alerta } from "@/lib/orcamentos/rotulos";

export type Verificacao = {
  nivel: "vermelho" | "amarelo" | "pendente" | "verde";
  alertas: Alerta[];
  bloqueios: Alerta[];
  sem_ciencia: Alerta[];
  precisa_ciencia: boolean;
  termo_assinado: boolean;
  consulta: { id: string; consultado_em: string; provedor: string; simulado: boolean; selo: "verde" | "amarelo" | "vermelho" | null; status: string } | null;
  liberacao: { id: string; em: string; justificativa: string; por: string | null; alertas: Alerta[] } | null;
  ciencia: { id: string; em: string; declaracao: string; por: string | null; alertas: Alerta[]; termo_gerado_em: string | null } | null;
  pode_aprovar: boolean;
  pode_fechar: boolean;
  pendencias: string[];
};

/** Situação atual da verificação do carro da venda (calculada no banco). */
export async function carregarVerificacao(vendaId: string): Promise<Verificacao | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("verificacao_venda", { p_venda: vendaId });
  return (data as unknown as Verificacao | null) ?? null;
}

/** Registro da verificação feita no fechamento (o que valia quando a venda fechou). */
export async function verificacaoDoFechamento(vendaId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("verificacoes_veiculo").select("nivel, alertas, verificado_em, liberacao_id, ciencia_id")
    .eq("venda_id", vendaId).eq("momento", "fechamento").order("verificado_em", { ascending: false }).limit(1).maybeSingle();
  return data ? { ...data, alertas: (data.alertas ?? []) as unknown as Alerta[] } : null;
}

export const NIVEL_VERIFICACAO = {
  vermelho: { rotulo: "Impeditivo", variante: "destructive" },
  amarelo: { rotulo: "Atenção: informar o cliente", variante: "warning" },
  pendente: { rotulo: "Consulta pendente", variante: "secondary" },
  verde: { rotulo: "Sem alertas", variante: "success" },
} as const;

import type { Database } from "@/lib/supabase/database.types";

type E = Database["public"]["Enums"];

export const STATUS_VEICULO: Record<E["status_veiculo"], { rotulo: string; variante: "success" | "warning" | "info" | "muted" | "destructive" | "secondary" }> = {
  em_preparacao: { rotulo: "Em preparação", variante: "warning" },
  disponivel: { rotulo: "Disponível", variante: "success" },
  reservado: { rotulo: "Reservado", variante: "info" },
  vendido: { rotulo: "Vendido", variante: "muted" },
  devolvido: { rotulo: "Devolvido ao dono", variante: "secondary" },
};

export const TIPO_VEICULO: Record<E["tipo_veiculo"], string> = { proprio: "Próprio", consignado: "Consignado" };
export const ORIGEM_VEICULO: Record<E["origem_veiculo"], string> = { compra: "Compra", troca: "Troca", consignacao: "Consignação" };
export const RESULTADO_LAUDO: Record<E["resultado_laudo"], string> = {
  aprovado: "Aprovado",
  aprovado_apontamentos: "Aprovado com apontamentos",
  reprovado: "Reprovado",
};
export const TIPO_CUSTO: Record<E["tipo_custo"], string> = {
  funilaria: "Funilaria",
  mecanica: "Mecânica",
  pintura: "Pintura",
  documentacao: "Documentação",
  lavagem: "Lavagem",
  estetica: "Estética/polimento",
  pneus: "Pneus",
  eletrica: "Elétrica",
  laudo: "Laudo/vistoria",
  transporte: "Transporte",
  outros: "Outros",
};
export const TIPO_HISTORICO: Record<E["tipo_historico"], string> = {
  pintura: "Pintura",
  reparo: "Reparo",
  sinistro: "Sinistro",
  revisao: "Revisão",
  manutencao: "Manutenção",
  observacao: "Observação",
};
export const RECEBIMENTO_CONSIGNADO: Record<E["recebimento_consignado"], string> = {
  loja_repassa: "Loja recebe e repassa ao dono",
  direto_dono: "Comprador paga direto ao dono",
};
export const CATEGORIAS_DOCUMENTO = {
  crlv: "CRLV / documento do carro",
  laudo: "Laudo cautelar",
  contrato: "Contrato",
  documento: "Documento",
  comprovante: "Comprovante",
  outro: "Outro",
} as const;

/** "Volkswagen T-Cross 200 TSI" */
export function nomeVeiculo(v: { marca: string; modelo: string; versao?: string | null }): string {
  return [v.marca, v.modelo, v.versao].filter(Boolean).join(" ");
}

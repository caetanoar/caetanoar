import type { Database } from "@/lib/supabase/database.types";

type E = Database["public"]["Enums"];

export const ORIGEM_LEAD: Record<E["origem_lead"], string> = {
  instagram: "Instagram",
  marketplace: "Marketplace",
  olx: "OLX",
  indicacao: "Indicação",
  loja: "Loja",
  site: "Site",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

export const ETAPA_FUNIL: Record<E["etapa_funil"], { rotulo: string; variante: "info" | "warning" | "success" | "destructive" }> = {
  lead: { rotulo: "Lead", variante: "info" },
  negociacao: { rotulo: "Em negociação", variante: "warning" },
  ganho: { rotulo: "Ganho", variante: "success" },
  perdido: { rotulo: "Perdido", variante: "destructive" },
};

export const MOTIVO_PERDA: Record<E["motivo_perda"], string> = {
  preco: "Preço",
  financiamento_negado: "Financiamento negado",
  comprou_outro_lugar: "Comprou em outro lugar",
  desistiu: "Desistiu da compra",
  sem_contato: "Parou de responder",
  carro_vendido: "Carro de interesse foi vendido",
  outro: "Outro",
};

export const CANAL_CONTATO: Record<E["canal_contato"], string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  loja: "Na loja",
  instagram: "Instagram",
  email: "E-mail",
  outro: "Outro",
};

import "server-only";
import type { ProvedorFiscal } from "./tipos";
import { criarProvedorSimulado } from "./mock";
import { criarProvedorFocusNFe } from "./focusnfe";
import { criarProvedorNFeIo } from "./nfeio";

export type { NotaSaida, ResultadoFiscal, ProvedorFiscal } from "./tipos";

/** Provedor de emissão escolhido por variável de ambiente (padrão: simulado). */
export function provedorFiscal(): ProvedorFiscal {
  const ambiente = process.env.FISCAL_AMBIENTE === "producao" ? "producao" : "homologacao";
  switch (process.env.FISCAL_PROVIDER) {
    case "focusnfe":
      return criarProvedorFocusNFe(process.env.FISCAL_API_TOKEN, ambiente);
    case "nfeio":
      return criarProvedorNFeIo(process.env.FISCAL_API_TOKEN, process.env.FISCAL_EMPRESA_ID);
    default:
      return criarProvedorSimulado();
  }
}

export function situacaoProvedor() {
  const p = provedorFiscal();
  return {
    nome: p.nome,
    configurado: p.configurado,
    simulado: !process.env.FISCAL_PROVIDER || process.env.FISCAL_PROVIDER === "mock",
    ambiente: process.env.FISCAL_AMBIENTE === "producao" ? "Produção" : "Homologação",
  };
}

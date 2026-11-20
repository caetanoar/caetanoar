import type { ChaveVerificacao, Verificacao } from "@/lib/integracoes/consulta-veicular/tipos";
import { VERIFICACOES } from "@/lib/integracoes/consulta-veicular/tipos";
import { formatarDataHora } from "@/lib/format/data";

export type Selo = "verde" | "amarelo" | "vermelho";

/** Impeditivos: o carro não pode ser negociado sem resolver. */
export const VERMELHAS: ChaveVerificacao[] = ["roubo_furto", "restricoes", "gravame"];
/** Atenção: pode negociar, mas o comprador precisa ser informado. */
export const AMARELAS: ChaveVerificacao[] = ["leilao", "sinistro", "ipva", "multas", "licenciamento", "recall"];

/**
 * Selo geral. "Não verificado" nunca conta como "nada encontrado": o selo verde só
 * diz que nada foi encontrado nos itens que o provedor verificou.
 */
export function calcularSelo(v: Partial<Record<ChaveVerificacao, Verificacao>>): Selo {
  if (VERMELHAS.some((k) => v[k]?.estado === "encontrado")) return "vermelho";
  if (AMARELAS.some((k) => v[k]?.estado === "encontrado")) return "amarelo";
  return "verde";
}

export function itensNaoVerificados(v: Partial<Record<ChaveVerificacao, Verificacao>>): string[] {
  return (Object.keys(VERIFICACOES) as ChaveVerificacao[]).filter((k) => (v[k]?.estado ?? "nao_verificado") === "nao_verificado").map((k) => VERIFICACOES[k]);
}

/** Frase padrão: nunca "carro limpo", "garantido" ou "sem problemas". */
export function fraseNadaEncontrado(consultadoEm: string, provedor: string): string {
  return `Nenhum registro encontrado na consulta de ${formatarDataHora(consultadoEm)} (${provedor}).`;
}

export const AVISO_BASE =
  "A consulta reflete o que a base do provedor tinha naquele momento; bases de dados podem estar incompletas ou desatualizadas.";

const CHAVES_PESSOAIS = /proprietari|owner|cpf|cnpj|documento|nome_?dono|rg\b|telefone|celular|e-?mail|endereco|logradouro|cep/i;

/** Remove do retorno bruto qualquer campo com dado pessoal do proprietário (LGPD). */
export function semDadosPessoais(bruto: unknown): unknown {
  if (Array.isArray(bruto)) return bruto.map(semDadosPessoais);
  if (bruto && typeof bruto === "object") {
    return Object.fromEntries(
      Object.entries(bruto as Record<string, unknown>)
        .filter(([k]) => !CHAVES_PESSOAIS.test(k))
        .map(([k, v]) => [k, semDadosPessoais(v)]),
    );
  }
  return bruto;
}

/** Compara chassi parcial (com * ou espaços) com o completo: só os caracteres conhecidos. */
export function chassiConfere(parcial: string | null | undefined, completo: string | null | undefined): boolean | null {
  const p = (parcial ?? "").toUpperCase().replace(/[^A-Z0-9*]/g, "");
  const c = (completo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!p || !c || p.replace(/\*/g, "").length < 4) return null;
  if (p.length === c.length) return [...p].every((ch, i) => ch === "*" || ch === c[i]);
  // Tamanhos diferentes: compara começo e fim conhecidos.
  const ini = p.split("*")[0];
  const fim = p.split("*").pop() ?? "";
  return c.startsWith(ini) && c.endsWith(fim);
}

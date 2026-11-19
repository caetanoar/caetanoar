import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/** Modelo padrão (sobrescrito por IA_MODELO). */
export const MODELO_PADRAO = "claude-opus-5-5";

export function modeloIA(): string {
  return process.env.IA_MODELO?.trim() || MODELO_PADRAO;
}

/**
 * A IA real só liga com ANTHROPIC_API_KEY definida. Sem ela, o sistema usa o
 * modo simulado (textos montados por regras), sem custo e sem chamada externa.
 */
export function iaAtiva(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

export function limiteDiario(): number {
  const n = Number(process.env.IA_LIMITE_DIARIO ?? 40);
  return Number.isFinite(n) && n > 0 ? n : 40;
}

export class ErroIA extends Error {}

/** Situação da IA para a tela de integrações (sem expor a chave). */
export function situacaoIA() {
  return { ativa: iaAtiva(), modelo: modeloIA(), limiteDiario: limiteDiario() };
}

let cliente: Anthropic | null = null;
function obterCliente(): Anthropic {
  // Chave passada explicitamente: nunca usar outra credencial do ambiente por engano.
  cliente ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 2 });
  return cliente;
}

export type Gerado<T> = { dados: T; modelo: string; tokensEntrada: number; tokensSaida: number };

/**
 * Uma chamada curta com saída estruturada (JSON validado pelo Zod).
 * Esforço baixo: são textos curtos. Se o modelo recusar por política, a API
 * tenta de novo com o modelo de reserva recomendado (fallbacks: "default").
 */
export async function gerarEstruturado<S extends z.ZodType>(esquema: S, sistema: string, entrada: string): Promise<Gerado<z.infer<S>>> {
  try {
    const resposta = await obterCliente().beta.messages.parse({
      model: modeloIA(),
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(esquema) },
      system: sistema,
      messages: [{ role: "user", content: entrada }],
    });
    if (resposta.stop_reason === "refusal") {
      throw new ErroIA("A IA não gerou este texto. Tente de novo ou escreva manualmente.");
    }
    if (resposta.stop_reason === "max_tokens" || !resposta.parsed_output) {
      throw new ErroIA("A resposta da IA veio incompleta. Tente de novo.");
    }
    return {
      dados: resposta.parsed_output as z.infer<S>,
      modelo: resposta.model,
      tokensEntrada: resposta.usage.input_tokens,
      tokensSaida: resposta.usage.output_tokens,
    };
  } catch (erro) {
    if (erro instanceof ErroIA) throw erro;
    if (erro instanceof Anthropic.AuthenticationError) throw new ErroIA("Chave da IA inválida. Confira ANTHROPIC_API_KEY.");
    if (erro instanceof Anthropic.RateLimitError) throw new ErroIA("Muitas solicitações à IA agora. Tente em alguns minutos.");
    if (erro instanceof Anthropic.BadRequestError) throw new ErroIA("A IA recusou a solicitação (requisição inválida).");
    if (erro instanceof Anthropic.APIConnectionError) throw new ErroIA("Sem conexão com a IA. Tente de novo.");
    if (erro instanceof Anthropic.APIError) throw new ErroIA(`Falha na IA (${erro.status ?? "sem status"}). Tente de novo.`);
    throw erro;
  }
}

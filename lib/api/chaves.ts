import "server-only";
import { createHmac, randomBytes } from "node:crypto";

export const ESCOPOS = {
  "estoque:ler": "Ler o estoque (carros à venda, fotos e itens confirmados)",
  "leads:criar": "Enviar leads (site, landing page, formulários)",
  "vendas:ler": "Ler vendas fechadas (sem cliente, lucro ou comissão)",
} as const;
export type Escopo = keyof typeof ESCOPOS;

function pepper(): string {
  const p = process.env.API_KEY_PEPPER;
  if (!p || p.length < 16) throw new Error("API_KEY_PEPPER não configurado (mínimo de 16 caracteres).");
  return p;
}

/** HMAC-SHA256 da chave com o pepper do servidor: o banco nunca guarda a chave. */
export function hashChave(chave: string): string {
  return createHmac("sha256", pepper()).update(chave).digest("hex");
}

/** Nova chave "ca_..." (aparece uma única vez para o dono). */
export function gerarChave() {
  const chave = `ca_${randomBytes(24).toString("base64url")}`;
  return { chave, prefixo: `${chave.slice(0, 10)}…`, hash: hashChave(chave) };
}

/** Segredo de assinatura de webhook ("whsec_..."). */
export function gerarSegredoWebhook(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export const FORMATO_CHAVE = /^ca_[A-Za-z0-9_-]{30,40}$/;

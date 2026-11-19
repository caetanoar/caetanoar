import type { ZodError } from "zod";

/** Resultado padrão de toda Server Action usada com useActionState. */
export type EstadoAcao<T = unknown> = {
  ok: boolean;
  mensagem?: string;
  erro?: string;
  erros?: Record<string, string[]>;
  dados?: T;
};

export const ESTADO_INICIAL: EstadoAcao = { ok: false };

export function errosDoZod(erro: ZodError): Record<string, string[]> {
  const erros: Record<string, string[]> = {};
  for (const issue of erro.issues) {
    const chave = issue.path.join(".") || "_";
    (erros[chave] ??= []).push(issue.message);
  }
  return erros;
}

type ErroPostgrest = { code?: string; message?: string; details?: string | null; hint?: string | null } | null;

/** Traduz erros do Postgres/PostgREST para mensagens claras em português. */
export function mensagemDeErro(erro: ErroPostgrest | Error | unknown): string {
  if (!erro) return "Erro desconhecido.";
  const e = erro as ErroPostgrest & Error;
  switch (e.code) {
    case "42501":
      return "Você não tem permissão para fazer isso.";
    case "23505":
      return "Já existe um registro com esses dados (duplicado).";
    case "23503":
      return "Este registro está vinculado a outros e não pode ser removido ou alterado assim.";
    case "23514":
      return "Algum valor está fora do permitido. Confira os campos.";
    case "23502":
      return "Falta preencher um campo obrigatório.";
    case "P0001":
      return e.message ?? "Operação não permitida.";
    case "PGRST116":
      return "Registro não encontrado ou sem permissão de acesso.";
  }
  if (e.message?.includes("row-level security")) return "Você não tem permissão para fazer isso.";
  return e.message || "Não foi possível concluir a operação.";
}

/** Lê um campo de texto do FormData (vazio vira null). */
export function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function booleano(fd: FormData, campo: string): boolean {
  const v = fd.get(campo);
  return v === "on" || v === "true" || v === "1";
}

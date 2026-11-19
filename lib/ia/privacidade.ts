/**
 * Proteção de dados pessoais antes de enviar texto livre à IA (LGPD):
 * anotações de contato podem conter CPF, telefone ou e-mail digitados pelo vendedor.
 */
export function limparDadosPessoais(texto: string | null | undefined): string {
  return (texto ?? "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[documento]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento]")
    .replace(/(\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, "[telefone]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}-?[\dxX]\b/g, "[documento]");
}

/** Só o primeiro nome do cliente vai para a IA. */
export function primeiroNome(nome: string | null | undefined): string {
  const p = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  return p ? p[0].toLocaleUpperCase("pt-BR") + p.slice(1).toLocaleLowerCase("pt-BR") : "Cliente";
}

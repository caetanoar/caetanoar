import { telefoneInternacional } from "@/lib/format/telefone";

/** Link do WhatsApp (formato pedido pela loja: api.whatsapp.com/send). */
export function linkWhatsApp(telefone: string | null | undefined, mensagem?: string): string | null {
  const numero = telefoneInternacional(telefone) ?? (telefone && /^55\d{10,11}$/.test(telefone) ? telefone : null);
  if (!numero) return null;
  const url = new URL("https://api.whatsapp.com/send");
  url.searchParams.set("phone", numero);
  if (mensagem) url.searchParams.set("text", mensagem);
  return url.toString();
}

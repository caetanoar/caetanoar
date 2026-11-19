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

type VeiculoMsg = {
  marca: string;
  modelo: string;
  versao?: string | null;
  ano_fabricacao?: number | null;
  ano_modelo?: number | null;
  preco_anunciado?: number | null;
  placa?: string | null;
};

/** Mensagem pronta sobre o carro para o botão "Chamar no WhatsApp". */
export function mensagemVeiculo(v: VeiculoMsg): string {
  const ano = v.ano_fabricacao && v.ano_modelo ? `${v.ano_fabricacao}/${v.ano_modelo}` : v.ano_modelo ?? v.ano_fabricacao ?? "";
  const nome = [v.marca, v.modelo, v.versao, ano].filter(Boolean).join(" ");
  const preco = v.preco_anunciado
    ? ` anunciado por ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v.preco_anunciado).replace(/ /g, " ")}`
    : "";
  return `Olá! Tenho interesse no ${nome}${preco}. Ainda está disponível?`;
}

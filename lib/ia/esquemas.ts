import { z } from "zod";

export const SaidaAnuncio = z.object({
  frase_instagram: z.string().describe("Uma ou duas frases curtas de abertura da legenda, sem emojis e sem preço."),
  olx: z.object({
    titulo: z.string().describe("Título para a OLX, até 70 caracteres."),
    descricao: z.string().describe("Descrição para a OLX, 3 a 6 linhas, sem emojis, sem telefone, link ou e-mail."),
  }),
  marketplace: z.object({
    titulo: z.string().describe("Título curto para o Facebook Marketplace."),
    descricao: z.string().describe("Descrição de 2 a 4 linhas, até 2 emojis, sem telefone."),
  }),
});
export type SaidaAnuncio = z.infer<typeof SaidaAnuncio>;

export const SaidaCliente = z.object({
  resumo: z.string().describe("2 a 4 frases: o que o cliente quer, o que já foi conversado e onde parou."),
  temperatura: z.enum(["quente", "morno", "frio"]),
  proximo_passo: z.string().describe("Uma ação concreta para o vendedor."),
  prazo_dias: z.number().describe("Em quantos dias fazer o próximo contato (0 = hoje)."),
  mensagem_whatsapp: z.string().describe("Mensagem curta e natural para o vendedor enviar, tratando o cliente pelo primeiro nome."),
  veiculos_sugeridos: z.array(z.string()).describe("Ids de até 3 carros de estoque_compativel que combinem com o interesse."),
});
export type SaidaCliente = z.infer<typeof SaidaCliente>;

/** Resultado entregue à tela. */
export type ResultadoAnuncio = {
  id: string;
  instagram: string;
  olx: { titulo: string; descricao: string };
  marketplace: { titulo: string; descricao: string };
  avisos: string[];
  pendencias: string[];
  laudoAprovado: boolean;
  comprovados: string[];
  simulado: boolean;
  criadoEm: string;
};

export type ResultadoCliente = {
  id: string;
  resumo: string;
  temperatura: "quente" | "morno" | "frio";
  proximo_passo: string;
  prazo_dias: number;
  mensagem_whatsapp: string;
  veiculos: { id: string; nome: string; preco: number | null }[];
  avisos: string[];
  simulado: boolean;
  criadoEm: string;
};

import type { DadosAnuncio } from "./legenda";

export const SISTEMA_ANUNCIO = `Você escreve textos de anúncio de carros seminovos para a Caetano Auto, revenda em Divinópolis (MG). O público é da região e chega pelo Instagram, pela OLX e pelo Facebook Marketplace.

A loja responde pelo que anuncia, então a honestidade vem antes da venda:
- Use só os dados do JSON recebido. Não invente itens, opcionais, revisões, procedência, garantia de fábrica nem estado de conservação.
- Cite itens apenas se estiverem em itens_confirmados. O histórico pode ser citado como informação; o que não for comprovado não vira garantia.
- Se laudo_cautelar_aprovado for false, não escreva "estado de novo", "sem problemas", "impecável", "nunca bateu", "perfeito estado", "zerado", "100%" nem expressões com o mesmo sentido.
- Se faltar algum dado, deixe de fora: o texto fixo da loja já diz "consulte no privado".
- Português do Brasil, tom próximo e direto, sem exagero e sem caixa alta.

O que devolver:
- frase_instagram: uma ou duas frases curtas que abrem a legenda. O sistema monta título, lista de itens, preço, contatos e assinatura, então não repita essas partes. Sem emojis e sem preço.
- olx: título com marca, modelo, versão e ano (até 70 caracteres) e descrição em texto corrido de 3 a 6 linhas com os dados e os itens confirmados, sem emojis, sem telefone, link ou e-mail.
- marketplace: título curto (marca, modelo e ano) e descrição de 2 a 4 linhas, com no máximo 2 emojis, terminando com um convite para chamar no Messenger ou no WhatsApp, sem telefone.`;

export const SISTEMA_CLIENTE = `Você ajuda os vendedores da Caetano Auto (seminovos, Divinópolis/MG) a acompanhar clientes. Você recebe o histórico de um cliente, sem dados pessoais além do primeiro nome, e devolve:
- resumo: 2 a 4 frases com o que o cliente quer, o que já foi conversado e onde a negociação parou. Se o histórico for curto, diga isso em vez de supor.
- temperatura: "quente" (pronto para fechar ou respondendo rápido), "morno" ou "frio" (sem resposta há muito tempo ou sem interesse).
- proximo_passo: uma ação concreta para o vendedor.
- prazo_dias: em quantos dias fazer o próximo contato (0 = hoje).
- mensagem_whatsapp: mensagem curta e natural que o vendedor possa enviar, tratando o cliente pelo primeiro nome e assinando com o nome do vendedor. Sem pressão, sem prometer desconto, taxa de financiamento ou estado do carro que não estejam nos dados, e sem "estado de novo" ou "sem problemas".
- veiculos_sugeridos: ids de até 3 carros de estoque_compativel que combinem com o interesse; lista vazia se nenhum combinar.
Use só os dados recebidos.`;

/** JSON enviado à IA para os anúncios (os mesmos dados ficam gravados em ia_geracoes). */
export function entradaAnuncio(d: DadosAnuncio) {
  return {
    marca: d.marca,
    modelo: d.modelo,
    versao: d.versao,
    motor: d.motor,
    ano_fabricacao: d.ano_fabricacao,
    ano_modelo: d.ano_modelo,
    cor: d.cor,
    km: d.km,
    combustivel: d.combustivel,
    cambio: d.cambio,
    portas: d.portas,
    preco_anunciado: d.preco_anunciado,
    laudo_cautelar_aprovado: d.laudo_cautelar && d.laudo_resultado === "aprovado",
    laudo_resultado: d.laudo_cautelar ? d.laudo_resultado : null,
    descricao_da_loja: d.descricao,
    itens_confirmados: d.itens_confirmados,
    historico: d.historico.map((h) => ({ descricao: h.descricao, comprovado: h.comprovado, tipo: h.tipo ?? null })),
  };
}

export type EntradaCliente = {
  primeiro_nome: string;
  vendedor: string | null;
  origem: string;
  etapa: string;
  motivo_perda: string | null;
  dias_desde_cadastro: number;
  dias_desde_ultimo_contato: number | null;
  proximo_contato_marcado: string | null;
  interesses: { descricao: string; faixa_preco: string | null; veiculo: string | null }[];
  contatos: { data: string; canal: string; resumo: string; resultado: string | null; proximo_passo: string | null }[];
  compras: { data: string; veiculo: string }[];
  estoque_compativel: { id: string; nome: string; preco: number | null }[];
};

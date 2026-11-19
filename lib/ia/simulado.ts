/**
 * Modo simulado: textos montados por regra, usados quando a IA não está ligada
 * (sem ANTHROPIC_API_KEY). Só usam os dados recebidos, nunca inventam.
 */
import type { DadosAnuncio } from "./legenda";
import { anoTexto, limitar } from "./legenda";
import type { SaidaAnuncio, SaidaCliente } from "./esquemas";
import type { EntradaCliente } from "./prompts";
import { formatarKm, COMBUSTIVEIS, CAMBIOS } from "@/lib/format/veiculo";
import { formatarMoeda } from "@/lib/format/moeda";

export function anuncioSimulado(d: DadosAnuncio): SaidaAnuncio {
  const nome = [d.marca, d.modelo, d.versao].filter(Boolean).join(" ");
  const ano = anoTexto(d);
  const caracteristicas = [
    d.cor ? `cor ${d.cor.toLocaleLowerCase("pt-BR")}` : null,
    d.km !== null ? formatarKm(d.km) : null,
    d.combustivel ? COMBUSTIVEIS[d.combustivel].toLocaleLowerCase("pt-BR") : null,
    d.cambio ? `câmbio ${CAMBIOS[d.cambio].toLocaleLowerCase("pt-BR")}` : null,
  ].filter(Boolean);
  const itens = d.itens_confirmados.length ? `Itens: ${d.itens_confirmados.join(", ")}.` : null;
  const historico = d.historico.length ? `Histórico: ${d.historico.map((h) => h.descricao).join("; ")}.` : null;
  const laudo = d.laudo_cautelar && d.laudo_resultado === "aprovado" ? "Laudo cautelar aprovado." : null;

  return {
    frase_instagram: `${nome} ${ano} disponível na Caetano Auto${caracteristicas.length ? `, ${caracteristicas.slice(0, 2).join(" e ")}` : ""}.`,
    olx: {
      titulo: limitar(`${nome} ${ano}`, 70),
      descricao: [
        `${nome}, ano ${ano}${caracteristicas.length ? `, ${caracteristicas.join(", ")}` : ""}.`,
        itens,
        historico,
        laudo,
        "Aceitamos troca e financiamos. Venha conhecer na Caetano Auto, em Divinópolis.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    marketplace: {
      titulo: limitar(`${d.marca} ${d.modelo} ${ano}`, 60),
      descricao: [
        `🚗 ${nome} ${ano}${caracteristicas.length ? `, ${caracteristicas.join(", ")}` : ""}.`,
        itens,
        "Aceitamos troca e financiamos. Chama no Messenger ou no WhatsApp.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  };
}

export function clienteSimulado(e: EntradaCliente): SaidaCliente {
  const dias = e.dias_desde_ultimo_contato;
  const temperatura: SaidaCliente["temperatura"] =
    e.etapa.includes("negocia") && dias !== null && dias <= 3 ? "quente" : dias === null || dias > 10 ? "frio" : "morno";
  const quando = dias === 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
  const interesse = e.interesses[0]?.descricao ?? null;
  const ultimo = e.contatos[0];
  const carro = e.estoque_compativel[0];

  const resumo = [
    `${e.primeiro_nome} chegou por ${e.origem} e está na etapa ${e.etapa}.`,
    interesse ? `Interesse: ${interesse}.` : "Ainda sem interesse registrado.",
    ultimo ? `Último contato ${quando} (${ultimo.canal}): ${ultimo.resumo}` : "Nenhum contato registrado ainda.",
  ].join(" ");

  const proximo = !ultimo
    ? "Fazer o primeiro contato e entender o que o cliente procura."
    : ultimo.proximo_passo || (carro ? `Apresentar o ${carro.nome}.` : "Retomar a conversa e confirmar se o interesse continua.");

  const mensagem = carro
    ? `Oi, ${e.primeiro_nome}! Aqui é ${e.vendedor ?? "a equipe"} da Caetano Auto. Chegou um ${carro.nome}${carro.preco ? ` por ${formatarMoeda(carro.preco)}` : ""} que tem a ver com o que você procura. Quer que eu mande fotos?`
    : `Oi, ${e.primeiro_nome}! Aqui é ${e.vendedor ?? "a equipe"} da Caetano Auto. Passando para saber se ainda está procurando carro. Posso te ajudar?`;

  return {
    resumo,
    temperatura,
    proximo_passo: proximo,
    prazo_dias: temperatura === "quente" ? 0 : temperatura === "morno" ? 2 : 1,
    mensagem_whatsapp: mensagem,
    veiculos_sugeridos: e.estoque_compativel.slice(0, 3).map((c) => c.id),
  };
}

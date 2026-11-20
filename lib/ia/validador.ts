import { normalizarTexto } from "@/lib/utils";

/**
 * Expressões que a loja não pode usar sem laudo cautelar aprovado
 * ("estado de novo", "sem problemas" e equivalentes). A loja responde pelo que
 * anuncia: sem laudo, essas promessas não têm como ser sustentadas.
 */
const SEM_LAUDO: { rotulo: string; padrao: RegExp }[] = [
  { rotulo: "estado de novo", padrao: /\bestado de (novo|zero|0 ?km)\b/ },
  { rotulo: "sem problemas", padrao: /\bsem (nenhum |qualquer )?problemas?\b/ },
  { rotulo: "zero problema", padrao: /\b(zero|nenhum) problemas?\b/ },
  { rotulo: "impecável", padrao: /\bimpecave(l|is)\b/ },
  { rotulo: "perfeito estado", padrao: /\b(em )?perfeito estado\b|\bestado perfeito\b/ },
  { rotulo: "nunca bateu", padrao: /\bnunca (bateu|batido|foi batido)\b|\bsem (nenhuma )?batidas?\b/ },
  { rotulo: "sem detalhes", padrao: /\bsem (nenhum )?detalhes?\b/ },
  { rotulo: "zerado", padrao: /\b(zerad[oa]|zerinho|novinho em folha)\b/ },
  { rotulo: "100%", padrao: /\b100 ?%|\bcem por cento\b/ },
  { rotulo: "todo original", padrao: /\b(todo|100%|totalmente) original\b|\bsem retoques?\b/ },
];

/** Precisa de comprovação nos itens ou no histórico do carro. */
const PRECISA_DADO: { rotulo: string; padrao: RegExp }[] = [
  { rotulo: "único dono", padrao: /\bunico dono\b/ },
  { rotulo: "revisões na concessionária", padrao: /\brevis(oes|ado|ada) (feitas? )?(na|em) concessionaria\b/ },
];

export type ContextoValidacao = {
  /** Laudo cautelar com resultado "aprovado" (sem apontamentos). */
  laudoAprovado: boolean;
  /** Textos de itens confirmados e histórico comprovado (para liberar "único dono" etc.). */
  comprovados?: string[];
};

/** Lista as expressões proibidas encontradas no texto (sem acento, sem caixa). */
export function validarTexto(texto: string, ctx: ContextoValidacao): string[] {
  const t = normalizarTexto(texto);
  const achados = new Set<string>();
  if (!ctx.laudoAprovado) {
    for (const r of SEM_LAUDO) if (r.padrao.test(t)) achados.add(r.rotulo);
  }
  const base = normalizarTexto((ctx.comprovados ?? []).join(" | "));
  for (const r of PRECISA_DADO) if (r.padrao.test(t) && !r.padrao.test(base)) achados.add(r.rotulo);
  return [...achados];
}

/** Remove as frases que contêm expressões proibidas (último recurso, após nova tentativa). */
export function removerTrechosProibidos(texto: string, ctx: ContextoValidacao): string {
  return texto
    .split("\n")
    .map((linha) =>
      linha
        .split(/(?<=[.!?])\s+/)
        .filter((frase) => validarTexto(frase, ctx).length === 0)
        .join(" "),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Expressões proibidas em qualquer texto sobre consulta de placa, orçamento ou venda:
 * a base de um provedor pode estar incompleta, então nunca "carro limpo",
 * "garantido" (promessa) nem "sem problemas".
 */
const PROIBIDAS_SEMPRE: { rotulo: string; padrao: RegExp }[] = [
  { rotulo: "carro limpo", padrao: /\b(carro|veiculo|historico|ficha) (100% )?limp[oa]\b|\bnome limpo\b/ },
  { rotulo: "garantido", padrao: /\bgarantid[oa]s?\b/ },
  { rotulo: "sem problemas", padrao: /\bsem (nenhum |qualquer )?problemas?\b/ },
];

export function validarTextoConsulta(texto: string): string[] {
  const t = normalizarTexto(texto);
  return PROIBIDAS_SEMPRE.filter((r) => r.padrao.test(t)).map((r) => r.rotulo);
}

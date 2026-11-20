import "server-only";
import { formatarAno } from "@/lib/format/veiculo";
import type { DadosPdfOrcamento } from "./pdf";
import type { Simulacao } from "./simulacao";
import type { Alerta } from "./rotulos";

/** Monta os dados do PDF a partir do retorno de orcamento_publico (mesma fonte do link do cliente). */
export function dadosPdfDoPublico(p: Record<string, unknown>): DadosPdfOrcamento {
  const v = p.veiculo as Record<string, string | number | null>;
  const loja = p.loja as Record<string, string>;
  return {
    numero: String(p.numero),
    emitidoEm: (p.enviado_em as string) ?? null,
    validade: (p.validade as string) ?? null,
    cliente: String(p.cliente ?? ""),
    vendedor: String(p.vendedor ?? ""),
    loja: { nome: loja.nome, cidade: loja.cidade, uf: loja.uf, telefones: loja.telefones, whatsapp: loja.whatsapp, assinatura: loja.assinatura },
    veiculo: {
      nome: [v.marca, v.modelo, v.versao].filter(Boolean).join(" "),
      ano: formatarAno(v.ano_fabricacao as number | null, v.ano_modelo as number | null),
      cor: (v.cor as string) ?? null,
      km: v.km === null || v.km === undefined ? null : Number(v.km),
    },
    precoAnunciado: Number(p.preco_anunciado ?? 0),
    desconto: Number(p.desconto ?? 0),
    valorFinal: Number(p.valor_final ?? 0),
    entrada: Number(p.valor_entrada ?? 0),
    pagamentos: ((p.pagamentos as Record<string, unknown>[]) ?? []).map((x) => ({ forma: String(x.forma), valor: Number(x.valor), banco: (x.banco as string) ?? null, parcelas: (x.parcelas as number) ?? null })),
    trocas: ((p.trocas as Record<string, unknown>[]) ?? []).map((t) => ({ nome: `${t.marca} ${t.modelo}${t.ano_modelo ? ` ${t.ano_modelo}` : ""}`, valor: Number(t.valor_avaliacao) })),
    simulacao: (p.simulacao as Simulacao) ?? null,
    observacoes: (p.observacoes as string) ?? null,
    alertas: ((p.alertas as Alerta[]) ?? []),
    alertasEm: (p.alertas_em as string) ?? null,
  };
}

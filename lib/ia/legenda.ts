import { formatarMoeda } from "@/lib/format/moeda";
import { formatarKm, COMBUSTIVEIS, CAMBIOS } from "@/lib/format/veiculo";
import { normalizarTexto } from "@/lib/utils";

/** Dados do carro usados nos anúncios: só campos públicos (nada de custo, mínimo ou consignante). */
export type DadosAnuncio = {
  marca: string;
  modelo: string;
  versao: string | null;
  motor: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  cor: string | null;
  km: number | null;
  combustivel: keyof typeof COMBUSTIVEIS | null;
  cambio: keyof typeof CAMBIOS | null;
  portas: number | null;
  preco_anunciado: number | null;
  laudo_cautelar: boolean;
  laudo_resultado: "aprovado" | "aprovado_apontamentos" | "reprovado" | null;
  descricao: string | null;
  itens_confirmados: string[];
  historico: { descricao: string; comprovado: boolean; tipo?: string | null }[];
};

/** Histórico que pode levar ✅ quando comprovado (revisão e manutenção). Pintura, reparo e sinistro são informação (ℹ️). */
const HISTORICO_POSITIVO = new Set(["revisao", "manutencao"]);
export const historicoComCheck = (h: DadosAnuncio["historico"][number]) => h.comprovado && (!h.tipo || HISTORICO_POSITIVO.has(h.tipo));

export type ConfigAnuncio = { regiao_anuncio: string; assinatura: string; telefones_assinatura: string };

export function anoTexto(d: Pick<DadosAnuncio, "ano_fabricacao" | "ano_modelo">): string {
  if (d.ano_fabricacao && d.ano_modelo && d.ano_fabricacao !== d.ano_modelo) return `${d.ano_fabricacao}/${String(d.ano_modelo).slice(-2)}`;
  return String(d.ano_modelo ?? d.ano_fabricacao ?? "");
}

/** MARCA MODELO [VERSÃO] ANO [MOTOR] [CÂMBIO], omitindo o que faltar e sem repetir o motor. */
export function tituloAnuncio(d: DadosAnuncio): string {
  const versao = d.versao?.trim() || null;
  const motor = d.motor?.trim() || null;
  const motorRepetido = !!(motor && versao && normalizarTexto(versao).includes(normalizarTexto(motor)));
  const partes = [d.marca, d.modelo, versao, anoTexto(d), motorRepetido ? null : motor, d.cambio ? CAMBIOS[d.cambio] : null];
  return partes.filter(Boolean).join(" ").replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

export const laudoAprovado = (d: Pick<DadosAnuncio, "laudo_cautelar" | "laudo_resultado">) => d.laudo_cautelar && d.laudo_resultado === "aprovado";

/** Textos comprovados (itens confirmados + histórico comprovado), usados pelo validador. */
export const textosComprovados = (d: DadosAnuncio) => [...d.itens_confirmados, ...d.historico.filter((h) => h.comprovado).map((h) => h.descricao)];

/** O que falta no cadastro e aparece como "consulte no privado". */
export function pendenciasAnuncio(d: DadosAnuncio): string[] {
  const p: string[] = [];
  if (d.km === null) p.push("quilometragem");
  if (!d.cambio) p.push("câmbio");
  if (d.itens_confirmados.length === 0) p.push("itens confirmados");
  if (!d.preco_anunciado) p.push("preço anunciado");
  if (!d.ano_modelo && !d.ano_fabricacao) p.push("ano");
  return p;
}

/**
 * Legenda do Instagram no formato fixo da loja. Só o texto de abertura vem da IA;
 * título, ✅, linhas 📍💰🔁💬, assinatura e telefones são montados aqui.
 */
export function montarLegenda(d: DadosAnuncio, frase: string, cfg: ConfigAnuncio): string {
  const linhas: string[] = [tituloAnuncio(d), ""];
  if (frase.trim()) linhas.push(frase.trim(), "");

  const detalhes: string[] = [];
  for (const item of d.itens_confirmados) detalhes.push(`✅ ${item}`);
  for (const h of d.historico) detalhes.push(historicoComCheck(h) ? `✅ ${h.descricao}` : `ℹ️ ${h.descricao}`);
  if (d.laudo_cautelar && d.laudo_resultado === "aprovado") detalhes.push("✅ Laudo cautelar aprovado");
  if (d.laudo_cautelar && d.laudo_resultado === "aprovado_apontamentos") detalhes.push("ℹ️ Laudo cautelar aprovado com apontamentos, consulte no privado");
  detalhes.push(d.km !== null ? `🛣️ ${formatarKm(d.km)}` : "🛣️ Quilometragem: consulte no privado");
  if (d.combustivel) detalhes.push(`⛽ ${COMBUSTIVEIS[d.combustivel]}`);
  if (!d.cambio) detalhes.push("⚙️ Câmbio: consulte no privado");
  if (d.itens_confirmados.length === 0) detalhes.push("ℹ️ Itens e opcionais: consulte no privado");
  linhas.push(...detalhes, "");

  linhas.push(
    `📍 ${cfg.regiao_anuncio}`,
    d.preco_anunciado ? `💰 ${formatarMoeda(d.preco_anunciado)}` : "💰 Valor: consulte no privado",
    "🔁 Aceita troca e financiamento",
    "💬 Chama no direct ou no WhatsApp",
    "",
    cfg.assinatura,
    `📲 ${cfg.telefones_assinatura}`,
  );
  return linhas.join("\n");
}

/** Corta no limite sem quebrar palavra. */
export function limitar(texto: string, max: number): string {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max + 1);
  const espaco = corte.lastIndexOf(" ");
  return (espaco > max * 0.6 ? corte.slice(0, espaco) : t.slice(0, max)).trim();
}

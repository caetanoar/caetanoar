import { z } from "zod";
import { parseMoeda } from "@/lib/format/moeda";
import { normalizarPlaca, validarPlaca, normalizarChassi, validarChassi, validarRenavam } from "@/lib/format/veiculo";

const vazioNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const textoOpc = z.preprocess(vazioNull, z.string().trim().nullable().optional()).transform((v) => v ?? null);

export const dinheiroOpc = z
  .preprocess(vazioNull, z.union([z.string(), z.number()]).nullable().optional())
  .transform((v, ctx) => {
    if (v === null || v === undefined) return null;
    const n = parseMoeda(v);
    if (n === null || n < 0) {
      ctx.addIssue({ code: "custom", message: "Valor inválido." });
      return z.NEVER;
    }
    return n;
  });

export const dinheiroObrig = dinheiroOpc.refine((v) => v !== null && v > 0, "Informe um valor maior que zero.");

export const inteiroOpc = (min: number, max: number, msg: string) =>
  z
    .preprocess(vazioNull, z.union([z.string(), z.number()]).nullable().optional())
    .transform((v, ctx) => {
      if (v === null || v === undefined) return null;
      const n = Number(String(v).replace(/\D/g, ""));
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: msg });
        return z.NEVER;
      }
      return n;
    });

export const dataOpc = z
  .preprocess(vazioNull, z.string().nullable().optional())
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida (use dd/mm/aaaa).")
  .transform((v) => v ?? null);

export const uuidOpc = z.preprocess(vazioNull, z.uuid().nullable().optional()).transform((v) => v ?? null);

function enumOpc<T extends [string, ...string[]]>(valores: T) {
  return z.preprocess(vazioNull, z.enum(valores).nullable().optional()).transform((v) => v ?? null);
}

export const esquemaVeiculo = z
  .object({
    tipo: z.enum(["proprio", "consignado"]),
    origem: z.enum(["compra", "troca", "consignacao"]),
    status: z.enum(["em_preparacao", "disponivel", "reservado", "vendido", "devolvido"]),
    placa: z
      .preprocess(vazioNull, z.string().nullable().optional())
      .transform((v) => (v ? normalizarPlaca(v) : null))
      .refine((v) => !v || validarPlaca(v), "Placa inválida (ABC1234 ou ABC1D23)."),
    chassi: z
      .preprocess(vazioNull, z.string().nullable().optional())
      .transform((v) => (v ? normalizarChassi(v) : null))
      .refine((v) => !v || validarChassi(v), "Chassi deve ter 17 caracteres, sem I, O ou Q."),
    renavam: z
      .preprocess(vazioNull, z.string().nullable().optional())
      .transform((v) => (v ? v.replace(/\D/g, "").padStart(11, "0") : null))
      .refine((v) => !v || validarRenavam(v), "RENAVAM inválido."),
    marca: z.string().trim().min(2, "Informe a marca."),
    modelo: z.string().trim().min(1, "Informe o modelo."),
    versao: textoOpc,
    motor: textoOpc,
    ano_fabricacao: inteiroOpc(1900, 2100, "Ano inválido."),
    ano_modelo: inteiroOpc(1900, 2100, "Ano inválido."),
    cor: textoOpc,
    km: inteiroOpc(0, 3_000_000, "Km inválido."),
    combustivel: enumOpc(["flex", "gasolina", "etanol", "diesel", "gnv", "hibrido", "eletrico"]),
    cambio: enumOpc(["manual", "automatico", "cvt", "automatizado"]),
    portas: inteiroOpc(1, 6, "Portas entre 1 e 6."),
    codigo_fipe: textoOpc,
    valor_fipe: dinheiroOpc,
    fipe_referencia: textoOpc,
    preco_anunciado: dinheiroOpc,
    preco_negociavel: dinheiroOpc,
    data_entrada: dataOpc,
    laudo_cautelar: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()),
    laudo_resultado: enumOpc(["aprovado", "aprovado_apontamentos", "reprovado"]),
    descricao: textoOpc,
    observacoes: textoOpc,
  })
  .superRefine((v, ctx) => {
    if (v.ano_fabricacao && v.ano_modelo && (v.ano_modelo < v.ano_fabricacao || v.ano_modelo > v.ano_fabricacao + 1)) {
      ctx.addIssue({ code: "custom", path: ["ano_modelo"], message: "Ano modelo deve ser igual ao de fabricação ou o seguinte." });
    }
    if (v.preco_negociavel !== null && v.preco_anunciado !== null && v.preco_negociavel > v.preco_anunciado) {
      ctx.addIssue({ code: "custom", path: ["preco_negociavel"], message: "O negociável não pode ser maior que o anunciado." });
    }
    if (!v.laudo_cautelar && v.laudo_resultado) {
      ctx.addIssue({ code: "custom", path: ["laudo_resultado"], message: "Marque que há laudo cautelar." });
    }
  });

export const esquemaSigilo = z.object({
  valor_compra: dinheiroOpc,
  data_compra: dataOpc,
  fornecedor_id: uuidOpc,
  preco_minimo: dinheiroOpc,
  observacoes_internas: textoOpc,
});

export const esquemaConsignacao = z
  .object({
    consignante_id: z.uuid("Escolha o consignante."),
    valor_minimo_dono: dinheiroOpc,
    data_inicio: dataOpc,
    data_fim: dataOpc,
    recebimento_padrao: enumOpc(["loja_repassa", "direto_dono"]),
    observacoes: textoOpc,
  })
  .refine((c) => !c.data_inicio || !c.data_fim || c.data_fim >= c.data_inicio, {
    path: ["data_fim"],
    message: "O fim do contrato deve ser depois do início.",
  });

export const esquemaCusto = z.object({
  veiculo_id: z.uuid(),
  tipo: z.enum(["funilaria", "mecanica", "pintura", "documentacao", "lavagem", "estetica", "pneus", "eletrica", "laudo", "transporte", "outros"]),
  descricao: textoOpc,
  valor: dinheiroObrig,
  data: dataOpc,
  fornecedor_id: uuidOpc,
  cobrar_do_consignante: z.preprocess((v) => v === "true" || v === "on", z.boolean()),
});

export const esquemaHistorico = z.object({
  veiculo_id: z.uuid(),
  data: dataOpc,
  tipo: z.enum(["pintura", "reparo", "sinistro", "revisao", "manutencao", "observacao"]),
  descricao: z.string().trim().min(3, "Descreva o histórico."),
  comprovado: z.preprocess((v) => v === "true" || v === "on", z.boolean()),
  visivel_anuncio: z.preprocess((v) => v === "true" || v === "on", z.boolean()),
});

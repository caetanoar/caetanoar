import { z } from "zod";
import { dinheiroObrig, dinheiroOpc, dataOpc, uuidOpc, textoOpc } from "@/lib/estoque/esquemas";

export const FORMAS = ["dinheiro", "pix", "ted", "boleto", "cartao_credito", "cartao_debito", "financiamento", "cheque", "permuta", "outro"] as const;

export const esquemaLancamento = z
  .object({
    tipo: z.enum(["receita", "despesa"]),
    descricao: z.string().trim().min(2, "Descreva o lançamento."),
    categoria_id: z.uuid("Escolha a categoria."),
    valor: dinheiroObrig,
    data_competencia: dataOpc,
    data_vencimento: dataOpc.refine((v) => !!v, "Informe o vencimento."),
    pago: z.preprocess((v) => v === "true" || v === "on", z.boolean()),
    data_pagamento: dataOpc,
    conta_id: uuidOpc,
    forma_pagamento: z.preprocess((v) => (v === "" ? null : v), z.enum(FORMAS).nullable().optional()),
    parcelas: z.coerce.number().int().min(1).max(120).default(1),
    veiculo_id: uuidOpc,
    fornecedor_id: uuidOpc,
    cliente_id: uuidOpc,
    observacoes: textoOpc,
  })
  .superRefine((l, ctx) => {
    if (l.pago && !l.conta_id && l.forma_pagamento !== "permuta") {
      ctx.addIssue({ code: "custom", path: ["conta_id"], message: "Informe a conta do pagamento." });
    }
    if (l.pago && l.parcelas > 1) {
      ctx.addIssue({ code: "custom", path: ["parcelas"], message: "Parcelado: lance como pendente e baixe cada parcela." });
    }
  });

export const esquemaConta = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  tipo: z.enum(["caixa", "banco", "carteira_digital"]),
  banco: textoOpc,
  agencia: textoOpc,
  conta: textoOpc,
  saldo_inicial: dinheiroOpc.transform((v) => v ?? 0),
  data_saldo_inicial: dataOpc,
  ativa: z.preprocess((v) => v !== "false", z.boolean()),
  observacoes: textoOpc,
});

export const esquemaBaixa = z.object({
  id: z.uuid(),
  data_pagamento: dataOpc.refine((v) => !!v, "Informe a data."),
  conta_id: z.uuid("Escolha a conta."),
  forma_pagamento: z.preprocess((v) => (v === "" ? null : v), z.enum(FORMAS).nullable().optional()),
  valor: dinheiroOpc,
});

export const esquemaTransferencia = z
  .object({
    origem: z.uuid("Escolha a conta de origem."),
    destino: z.uuid("Escolha a conta de destino."),
    valor: dinheiroObrig,
    data: dataOpc,
    descricao: textoOpc,
  })
  .refine((t) => t.origem !== t.destino, { path: ["destino"], message: "Escolha contas diferentes." });

export const esquemaCategoria = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  tipo: z.enum(["receita", "despesa"]),
  grupo: z.string().trim().min(2, "Informe o grupo."),
  natureza: z.enum(["operacional", "terceiros", "estoque"]),
  ativa: z.preprocess((v) => v !== "false", z.boolean()),
});

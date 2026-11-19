import { z } from "zod";
import { dinheiroObrig, dinheiroOpc, dataOpc, uuidOpc, textoOpc, inteiroOpc } from "@/lib/estoque/esquemas";
import { normalizarPlaca, validarPlaca } from "@/lib/format/veiculo";

export const esquemaPagamento = z
  .object({
    forma: z.enum(["dinheiro", "pix", "ted", "cartao_credito", "cartao_debito", "financiamento", "boleto", "cheque"]),
    valor: dinheiroObrig,
    banco_financiamento: textoOpc,
    parcelas: inteiroOpc(1, 120, "Parcelas entre 1 e 120."),
    data_prevista: dataOpc,
    recebido: z.boolean().default(false),
    conta_id: uuidOpc,
  })
  .refine((p) => p.forma !== "financiamento" || p.banco_financiamento, { path: ["banco_financiamento"], message: "Informe o banco do financiamento." })
  .refine((p) => !p.recebido || p.conta_id, { path: ["conta_id"], message: "Informe a conta em que entrou." });

export const esquemaTroca = z.object({
  placa: z
    .preprocess((v) => (v === "" ? null : v), z.string().nullable().optional())
    .transform((v) => (v ? normalizarPlaca(v) : null))
    .refine((v) => !v || validarPlaca(v), "Placa inválida."),
  marca: z.string().trim().min(2, "Marca do carro da troca."),
  modelo: z.string().trim().min(1, "Modelo do carro da troca."),
  versao: textoOpc,
  motor: textoOpc,
  ano_fabricacao: inteiroOpc(1900, 2100, "Ano inválido."),
  ano_modelo: inteiroOpc(1900, 2100, "Ano inválido."),
  cor: textoOpc,
  km: inteiroOpc(0, 3_000_000, "Km inválido."),
  combustivel: z.preprocess((v) => (v === "" ? null : v), z.enum(["flex", "gasolina", "etanol", "diesel", "gnv", "hibrido", "eletrico"]).nullable().optional()),
  cambio: z.preprocess((v) => (v === "" ? null : v), z.enum(["manual", "automatico", "cvt", "automatizado"]).nullable().optional()),
  codigo_fipe: textoOpc,
  valor_fipe: dinheiroOpc,
  valor_avaliacao: dinheiroObrig,
  observacoes: textoOpc,
});

export const esquemaVenda = z.object({
  veiculo_id: z.uuid("Escolha o carro."),
  cliente_id: z.uuid("Escolha o cliente."),
  vendedor_id: uuidOpc,
  parceiro_id: uuidOpc,
  data_venda: dataOpc,
  valor_venda: dinheiroObrig,
  valor_entrada: dinheiroOpc.transform((v) => v ?? 0),
  garantia_dias: inteiroOpc(0, 3650, "Prazo inválido."),
  garantia_cobertura: textoOpc,
  recebimento_consignado: z.preprocess((v) => (v === "" ? null : v), z.enum(["loja_repassa", "direto_dono"]).nullable().optional()),
  observacoes: textoOpc,
});

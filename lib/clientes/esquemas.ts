import { z } from "zod";
import { apenasDigitos } from "@/lib/utils";
import { validarCPF } from "@/lib/format/documentos";
import { campoTelefone, campoEmail, campoUF } from "@/lib/cadastros/esquemas";
import { textoOpc, dataOpc, uuidOpc, dinheiroOpc } from "@/lib/estoque/esquemas";

export const esquemaCliente = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome."),
    telefone: campoTelefone,
    whatsapp: campoTelefone,
    email: campoEmail,
    cidade: textoOpc,
    uf: campoUF,
    origem: z.enum(["instagram", "marketplace", "olx", "indicacao", "loja", "site", "whatsapp", "outro"]),
    parceiro_id: uuidOpc,
    vendedor_id: uuidOpc,
    aceita_marketing: z.preprocess((v) => v === "true" || v === "on", z.boolean()),
    observacoes: textoOpc,
  })
  .refine((c) => c.telefone || c.whatsapp || c.email, { path: ["telefone"], message: "Informe ao menos um contato (telefone, WhatsApp ou e-mail)." });

export const esquemaDadosPessoais = z.object({
  cpf: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? apenasDigitos(v) : ""))
    .refine((v) => v === "" || validarCPF(v), "CPF inválido.")
    .transform((v) => (v === "" ? null : v)),
  rg: textoOpc,
  data_nascimento: dataOpc,
  cep: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? apenasDigitos(v) : ""))
    .refine((v) => v === "" || v.length === 8, "CEP com 8 dígitos.")
    .transform((v) => (v === "" ? null : v)),
  logradouro: textoOpc,
  numero: textoOpc,
  complemento: textoOpc,
  bairro: textoOpc,
  cidade_endereco: textoOpc,
  uf_endereco: campoUF,
});

export const esquemaContato = z.object({
  cliente_id: z.uuid(),
  canal: z.enum(["whatsapp", "ligacao", "loja", "instagram", "email", "outro"]),
  resumo: z.string().trim().min(2, "Descreva o contato."),
  proximo_passo: textoOpc,
  proximo_contato_em: dataOpc,
});

export const esquemaInteresse = z
  .object({
    cliente_id: z.uuid(),
    veiculo_id: uuidOpc,
    descricao: textoOpc,
    preco_max: dinheiroOpc,
  })
  .refine((i) => i.veiculo_id || (i.descricao && i.descricao.length >= 2), { path: ["descricao"], message: "Escolha um carro do estoque ou descreva o interesse." });

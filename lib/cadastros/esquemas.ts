import { z } from "zod";
import { apenasDigitos } from "@/lib/utils";
import { validarDocumento } from "@/lib/format/documentos";

const opcional = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

export const campoDocumento = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? apenasDigitos(v) : ""))
  .refine((v) => v === "" || validarDocumento(v), "CPF ou CNPJ inválido.")
  .transform((v) => (v === "" ? null : v));

export const campoTelefone = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? apenasDigitos(v) : ""))
  .refine((v) => v === "" || v.length === 10 || v.length === 11, "Telefone com DDD (10 ou 11 dígitos).")
  .transform((v) => (v === "" ? null : v));

export const campoEmail = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v.trim().toLowerCase() : ""))
  .refine((v) => v === "" || z.email().safeParse(v).success, "E-mail inválido.")
  .transform((v) => (v === "" ? null : v));

export const campoUF = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v.trim().toUpperCase() : ""))
  .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "UF com 2 letras.")
  .transform((v) => (v === "" ? null : v));

const base = {
  nome: z.string().trim().min(2, "Informe o nome."),
  documento: campoDocumento,
  telefone: campoTelefone,
  whatsapp: campoTelefone,
  email: campoEmail,
  cidade: opcional,
  chave_pix: opcional,
  observacoes: opcional,
  ativo: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
};

export const esquemaFornecedor = z.object({
  ...base,
  tipo: z.enum(["locadora", "lojista", "particular", "oficina", "despachante", "outro"], { message: "Escolha o tipo." }),
  razao_social: opcional,
  contato_nome: opcional,
  uf: campoUF,
  dados_bancarios: opcional,
});

export const esquemaConsignante = z.object({
  ...base,
  uf: campoUF,
  endereco: opcional,
  dados_bancarios: opcional,
});

export const esquemaParceiro = z.object({
  ...base,
  tipo: z.enum(["indicacao", "corretor", "outro"], { message: "Escolha o tipo." }),
});

export const TIPOS_FORNECEDOR = {
  locadora: "Locadora",
  lojista: "Lojista",
  particular: "Particular",
  oficina: "Oficina",
  despachante: "Despachante",
  outro: "Outro",
} as const;

export const TIPOS_PARCEIRO = {
  indicacao: "Indicação",
  corretor: "Corretor",
  outro: "Outro",
} as const;

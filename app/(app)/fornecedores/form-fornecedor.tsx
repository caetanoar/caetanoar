"use client";

import { FormPessoa } from "@/components/cadastros/form-pessoa";
import { TIPOS_FORNECEDOR } from "@/lib/cadastros/esquemas";
import { salvarFornecedor } from "./acoes";

export function FormFornecedor({ valores }: { valores?: Record<string, string | boolean | null> }) {
  return (
    <FormPessoa
      acao={salvarFornecedor}
      valores={valores}
      config={{ tipos: TIPOS_FORNECEDOR, razaoSocial: true, contato: true, uf: true, dadosBancarios: true }}
      destinoAposSalvar={(id) => `/fornecedores/${id}`}
    />
  );
}

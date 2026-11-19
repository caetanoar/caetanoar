"use client";

import { FormPessoa } from "@/components/cadastros/form-pessoa";
import { TIPOS_PARCEIRO } from "@/lib/cadastros/esquemas";
import { salvarParceiro } from "./acoes";

export function FormParceiro({ valores }: { valores?: Record<string, string | boolean | null> }) {
  return (
    <FormPessoa
      acao={salvarParceiro}
      valores={{ tipo: "indicacao", ...valores }}
      config={{ tipos: TIPOS_PARCEIRO }}
      destinoAposSalvar={(id) => `/parceiros/${id}`}
    />
  );
}

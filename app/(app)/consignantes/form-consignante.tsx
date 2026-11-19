"use client";

import { FormPessoa } from "@/components/cadastros/form-pessoa";
import { salvarConsignante } from "./acoes";

export function FormConsignante({ valores }: { valores?: Record<string, string | boolean | null> }) {
  return (
    <FormPessoa
      acao={salvarConsignante}
      valores={valores}
      config={{ uf: true, endereco: true, dadosBancarios: true, rotuloNome: "Nome do dono do carro" }}
      destinoAposSalvar={(id) => `/consignantes/${id}`}
    />
  );
}

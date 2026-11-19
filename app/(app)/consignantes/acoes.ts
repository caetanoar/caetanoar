"use server";

import { exigirPermissao } from "@/lib/auth/sessao";
import { esquemaConsignante } from "@/lib/cadastros/esquemas";
import { salvarCadastro, excluirCadastro } from "@/lib/cadastros/acoes-base";
import type { EstadoAcao } from "@/lib/acoes";

export async function salvarConsignante(_: EstadoAcao<{ id: string }>, fd: FormData) {
  await exigirPermissao("consignantes");
  return salvarCadastro("consignantes", esquemaConsignante, fd, "Consignante");
}

export async function excluirConsignante(_: EstadoAcao, fd: FormData) {
  await exigirPermissao("consignantes");
  return excluirCadastro("consignantes", fd, "Consignante");
}

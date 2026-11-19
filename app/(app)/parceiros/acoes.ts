"use server";

import { exigirPermissao } from "@/lib/auth/sessao";
import { esquemaParceiro } from "@/lib/cadastros/esquemas";
import { salvarCadastro, excluirCadastro } from "@/lib/cadastros/acoes-base";
import type { EstadoAcao } from "@/lib/acoes";

export async function salvarParceiro(_: EstadoAcao<{ id: string }>, fd: FormData) {
  await exigirPermissao("parceiros");
  return salvarCadastro("parceiros", esquemaParceiro, fd, "Parceiro");
}

export async function excluirParceiro(_: EstadoAcao, fd: FormData) {
  await exigirPermissao("parceiros");
  return excluirCadastro("parceiros", fd, "Parceiro");
}

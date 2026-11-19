"use server";

import { exigirPermissao } from "@/lib/auth/sessao";
import { esquemaFornecedor } from "@/lib/cadastros/esquemas";
import { salvarCadastro, excluirCadastro } from "@/lib/cadastros/acoes-base";
import type { EstadoAcao } from "@/lib/acoes";

export async function salvarFornecedor(_: EstadoAcao<{ id: string }>, fd: FormData) {
  await exigirPermissao("fornecedores");
  return salvarCadastro("fornecedores", esquemaFornecedor, fd, "Fornecedor");
}

export async function excluirFornecedor(_: EstadoAcao, fd: FormData) {
  await exigirPermissao("fornecedores");
  return excluirCadastro("fornecedores", fd, "Fornecedor");
}

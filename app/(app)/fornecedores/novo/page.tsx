import { exigirPermissao } from "@/lib/auth/sessao";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormFornecedor } from "../form-fornecedor";

export default async function NovoFornecedor({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  await exigirPermissao("fornecedores");
  const { tipo } = await searchParams;
  return (
    <>
      <Cabecalho titulo="Novo fornecedor" voltar="/fornecedores" />
      <Conteudo className="max-w-3xl"><FormFornecedor valores={{ tipo: tipo ?? "" }} /></Conteudo>
    </>
  );
}

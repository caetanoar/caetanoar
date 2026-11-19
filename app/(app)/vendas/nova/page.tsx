import { exigirPermissao } from "@/lib/auth/sessao";
import { opcoesVenda } from "@/lib/vendas/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormVenda } from "../form-venda";

export default async function NovaVenda({ searchParams }: { searchParams: Promise<{ veiculo?: string; cliente?: string }> }) {
  const usuario = await exigirPermissao("vendas");
  const { veiculo, cliente } = await searchParams;
  const opcoes = await opcoesVenda(usuario);
  return (
    <>
      <Cabecalho titulo="Registrar venda" voltar="/vendas" />
      <Conteudo className="max-w-3xl">
        <FormVenda {...opcoes} valores={{ veiculo_id: veiculo, cliente_id: cliente }} />
      </Conteudo>
    </>
  );
}

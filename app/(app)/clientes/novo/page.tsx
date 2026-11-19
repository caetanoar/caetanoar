import { exigirPermissao } from "@/lib/auth/sessao";
import { opcoesCliente } from "@/lib/clientes/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormCliente } from "../form-cliente";

export default async function NovoCliente({ searchParams }: { searchParams: Promise<{ veiculo?: string }> }) {
  const usuario = await exigirPermissao("clientes");
  await searchParams;
  const opcoes = await opcoesCliente();
  return (
    <>
      <Cabecalho titulo="Novo cliente" voltar="/clientes" />
      <Conteudo className="max-w-3xl">
        <FormCliente {...opcoes} podeAtribuir={usuario.papel !== "vendedor"} valores={{ vendedor_id: usuario.papel === "vendedor" ? usuario.id : "" }} />
      </Conteudo>
    </>
  );
}

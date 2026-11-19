import { exigirPermissao } from "@/lib/auth/sessao";
import { opcoesCadastro } from "@/lib/estoque/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormVeiculo } from "../form-veiculo";

export default async function NovoVeiculo({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const usuario = await exigirPermissao("estoque.gerenciar");
  const { tipo } = await searchParams;
  const opcoes = await opcoesCadastro();
  return (
    <>
      <Cabecalho titulo="Cadastrar veículo" voltar="/estoque" />
      <Conteudo className="max-w-3xl">
        <FormVeiculo valores={{ tipo: tipo === "consignado" ? "consignado" : "proprio" }} {...opcoes} eDono={usuario.papel === "dono"} />
      </Conteudo>
    </>
  );
}

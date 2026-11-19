import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth/sessao";
import { carregarVeiculoGestao, opcoesCadastro } from "@/lib/estoque/consultas";
import { nomeVeiculo } from "@/lib/estoque/rotulos";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormVeiculo } from "../../form-veiculo";

export default async function EditarVeiculo({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPermissao("estoque.gerenciar");
  const { id } = await params;
  const [dados, opcoes] = await Promise.all([carregarVeiculoGestao(id), opcoesCadastro()]);
  if (!dados) notFound();
  const { veiculo, consignacao } = dados;
  const { pendencias: _pendencias, ...dadosVeiculo } = veiculo;
  void _pendencias;
  const valores = {
    ...dadosVeiculo,
    consignante_id: consignacao?.consignante_id,
    valor_minimo_dono: consignacao?.valor_minimo_dono,
    consignacao_inicio: consignacao?.data_inicio,
    consignacao_fim: consignacao?.data_fim,
    recebimento_padrao: consignacao?.recebimento_padrao,
    consignacao_observacoes: consignacao?.observacoes,
  };
  return (
    <>
      <Cabecalho titulo="Editar veículo" subtitulo={nomeVeiculo({ marca: veiculo.marca!, modelo: veiculo.modelo!, versao: veiculo.versao })} voltar={`/estoque/${id}`} />
      <Conteudo className="max-w-3xl">
        <FormVeiculo valores={valores} {...opcoes} eDono={usuario.papel === "dono"} />
      </Conteudo>
    </>
  );
}

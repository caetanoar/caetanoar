import { exigirPermissao } from "@/lib/auth/sessao";
import { opcoesFinanceiro } from "@/lib/financeiro/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Alerta } from "@/components/ui/misc";
import { FormLancamento } from "./form-lancamento";

export default async function NovoLancamento({ searchParams }: { searchParams: Promise<{ tipo?: string; veiculo?: string }> }) {
  await exigirPermissao("financeiro");
  const { tipo, veiculo } = await searchParams;
  const opcoes = await opcoesFinanceiro();
  return (
    <>
      <Cabecalho titulo="Novo lançamento" voltar="/financeiro" />
      <Conteudo className="flex max-w-3xl flex-col gap-3">
        {opcoes.contas.length === 0 && <Alerta variante="aviso">Cadastre o caixa e as contas bancárias em Financeiro › Contas para poder dar baixa nos pagamentos.</Alerta>}
        <FormLancamento opcoes={opcoes} tipoInicial={tipo === "receita" ? "receita" : "despesa"} veiculoId={veiculo} />
      </Conteudo>
    </>
  );
}

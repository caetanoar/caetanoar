import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BotaoBaixar } from "@/components/financeiro/baixar";
import { BotaoExcluir } from "@/components/cadastros/botao-excluir";
import { STATUS_LANCAMENTO, TIPO_LANCAMENTO, FORMA_PAGAMENTO, NATUREZA } from "@/lib/financeiro/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { estornarBaixa, cancelarLancamento, excluirLancamento } from "../../acoes";

export default async function DetalheLancamento({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPermissao("financeiro");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const [{ data: l }, { data: contas }] = await Promise.all([
    supabase.from("v_lancamentos").select("*").eq("id", id).maybeSingle(),
    supabase.from("contas_financeiras").select("id, nome").eq("ativa", true).order("nome"),
  ]);
  if (!l || !l.id) notFound();
  const st = STATUS_LANCAMENTO[l.status!];
  return (
    <>
      <Cabecalho titulo={l.descricao!} subtitulo={TIPO_LANCAMENTO[l.tipo!]} voltar="/financeiro/lancamentos" />
      <Conteudo className="flex max-w-2xl flex-col gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="numero text-2xl font-bold">{formatarMoeda(l.valor)}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={st.variante}>{st.rotulo}</Badge>
              {l.vencido && <Badge variant="destructive">Vencido</Badge>}
              {l.conciliado && <Badge variant="info">Conciliado</Badge>}
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-2">
          {l.status === "pendente" && (l.tipo === "receita" || l.tipo === "despesa") && (
            <BotaoBaixar id={l.id} descricao={l.descricao!} valor={Number(l.valor)} tipo={l.tipo} contaId={l.conta_id} forma={l.forma_pagamento} contas={contas ?? []} />
          )}
          {l.status === "pago" && !l.transferencia_id && (
            <BotaoExcluir id={l.id} acao={estornarBaixa} rotulo="Estornar baixa" titulo="Estornar a baixa?" descricao="O lançamento volta a pendente e sai do saldo da conta." />
          )}
          {l.status === "pendente" && !l.venda_id && !l.custo_veiculo_id && (
            <BotaoExcluir id={l.id} acao={cancelarLancamento} rotulo="Cancelar" titulo="Cancelar lançamento?" descricao="Fica no histórico como cancelado, fora dos saldos e relatórios." />
          )}
        </div>
        <Card>
          <CardContent className="p-4">
            <ListaDados
              itens={[
                { rotulo: "Categoria", valor: l.categoria_nome },
                { rotulo: "Natureza", valor: l.natureza && NATUREZA[l.natureza] },
                { rotulo: "Vencimento", valor: formatarData(l.data_vencimento) },
                { rotulo: "Competência", valor: formatarData(l.data_competencia) },
                { rotulo: "Pagamento", valor: l.data_pagamento && formatarData(l.data_pagamento) },
                { rotulo: "Conta", valor: l.conta_nome },
                { rotulo: "Forma", valor: l.forma_pagamento && FORMA_PAGAMENTO[l.forma_pagamento] },
                { rotulo: "Parcela", valor: l.parcela_numero && `${l.parcela_numero} de ${l.parcela_total}` },
                { rotulo: "Pessoa", valor: l.pessoa },
                { rotulo: "Veículo", valor: l.veiculo_id ? <Link href={`/estoque/${l.veiculo_id}`} className="text-primary hover:underline">{l.veiculo_nome}</Link> : null },
                { rotulo: "Venda", valor: l.venda_id ? <Link href={`/vendas/${l.venda_id}`} className="text-primary hover:underline">Ver venda</Link> : null },
                { rotulo: "Observações", valor: l.observacoes, largo: true },
              ]}
            />
            {usuario.papel === "dono" && (
              <Link href={`/configuracoes/auditoria?registro=${id}`} className="mt-4 inline-block text-sm text-primary hover:underline">Histórico de alterações</Link>
            )}
          </CardContent>
        </Card>
        {l.status !== "pago" && !l.venda_id && !l.custo_veiculo_id && !l.transferencia_id && (
          <div className="flex justify-end">
            <BotaoExcluir id={l.id} acao={excluirLancamento} destino="/financeiro/lancamentos" titulo="Excluir lançamento?" />
          </div>
        )}
      </Conteudo>
    </>
  );
}

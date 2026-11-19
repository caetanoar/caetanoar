import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ShieldCheck, Car, Lock, Coins, Receipt, Paperclip, FileText } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarAnexos } from "@/lib/arquivos/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alerta } from "@/components/ui/misc";
import { Anexos } from "@/components/arquivos/anexos";
import { BotaoExcluir } from "@/components/cadastros/botao-excluir";
import { STATUS_VENDA, FORMA_VENDA, TIPO_COMISSAO, STATUS_COMISSAO, BASE_COMISSAO } from "@/lib/vendas/rotulos";
import { RECEBIMENTO_CONSIGNADO } from "@/lib/estoque/rotulos";
import { STATUS_LANCAMENTO } from "@/lib/financeiro/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarPlaca } from "@/lib/format/veiculo";
import { FecharVenda, CancelarVenda } from "./acoes-venda";
import { excluirVenda } from "../acoes";

type Calculo = {
  tipo: "proprio" | "consignado";
  recebimento: "loja_repassa" | "direto_dono" | null;
  valor_compra: number | null;
  custos: number;
  custos_cobrados_consignante: number;
  comissao_loja: { valor: number; regra_nome?: string; manual: boolean } | null;
  comissao_vendedor: { valor: number; regra_nome?: string; manual: boolean; base?: number; base_calculo?: string } | null;
  comissao_parceiro: { valor: number; regra_nome?: string; manual: boolean } | null;
  repasse_consignante: number | null;
  lucro: number;
  lucro_apos_indicacao: number;
  erros: string[];
  avisos: string[];
};

export default async function DetalheVenda({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPermissao("vendas");
  const gestor = usuario.papel !== "vendedor";
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const [{ data: v }, { data: pagamentos }, { data: trocas }] = await Promise.all([
    supabase.from("v_vendas").select("*").eq("id", id).maybeSingle(),
    supabase.from("vendas_pagamentos").select("*").eq("venda_id", id).order("criado_em"),
    supabase.from("vendas_trocas").select("*").eq("venda_id", id).order("criado_em"),
  ]);
  if (!v || !v.id) notFound();
  const st = STATUS_VENDA[v.status!];
  const aberta = v.status === "aguardando_aprovacao" || v.status === "rascunho";
  const podeEditar = aberta && (gestor || v.vendedor_id === usuario.id);

  let calculo: Calculo | null = null;
  let erroCalculo: string | null = null;
  if (gestor && aberta) {
    const { data, error } = await supabase.rpc("calcular_venda", { p_venda: id });
    if (error) erroCalculo = error.message;
    else calculo = data as unknown as Calculo;
  }
  const [comissoes, lancamentos, garantia, minhas, anexos] = await Promise.all([
    gestor ? supabase.from("comissoes").select("*").eq("venda_id", id).order("tipo").then((r) => r.data ?? []) : Promise.resolve([]),
    gestor ? supabase.from("v_lancamentos").select("id, descricao, tipo, valor, status, data_vencimento, forma_pagamento, categoria_nome").eq("venda_id", id).order("tipo").then((r) => r.data ?? []) : Promise.resolve([]),
    gestor ? supabase.from("v_garantias").select("id, data_fim, status, dias").eq("venda_id", id).maybeSingle().then((r) => r.data) : Promise.resolve(null),
    !gestor ? supabase.rpc("minhas_comissoes").then((r) => (r.data ?? []).filter((c) => c.venda_id === id)) : Promise.resolve([]),
    carregarAnexos("venda", id),
  ]);

  return (
    <>
      <Cabecalho
        titulo={`Venda ${v.numero}`}
        subtitulo={v.veiculo_nome}
        voltar="/vendas"
        acoes={podeEditar && <Button asChild size="sm" variant="outline"><Link href={`/vendas/${id}/editar`}><Pencil /> Editar</Link></Button>}
      />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={st.variante}>{st.rotulo}</Badge>
          <Badge variant="outline">{v.tipo_veiculo === "consignado" ? "Consignado" : "Próprio"}</Badge>
          {v.abaixo_negociavel && <Badge variant="warning">Abaixo do negociável</Badge>}
        </div>
        {v.status === "aguardando_aprovacao" && !gestor && <Alerta variante="info">Venda enviada. O gerente vai conferir e fechar. O carro está reservado para o seu cliente.</Alerta>}
        {v.status === "cancelada" && <Alerta variante="erro" titulo="Venda cancelada">{v.motivo_cancelamento} {v.cancelada_em && `· ${formatarDataHora(v.cancelada_em)}`}</Alerta>}

        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor da venda</p>
              <p className="numero text-2xl font-bold">{formatarMoeda(v.valor_venda)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entrada</p>
              <p className="numero text-lg font-semibold">{formatarMoeda(v.valor_entrada)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <ListaDados
              itens={[
                { rotulo: "Carro", valor: <Link href={`/estoque/${v.veiculo_id}`} className="text-primary hover:underline">{v.veiculo_nome}{v.veiculo_placa ? ` · ${formatarPlaca(v.veiculo_placa)}` : ""}</Link> },
                { rotulo: "Cliente", valor: <Link href={`/clientes/${v.cliente_id}`} className="text-primary hover:underline">{v.cliente_nome}</Link> },
                { rotulo: "Vendedor", valor: v.vendedor_nome },
                { rotulo: "Data", valor: formatarData(v.data_venda) },
                { rotulo: "Garantia", valor: `${v.garantia_dias ?? 0} dias` },
                { rotulo: "Recebimento", valor: v.recebimento_consignado ? RECEBIMENTO_CONSIGNADO[v.recebimento_consignado] : v.tipo_veiculo === "consignado" ? "Padrão" : null },
                { rotulo: "Cobertura", valor: v.garantia_cobertura, largo: true },
                { rotulo: "Observações", valor: v.observacoes, largo: true },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Receipt className="size-4" /> Pagamento</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(pagamentos ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>
                  {FORMA_VENDA[p.forma]}
                  {p.banco_financiamento && ` · ${p.banco_financiamento}`}
                  {p.parcelas && ` · ${p.parcelas}x`}
                  {p.data_prevista && <span className="text-muted-foreground"> · previsto {formatarData(p.data_prevista)}</span>}
                  {p.recebido && <Badge variant="success" className="ml-1.5">recebido</Badge>}
                </span>
                <span className="numero font-semibold">{formatarMoeda(p.valor)}</span>
              </div>
            ))}
            {(trocas ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <Car className="size-4" /> Troca: {t.marca} {t.modelo} {t.ano_modelo ?? ""} {t.placa && `· ${formatarPlaca(t.placa)}`}
                  {t.veiculo_id && <Link href={`/estoque/${t.veiculo_id}`} className="text-primary hover:underline">(no estoque)</Link>}
                </span>
                <span className="numero font-semibold">{formatarMoeda(t.valor_avaliacao)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {gestor && aberta && (
          <Card className="border-primary/40">
            <CardHeader><CardTitle className="flex items-center gap-1.5"><Lock className="size-4" /> Conferência e fechamento</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {erroCalculo && <Alerta variante="erro">{erroCalculo}</Alerta>}
              {calculo && (
                <>
                  {calculo.avisos.map((a) => <Alerta key={a} variante="aviso">{a}</Alerta>)}
                  <ListaDados
                    itens={[
                      ...(calculo.tipo === "proprio"
                        ? [
                            { rotulo: "Custo de compra", valor: formatarMoeda(calculo.valor_compra) },
                            { rotulo: "Custos de preparação", valor: formatarMoeda(calculo.custos) },
                          ]
                        : [
                            { rotulo: "Comissão da loja", valor: calculo.comissao_loja ? `${formatarMoeda(calculo.comissao_loja.valor)} · ${calculo.comissao_loja.regra_nome ?? "manual"}` : "sem regra" },
                            { rotulo: "Repasse ao dono", valor: formatarMoeda(calculo.repasse_consignante) },
                            { rotulo: "Custos absorvidos pela loja", valor: formatarMoeda(calculo.custos - calculo.custos_cobrados_consignante) },
                          ]),
                      { rotulo: "Comissão do vendedor", valor: calculo.comissao_vendedor ? `${formatarMoeda(calculo.comissao_vendedor.valor)} · ${calculo.comissao_vendedor.regra_nome ?? "manual"}${calculo.comissao_vendedor.base_calculo ? ` (sobre ${BASE_COMISSAO[calculo.comissao_vendedor.base_calculo as keyof typeof BASE_COMISSAO]?.toLowerCase()})` : ""}` : "sem regra" },
                      ...(calculo.comissao_parceiro !== null ? [{ rotulo: "Comissão de indicação", valor: `${formatarMoeda(calculo.comissao_parceiro.valor)} · ${calculo.comissao_parceiro.regra_nome ?? "manual"}` }] : []),
                      { rotulo: "Lucro da venda", valor: <span className={`numero font-semibold ${calculo.lucro < 0 ? "text-destructive" : "text-success"}`}>{formatarMoeda(calculo.lucro)}</span> },
                      ...(calculo.comissao_parceiro !== null ? [{ rotulo: "Lucro após indicação", valor: formatarMoeda(calculo.lucro_apos_indicacao) }] : []),
                    ]}
                  />
                  <FecharVenda
                    id={id}
                    consignado={calculo.tipo === "consignado"}
                    recebimento={calculo.recebimento}
                    pedirLoja={calculo.tipo === "consignado" && !calculo.comissao_loja}
                    pedirVendedor={!calculo.comissao_vendedor}
                    pedirParceiro={calculo.erros.some((e) => e.includes("parceiro"))}
                    errosBloqueantes={calculo.erros.filter((e) => !e.includes("informe o valor"))}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {gestor && v.status === "fechada" && (
          <>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-1.5"><Coins className="size-4" /> Comissões</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {comissoes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span>{TIPO_COMISSAO[c.tipo]} <span className="text-muted-foreground">{c.direcao === "a_receber" ? "(a receber)" : "(a pagar)"}</span> {c.manual && <Badge variant="outline">manual</Badge>}</span>
                    <span className="flex items-center gap-2"><span className="numero font-semibold">{formatarMoeda(c.valor)}</span><Badge variant={STATUS_COMISSAO[c.status].variante}>{STATUS_COMISSAO[c.status].rotulo}</Badge></span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Lançamentos gerados</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {lancamentos.map((l) => (
                  <Link key={l.id} href={`/financeiro/lancamentos/${l.id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
                    <span className="min-w-0 flex-1 truncate">{l.descricao}</span>
                    <span className="flex items-center gap-2"><span className="numero">{l.tipo === "receita" ? "+" : "−"} {formatarMoeda(l.valor)}</span><Badge variant={STATUS_LANCAMENTO[l.status!].variante}>{STATUS_LANCAMENTO[l.status!].rotulo}</Badge></span>
                  </Link>
                ))}
              </CardContent>
            </Card>
            <NotaDaVenda vendaId={id} />
            {garantia && (
              <Link href={`/garantias/${garantia.id}`} className="flex items-center gap-2 rounded-xl border bg-card p-4 hover:bg-secondary/60">
                <ShieldCheck className="size-5 text-success" />
                <span className="flex-1 text-sm">Garantia de {garantia.dias} dias, até {formatarData(garantia.data_fim)}</span>
                <Badge variant="success">{garantia.status}</Badge>
              </Link>
            )}
          </>
        )}

        {!gestor && minhas.length > 0 && (
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <span className="flex items-center gap-1.5 text-sm"><Coins className="size-4" /> Sua comissão</span>
              <span className="flex items-center gap-2"><span className="numero font-semibold">{formatarMoeda(minhas[0].valor)}</span><Badge variant={STATUS_COMISSAO[minhas[0].status].variante}>{STATUS_COMISSAO[minhas[0].status].rotulo}</Badge></span>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Paperclip className="size-4" /> Documentos da venda</CardTitle></CardHeader>
          <CardContent>
            <Anexos entidade="venda" entidadeId={id} anexos={anexos} podeEnviar={gestor} revalidar={`/vendas/${id}`} />
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          {gestor && v.status !== "cancelada" && <CancelarVenda id={id} fechada={v.status === "fechada"} />}
          {aberta && (gestor || v.vendedor_id === usuario.id) && (
            <BotaoExcluir id={id} acao={excluirVenda} destino="/vendas" titulo="Excluir venda?" descricao="A venda some e o carro volta a ficar disponível." />
          )}
        </div>
      </Conteudo>
    </>
  );
}

async function NotaDaVenda({ vendaId }: { vendaId: string }) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("notas_fiscais").select("id, numero, status, simulada").eq("venda_id", vendaId).eq("direcao", "saida").order("criado_em", { ascending: false }).limit(1).maybeSingle();
  if (data && data.status !== "rejeitada" && data.status !== "cancelada") {
    return (
      <Link href={`/fiscal/${data.id}`} className="flex items-center gap-2 rounded-xl border bg-card p-4 hover:bg-secondary/60">
        <FileText className="size-5 text-primary" />
        <span className="flex-1 text-sm">NF-e {data.numero ?? ""} {data.simulada ? "(simulada)" : ""}</span>
        <Badge variant={data.status === "autorizada" ? "success" : "warning"}>{data.status}</Badge>
      </Link>
    );
  }
  return (
    <Button asChild variant="outline"><Link href={`/fiscal/emitir?venda=${vendaId}`}><FileText /> Emitir NF-e de venda</Link></Button>
  );
}

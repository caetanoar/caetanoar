import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, MessageCircle, AlertTriangle, Lock, CalendarClock, History, Handshake, ScanSearch, Receipt } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarVeiculoGestao, carregarVeiculoPublico, urlFoto } from "@/lib/estoque/consultas";
import { STATUS_VEICULO, TIPO_VEICULO, ORIGEM_VEICULO, RESULTADO_LAUDO, RECEBIMENTO_CONSIGNADO, nomeVeiculo } from "@/lib/estoque/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, diasEntre } from "@/lib/format/data";
import { formatarPlaca, formatarKm, formatarAno, COMBUSTIVEIS, CAMBIOS } from "@/lib/format/veiculo";
import { linkWhatsApp, mensagemVeiculo } from "@/lib/whatsapp";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { AbasLink } from "@/components/app/abas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alerta } from "@/components/ui/misc";
import { CarrosselFotos, FotosVeiculo } from "@/components/estoque/fotos";
import { DocumentosVeiculo } from "@/components/estoque/documentos";
import { ItensVeiculo, HistoricoVeiculo } from "@/components/estoque/itens-historico";
import { CustosVeiculo } from "@/components/estoque/custos";
import { AcoesStatus } from "@/components/estoque/status-veiculo";
import { EnviarContrato } from "@/components/estoque/contrato-consignacao";
import { BotaoExcluir } from "@/components/cadastros/botao-excluir";
import { excluirVeiculo } from "../acoes";
import { AnunciosVeiculo } from "@/components/ia/anuncios";
import { TarefasDaEntidade, ChecklistCard } from "@/components/tarefas/blocos";
import { ultimaConsulta } from "@/lib/consulta-veicular/consultas";
import { SeloConsulta } from "@/components/consulta/selo";
import { ultimoAnuncio } from "@/lib/ia/consultas";
import { situacaoIA } from "@/lib/ia/claude";

type Aba = "dados" | "fotos" | "itens" | "documentos" | "anuncios" | "preparacao" | "custos" | "consignacao";

export default async function DetalheVeiculo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const usuario = await exigirPermissao("estoque");
  const gestor = pode(usuario.papel, "estoque.sigilo");
  const { id } = await params;
  const { aba: abaParam } = await searchParams;
  const supabase = await criarClienteServidor();

  const gestao = gestor ? await carregarVeiculoGestao(id) : null;
  const publico = gestor ? null : await carregarVeiculoPublico(id);
  const v = gestao?.veiculo ?? publico;
  if (!v || !v.id) notFound();
  const consignacao = gestao?.consignacao ?? null;

  const temChecklist = pode(usuario.papel, "preparacao")
    ? ((await supabase.from("checklist_itens").select("id", { count: "exact", head: true }).eq("veiculo_id", id).eq("tipo", "preparacao")).count ?? 0) > 0
    : false;

  const abas: { id: Aba; rotulo: string }[] = [
    { id: "dados", rotulo: "Dados" },
    { id: "fotos", rotulo: `Fotos (${v.qtd_fotos ?? 0})` },
    { id: "itens", rotulo: "Itens e histórico" },
    { id: "documentos", rotulo: "Documentos" },
    { id: "anuncios", rotulo: "Anúncios" },
    ...(pode(usuario.papel, "preparacao") && (v.status === "em_preparacao" || temChecklist) ? [{ id: "preparacao" as const, rotulo: "Preparação" }] : []),
    ...(gestor ? [{ id: "custos" as const, rotulo: "Custos" }] : []),
    ...(gestor && v.tipo === "consignado" ? [{ id: "consignacao" as const, rotulo: "Consignação" }] : []),
  ];
  const aba: Aba = abas.some((a) => a.id === abaParam) ? (abaParam as Aba) : "dados";

  const [{ data: fotosDb }, { data: config }] = await Promise.all([
    supabase.from("arquivos").select("id, path, capa, ordem").eq("entidade", "veiculo").eq("entidade_id", id).eq("categoria", "foto").order("ordem"),
    supabase.from("configuracoes").select("whatsapp_numero").single(),
  ]);
  const fotos = (fotosDb ?? []).map((f) => ({ id: f.id, url: urlFoto(f.path)!, capa: f.capa }));
  const nome = nomeVeiculo({ marca: v.marca!, modelo: v.modelo!, versao: v.versao });
  const status = STATUS_VEICULO[v.status!];
  const wa = linkWhatsApp(config?.whatsapp_numero ?? "5537991193815", mensagemVeiculo({ ...v, marca: v.marca!, modelo: v.modelo! }));
  const podeEditar = gestor && v.status !== "vendido";

  return (
    <>
      <Cabecalho
        titulo={nome}
        subtitulo={[formatarAno(v.ano_fabricacao, v.ano_modelo), v.cor, v.placa && formatarPlaca(v.placa)].filter(Boolean).join(" · ")}
        voltar="/estoque"
        acoes={podeEditar && <Button asChild size="sm" variant="outline"><Link href={`/estoque/${id}/editar`}><Pencil /> Editar</Link></Button>}
      />
      <Conteudo className="flex max-w-4xl flex-col gap-4">
        <CarrosselFotos fotos={fotos} alt={nome} />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variante}>{status.rotulo}</Badge>
          <Badge variant="outline">{TIPO_VEICULO[v.tipo!]}</Badge>
          <Badge variant="muted"><CalendarClock /> {v.dias_em_estoque} dias em estoque</Badge>
          {v.laudo_cautelar ? <Badge variant="success">Com laudo cautelar</Badge> : <Badge variant="muted">Sem laudo cautelar</Badge>}
        </div>

        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Preço anunciado</p>
              <p className="numero text-xl font-bold">{formatarMoeda(v.preco_anunciado)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor negociável</p>
              <p className="numero text-lg font-semibold">{formatarMoeda(v.preco_negociavel)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">FIPE</p>
              <p className="numero text-lg">{formatarMoeda(v.valor_fipe)}</p>
            </div>
            {gestao && (
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Preço mínimo</p>
                <p className="numero text-lg">{formatarMoeda(gestao.veiculo.preco_minimo)}</p>
              </div>
            )}
            {gestao && v.tipo === "proprio" && (
              <>
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Custo total</p>
                  <p className="numero text-lg">{formatarMoeda(gestao.veiculo.custo_total)}</p>
                  <p className="text-[11px] text-muted-foreground">compra {formatarMoeda(gestao.veiculo.valor_compra)} + custos {formatarMoeda(gestao.veiculo.custos_total)}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Margem prevista</p>
                  <p className={`numero text-lg font-semibold ${Number(gestao.veiculo.margem_prevista) < 0 ? "text-destructive" : "text-success"}`}>
                    {formatarMoeda(gestao.veiculo.margem_prevista)}
                  </p>
                </div>
              </>
            )}
            {gestao && v.tipo === "consignado" && (
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Mínimo do dono</p>
                <p className="numero text-lg">{formatarMoeda(gestao.veiculo.valor_minimo_dono)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {v.status !== "vendido" && v.status !== "devolvido" && pode(usuario.papel, "vendas") && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {wa && (
              <Button asChild variant="whatsapp" size="lg">
                <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> Chamar no WhatsApp</a>
              </Button>
            )}
            <VendaDoCarro veiculoId={id} />
            {pode(usuario.papel, "orcamentos") && v.status !== "reservado" && (
              <Button asChild variant="outline" size="lg" className="sm:col-span-2"><Link href={`/orcamentos/novo?veiculo=${id}`}><Receipt /> Criar orçamento</Link></Button>
            )}
          </div>
        )}

        {gestao && (gestao.veiculo.pendencias?.length ?? 0) > 0 && (
          <Alerta variante="aviso" titulo="Pendências do cadastro">
            <span className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> Falta: {gestao.veiculo.pendencias!.join(", ")}.</span>
          </Alerta>
        )}

        {gestor && <AcoesStatus id={id} status={v.status!} tipo={v.tipo!} />}

        <AbasLink abas={abas} atual={aba} base={`/estoque/${id}`} />

        {aba === "dados" && (
          <Card>
            <CardContent className="p-4">
              <ListaDados
                itens={[
                  { rotulo: "Marca", valor: v.marca },
                  { rotulo: "Modelo", valor: v.modelo },
                  { rotulo: "Versão", valor: v.versao },
                  { rotulo: "Motor", valor: v.motor },
                  { rotulo: "Ano", valor: formatarAno(v.ano_fabricacao, v.ano_modelo) },
                  { rotulo: "Cor", valor: v.cor },
                  { rotulo: "Km", valor: v.km !== null ? formatarKm(v.km) : null },
                  { rotulo: "Combustível", valor: v.combustivel && COMBUSTIVEIS[v.combustivel] },
                  { rotulo: "Câmbio", valor: v.cambio && CAMBIOS[v.cambio] },
                  { rotulo: "Portas", valor: v.portas },
                  { rotulo: "Placa", valor: v.placa && formatarPlaca(v.placa) },
                  { rotulo: "Chassi", valor: v.chassi },
                  { rotulo: "RENAVAM", valor: v.renavam },
                  { rotulo: "Código FIPE", valor: v.codigo_fipe && `${v.codigo_fipe}${v.fipe_referencia ? ` (${v.fipe_referencia})` : ""}` },
                  { rotulo: "Laudo cautelar", valor: v.laudo_cautelar ? (v.laudo_resultado ? RESULTADO_LAUDO[v.laudo_resultado] : "Sim") : "Não" },
                  { rotulo: "Origem", valor: ORIGEM_VEICULO[v.origem!] },
                  { rotulo: "Entrada", valor: formatarData(v.data_entrada) },
                  { rotulo: "Saída", valor: v.data_saida && formatarData(v.data_saida) },
                  { rotulo: "Descrição", valor: v.descricao, largo: true },
                  { rotulo: "Observações da equipe", valor: v.observacoes, largo: true },
                  ...(gestao && v.tipo === "proprio"
                    ? [
                        { rotulo: "Fornecedor", valor: gestao.veiculo.fornecedor_id ? <Link className="text-primary hover:underline" href={`/fornecedores/${gestao.veiculo.fornecedor_id}`}>{gestao.veiculo.fornecedor_nome}</Link> : null },
                        { rotulo: "Data da compra", valor: gestao.veiculo.data_compra && formatarData(gestao.veiculo.data_compra) },
                        { rotulo: "Observações internas", valor: gestao.veiculo.observacoes_internas, largo: true },
                      ]
                    : []),
                ]}
              />
              {usuario.papel === "dono" && (
                <Link href={`/configuracoes/auditoria?registro=${id}`} className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <History className="size-4" /> Ver histórico de alterações
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {aba === "preparacao" && (
          <ChecklistCard tipo="preparacao" veiculoId={id} podeMarcar={v.status === "em_preparacao"} voltar={`/estoque/${id}?aba=preparacao`} />
        )}

        {aba === "dados" && v.placa && <ConsultaDoCarro placa={v.placa} />}

        {aba === "dados" && <TarefasDaEntidade entidade="veiculo" entidadeId={id} usuario={{ id: usuario.id, papel: usuario.papel }} voltar={`/estoque/${id}`} />}

        {aba === "fotos" && <FotosVeiculo veiculoId={id} fotos={fotos} podeEditar={podeEditar} />}

        {aba === "itens" && <AbaItens id={id} podeEditar={podeEditar} />}

        {aba === "documentos" && <AbaDocumentos id={id} podeEditar={podeEditar} />}

        {aba === "anuncios" && <AbaAnuncios id={id} disponivel={v.status !== "vendido" && v.status !== "devolvido"} />}

        {aba === "custos" && gestor && <AbaCustos id={id} consignado={v.tipo === "consignado"} />}

        {aba === "consignacao" && gestao && (
          <Card>
            <CardHeader><CardTitle>Consignação</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!consignacao ? (
                <p className="text-sm text-muted-foreground">Sem consignação registrada. Edite o carro para informar o consignante.</p>
              ) : (
                <>
                  {consignacao.data_fim && consignacao.status === "vigente" && diasEntre(consignacao.data_fim) >= -15 && (
                    <Alerta variante={diasEntre(consignacao.data_fim) > 0 ? "erro" : "aviso"}>
                      {diasEntre(consignacao.data_fim) > 0 ? "Contrato de consignação vencido." : `Contrato vence em ${-diasEntre(consignacao.data_fim)} dia(s).`}
                    </Alerta>
                  )}
                  <ListaDados
                    itens={[
                      { rotulo: "Consignante", valor: <Link className="text-primary hover:underline" href={`/consignantes/${consignacao.consignante_id}`}>{gestao.veiculo.consignante_nome}</Link> },
                      { rotulo: "Situação", valor: consignacao.status === "vigente" ? "Vigente" : consignacao.status === "vendido" ? "Vendido" : "Devolvido" },
                      { rotulo: "Valor mínimo do dono", valor: formatarMoeda(consignacao.valor_minimo_dono) },
                      { rotulo: "Recebimento", valor: consignacao.recebimento_padrao ? RECEBIMENTO_CONSIGNADO[consignacao.recebimento_padrao] : "Padrão da loja" },
                      { rotulo: "Início", valor: formatarData(consignacao.data_inicio) },
                      { rotulo: "Prazo (fim)", valor: consignacao.data_fim && formatarData(consignacao.data_fim) },
                      { rotulo: "Regra de comissão", valor: consignacao.regra_comissao_id ? "Definida" : "Pendente (definir em Regras de comissão)" },
                      { rotulo: "Devolução", valor: consignacao.data_devolucao && `${formatarData(consignacao.data_devolucao)}${consignacao.motivo_devolucao ? ` — ${consignacao.motivo_devolucao}` : ""}` },
                      { rotulo: "Observações", valor: consignacao.observacoes, largo: true },
                    ]}
                  />
                  <ContratoLink arquivoId={consignacao.contrato_arquivo_id} />
                  {consignacao.status === "vigente" && (
                    <EnviarContrato consignacaoId={consignacao.id} veiculoId={id} temContrato={!!consignacao.contrato_arquivo_id} />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {podeEditar && (
          <div className="flex justify-end">
            <BotaoExcluir id={id} acao={excluirVeiculo} destino="/estoque" titulo="Excluir veículo?"
              descricao="Use só para cadastros feitos por engano. Carros vendidos ou com lançamentos não podem ser excluídos." />
          </div>
        )}
      </Conteudo>
    </>
  );
}

async function VendaDoCarro({ veiculoId }: { veiculoId: string }) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("vendas").select("id, numero, status").eq("veiculo_id", veiculoId).in("status", ["rascunho", "aguardando_aprovacao"]).maybeSingle();
  if (data) {
    return (
      <Button asChild variant="outline" size="lg">
        <Link href={`/vendas/${data.id}`}><Handshake /> Venda {data.numero} {data.status === "rascunho" ? "em rascunho" : "em aprovação"}</Link>
      </Button>
    );
  }
  return (
    <Button asChild size="lg">
      <Link href={`/vendas/nova?veiculo=${veiculoId}`}><Handshake /> Registrar venda</Link>
    </Button>
  );
}

async function AbaItens({ id, podeEditar }: { id: string; podeEditar: boolean }) {
  const supabase = await criarClienteServidor();
  const [{ data: itens }, { data: historico }, { data: catalogo }] = await Promise.all([
    supabase.from("veiculo_itens").select("id, item, confirmado, fonte").eq("veiculo_id", id).order("ordem").order("item"),
    supabase.from("veiculo_historico").select("id, data, tipo, descricao, comprovado, visivel_anuncio").eq("veiculo_id", id).order("data", { ascending: false }),
    supabase.from("itens_catalogo").select("item").order("ordem"),
  ]);
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Itens e opcionais</CardTitle></CardHeader>
        <CardContent><ItensVeiculo veiculoId={id} itens={itens ?? []} catalogo={(catalogo ?? []).map((c) => c.item)} podeEditar={podeEditar} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Histórico do carro</CardTitle></CardHeader>
        <CardContent><HistoricoVeiculo veiculoId={id} historico={historico ?? []} podeEditar={podeEditar} /></CardContent>
      </Card>
    </div>
  );
}

async function AbaDocumentos({ id, podeEditar }: { id: string; podeEditar: boolean }) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("arquivos")
    .select("id, nome, categoria, sigiloso, bucket, path, criado_em")
    .eq("entidade", "veiculo")
    .eq("entidade_id", id)
    .neq("categoria", "foto")
    .order("criado_em", { ascending: false });
  const documentos = await Promise.all(
    (data ?? []).map(async (d) => {
      const { data: assinada } = await supabase.storage.from(d.bucket).createSignedUrl(d.path, 3600);
      return { id: d.id, nome: d.nome, categoria: d.categoria, sigiloso: d.sigiloso, criado_em: d.criado_em, url: assinada?.signedUrl ?? null };
    }),
  );
  return (
    <Card>
      <CardHeader><CardTitle>Documentos</CardTitle></CardHeader>
      <CardContent><DocumentosVeiculo veiculoId={id} documentos={documentos} podeEditar={podeEditar} /></CardContent>
    </Card>
  );
}

async function AbaCustos({ id, consignado }: { id: string; consignado: boolean }) {
  const supabase = await criarClienteServidor();
  const [{ data: custos }, { data: fornecedores }] = await Promise.all([
    supabase.from("custos_veiculo").select("id, tipo, descricao, valor, data, cobrar_do_consignante, fornecedores(nome)").eq("veiculo_id", id).order("data", { ascending: false }),
    supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-1.5"><Lock className="size-4" /> Custos de preparação</CardTitle></CardHeader>
      <CardContent>
        <CustosVeiculo
          veiculoId={id}
          consignado={consignado}
          fornecedores={fornecedores ?? []}
          custos={(custos ?? []).map((c) => ({ ...c, fornecedor: (c.fornecedores as { nome: string } | null)?.nome ?? null }))}
        />
      </CardContent>
    </Card>
  );
}

async function ContratoLink({ arquivoId }: { arquivoId: string | null }) {
  if (!arquivoId) return <Alerta variante="aviso">Contrato de consignação ainda não anexado.</Alerta>;
  const supabase = await criarClienteServidor();
  const { data: arq } = await supabase.from("arquivos").select("bucket, path, nome").eq("id", arquivoId).maybeSingle();
  if (!arq) return null;
  const { data } = await supabase.storage.from(arq.bucket).createSignedUrl(arq.path, 3600);
  return data?.signedUrl ? (
    <a href={data.signedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Abrir contrato: {arq.nome}</a>
  ) : null;
}

async function AbaAnuncios({ id, disponivel }: { id: string; disponivel: boolean }) {
  const inicial = await ultimoAnuncio(id);
  return <AnunciosVeiculo veiculoId={id} inicial={inicial} iaAtiva={situacaoIA().ativa} disponivel={disponivel} />;
}

async function ConsultaDoCarro({ placa }: { placa: string }) {
  const c = await ultimaConsulta(placa);
  return (
    <Link href={`/placa/${placa}`} className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-secondary/60">
      <ScanSearch className="size-5 text-primary" />
      <span className="min-w-0 flex-1 text-sm">
        {c ? <>Consulta da placa em {formatarData(c.consultado_em)} ({c.provedor})</> : "Placa ainda não consultada (leilão, sinistro, gravame, débitos)"}
      </span>
      {c && <SeloConsulta selo={c.status === "encontrado" ? c.selo : null} compacto />}
    </Link>
  );
}

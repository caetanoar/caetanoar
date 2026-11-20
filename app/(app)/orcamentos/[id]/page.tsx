import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, MessageCircle, ShieldAlert, Handshake, Calculator } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { carregarOrcamento, carrosParaOrcamento, clientesParaOrcamento, configOrcamento, alertasDoCarro } from "@/lib/orcamentos/consultas";
import { STATUS_ORCAMENTO, STATUS_DESCONTO } from "@/lib/orcamentos/rotulos";
import { AVISO_SIMULACAO, type Simulacao } from "@/lib/orcamentos/simulacao";
import { FORMA_VENDA } from "@/lib/vendas/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { linkWhatsApp } from "@/lib/whatsapp";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alerta } from "@/components/ui/misc";
import { ListaAlertas } from "@/components/orcamentos/alertas";
import { SeloConsulta } from "@/components/consulta/selo";
import { TarefasDaEntidade } from "@/components/tarefas/blocos";
import { FormOrcamento } from "../form-orcamento";
import { EnviarOrcamento, ReabrirOrcamento, ResponderOrcamento, ConverterEmVenda, DecidirDesconto } from "./acoes";

export default async function DetalheOrcamento({ params }: PageProps<"/orcamentos/[id]">) {
  const usuario = await exigirPermissao("orcamentos");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const dados = await carregarOrcamento(id);
  if (!dados) notFound();
  const { o, pagamentos, trocas } = dados;
  const cfg = await configOrcamento();
  const rascunho = o.status === "rascunho";
  const podeAprovar = pode(usuario.papel, "orcamentos.aprovar") && (usuario.papel === "dono" || o.vendedor_id !== usuario.id);
  const st = STATUS_ORCAMENTO[o.status_efetivo!];
  const alertas = rascunho ? await alertasDoCarro(o.veiculo_id!) : o.alertas;
  const sim = o.simulacao as Simulacao | null;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const linkPublico = o.token_publico ? `${site}/o/${o.token_publico}` : null;
  const lojaWa = cfg.whatsapp.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  const mensagem = linkPublico
    ? `Olá, ${(o.cliente_nome ?? "").split(" ")[0]}! Segue o orçamento ${o.numero} do ${o.veiculo_nome}: ${formatarMoeda(o.valor_final)}. Detalhes e condições do carro: ${linkPublico} . Qualquer dúvida, fale com a ${cfg.loja.nome} no WhatsApp ${lojaWa}.`
    : null;
  const wa = mensagem ? linkWhatsApp(o.cliente_telefone, mensagem) : null;

  const [carros, clientes] = rascunho ? await Promise.all([carrosParaOrcamento(), clientesParaOrcamento()]) : [[], []];

  return (
    <>
      <Cabecalho titulo={`Orçamento ${o.numero}`} subtitulo={`${o.cliente_nome} · ${o.veiculo_nome}`} voltar="/orcamentos" />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={st.variante}>{st.rotulo}</Badge>
          <Badge variant={STATUS_DESCONTO[o.desconto_status!].variante}>{STATUS_DESCONTO[o.desconto_status!].rotulo}</Badge>
          {o.validade && <span className="text-xs text-muted-foreground">Válido até {formatarData(o.validade)}</span>}
          {o.status === "enviado" && o.dias_sem_resposta !== null && <span className="text-xs text-muted-foreground">· {o.dias_sem_resposta} dia(s) sem resposta</span>}
        </div>

        {o.desconto_status === "aguardando_aprovacao" && (
          <Card className="border-warning/50">
            <CardHeader><CardTitle className="flex items-center gap-1.5"><ShieldAlert className="size-4" /> Desconto aguardando aprovação</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p>Desconto de <strong className="numero">{formatarMoeda(o.desconto)}</strong> sobre {formatarMoeda(o.preco_anunciado)}. Motivo do vendedor: {o.desconto_motivo}</p>
              {podeAprovar ? <DecidirDesconto id={id} /> : <p className="text-muted-foreground">O gerente ou o dono precisam aprovar antes do envio ao cliente.</p>}
            </CardContent>
          </Card>
        )}
        {o.desconto_decidido_em && (
          <p className="text-xs text-muted-foreground">
            Desconto {o.desconto_status === "recusado" ? "recusado" : "aprovado"} em {formatarDataHora(o.desconto_decidido_em)}: {o.desconto_decisao_motivo}
          </p>
        )}

        <Card>
          <CardHeader><CardTitle>Condições do veículo</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <ListaAlertas alertas={alertas} />
            <p className="text-xs text-muted-foreground">
              {rascunho ? "Estes alertas entram no orçamento ao enviar e não podem ser removidos." : `Registrados no envio, em ${o.alertas_em ? formatarDataHora(o.alertas_em) : "—"}.`}
            </p>
          </CardContent>
        </Card>

        {rascunho ? (
          <>
            <FormOrcamento
              carros={carros} clientes={clientes} taxas={cfg.taxas} podeConsultar={pode(usuario.papel, "placa.consultar")}
              valores={{
                id, veiculo_id: o.veiculo_id!, cliente_id: o.cliente_id!, valor_final: o.valor_final, valor_entrada: o.valor_entrada, validade: o.validade,
                observacoes: o.observacoes, desconto_motivo: o.desconto_motivo, simulacao_prazo: sim?.prazo ?? null, pagamentos, trocas,
              }}
            />
            <EnviarOrcamento id={id} />
          </>
        ) : (
          <Card>
            <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ListaDados
                itens={[
                  { rotulo: "Carro", valor: <Link href={`/estoque/${o.veiculo_id}`} className="text-primary hover:underline">{o.veiculo_nome}</Link> },
                  { rotulo: "Cliente", valor: <Link href={`/clientes/${o.cliente_id}`} className="text-primary hover:underline">{o.cliente_nome}</Link> },
                  { rotulo: "Preço anunciado", valor: formatarMoeda(o.preco_anunciado) },
                  { rotulo: "Desconto", valor: o.desconto ? formatarMoeda(o.desconto) : "—" },
                  { rotulo: "Valor do orçamento", valor: <strong className="numero">{formatarMoeda(o.valor_final)}</strong> },
                  { rotulo: "Entrada", valor: o.valor_entrada ? formatarMoeda(o.valor_entrada) : "—" },
                  { rotulo: "Vendedor", valor: o.vendedor_nome },
                  { rotulo: "Enviado em", valor: o.enviado_em && formatarDataHora(o.enviado_em) },
                  { rotulo: "Observações", valor: o.observacoes, largo: true },
                  ...(o.status === "recusado" ? [{ rotulo: "Motivo da recusa", valor: o.motivo_recusa, largo: true }] : []),
                ]}
              />
              <div className="flex flex-col gap-1.5 text-sm">
                {pagamentos.map((p, i) => (
                  <div key={i} className="flex justify-between rounded-lg border px-3 py-2">
                    <span>{FORMA_VENDA[p.forma as keyof typeof FORMA_VENDA]}{p.banco_financiamento ? ` · ${p.banco_financiamento}${p.parcelas ? ` ${p.parcelas}x` : ""}` : ""}</span>
                    <span className="numero">{formatarMoeda(p.valor)}</span>
                  </div>
                ))}
                {trocas.map((t, i) => (
                  <div key={`t${i}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <span className="min-w-0 truncate">Troca: {t.marca} {t.modelo} {t.ano_modelo ?? ""}{t.placa ? ` · ${t.placa}` : ""}</span>
                    <span className="flex shrink-0 items-center gap-2">{t.selo && <SeloConsulta selo={t.selo} compacto />}<span className="numero">{formatarMoeda(t.valor_avaliacao)}</span></span>
                  </div>
                ))}
              </div>
              {sim && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-medium"><Calculator className="size-4" /> {formatarMoeda(sim.valor_financiado)} em {sim.prazo}x de {formatarMoeda(sim.parcela)}</p>
                  <p className="text-xs text-muted-foreground">{AVISO_SIMULACAO}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!rascunho && (
          <div className="flex flex-col gap-2">
            {o.status === "enviado" && (
              <>
                {wa ? (
                  <Button asChild variant="whatsapp" size="lg"><a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> Enviar ao cliente pelo WhatsApp</a></Button>
                ) : (
                  <Alerta variante="aviso">Cliente sem telefone: copie o link público ou baixe o PDF.</Alerta>
                )}
                {linkPublico && <p className="text-xs break-all text-muted-foreground">Link do orçamento: {linkPublico}</p>}
                {o.status_efetivo === "expirado" ? <Alerta variante="aviso">Orçamento vencido: reabra, atualize a validade e reenvie.</Alerta> : <ResponderOrcamento id={id} />}
              </>
            )}
            {o.status === "aceito" && !o.venda_id && <ConverterEmVenda id={id} />}
            {o.venda_id && (
              <Button asChild variant="outline"><Link href={`/vendas/${o.venda_id}`}><Handshake /> Ver a venda gerada</Link></Button>
            )}
            <Button asChild variant="outline"><a href={`/orcamentos/${id}/pdf`} download><FileDown /> Baixar PDF</a></Button>
            {!o.venda_id && <ReabrirOrcamento id={id} />}
          </div>
        )}

        <TarefasDaEntidade entidade="orcamento" entidadeId={id} usuario={{ id: usuario.id, papel: usuario.papel }} voltar={`/orcamentos/${id}`} />
      </Conteudo>
    </>
  );
}

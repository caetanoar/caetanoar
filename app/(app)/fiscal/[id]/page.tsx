import Link from "next/link";
import { notFound } from "next/navigation";
import { FileCode2, FileText } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alerta } from "@/components/ui/misc";
import { STATUS_NOTA, formatarChave } from "@/lib/fiscal/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarDocumento } from "@/lib/format/documentos";
import { AcoesNota } from "./acoes-nota";

export default async function DetalheNota({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("fiscal");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const [{ data: n }, { data: itens }, { data: eventos }] = await Promise.all([
    supabase.from("v_notas_fiscais").select("*").eq("id", id).maybeSingle(),
    supabase.from("notas_fiscais_itens").select("*").eq("nota_id", id).order("numero_item"),
    supabase.from("notas_fiscais_eventos").select("*").eq("nota_id", id).order("criado_em", { ascending: false }),
  ]);
  if (!n || !n.id) notFound();
  let xmlUrl: string | null = null;
  if (n.xml_arquivo_id) {
    const { data: arq } = await supabase.from("arquivos").select("bucket, path").eq("id", n.xml_arquivo_id).maybeSingle();
    if (arq) xmlUrl = (await supabase.storage.from(arq.bucket).createSignedUrl(arq.path, 3600)).data?.signedUrl ?? null;
  }
  const st = STATUS_NOTA[n.status!];
  return (
    <>
      <Cabecalho titulo={`NF-e ${n.numero ?? "—"}${n.serie ? `/${n.serie}` : ""}`} subtitulo={n.direcao === "entrada" ? `Entrada · ${n.emitente_nome}` : `Saída · ${n.destinatario_nome}`} voltar="/fiscal" />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={st.variante}>{st.rotulo}</Badge>
          {n.simulada && <Badge variant="warning">Simulada — sem valor fiscal</Badge>}
          <Badge variant="outline">{n.tipo_documento === "nfse" ? "NFS-e" : "NF-e"}</Badge>
        </div>
        {n.motivo_status && <Alerta variante={n.status === "rejeitada" ? "erro" : "info"}>{n.motivo_status}</Alerta>}
        <div className="flex flex-wrap gap-2">
          {xmlUrl && <Button asChild variant="outline" size="sm"><a href={xmlUrl} target="_blank" rel="noopener noreferrer"><FileCode2 /> XML</a></Button>}
          {n.pdf_url_externa && <Button asChild variant="outline" size="sm"><a href={n.pdf_url_externa} target="_blank" rel="noopener noreferrer"><FileText /> DANFE (PDF)</a></Button>}
          <AcoesNota id={id} podeCancelar={n.direcao === "saida" && n.status === "autorizada"} podeConsultar={n.direcao === "saida" && (n.status === "processando" || n.status === "autorizada")} />
        </div>
        <Card>
          <CardContent className="p-4">
            <ListaDados
              itens={[
                { rotulo: "Valor total", valor: <strong className="numero">{formatarMoeda(n.valor_total)}</strong> },
                { rotulo: "Emissão", valor: n.data_emissao && formatarDataHora(n.data_emissao) },
                { rotulo: "Natureza da operação", valor: n.natureza_operacao, largo: true },
                { rotulo: "CFOP", valor: n.cfop },
                { rotulo: "Protocolo", valor: n.protocolo },
                { rotulo: "Emitente", valor: `${n.emitente_nome ?? "—"}${n.emitente_documento ? ` · ${formatarDocumento(n.emitente_documento)}` : ""}`, largo: true },
                { rotulo: "Destinatário", valor: `${n.destinatario_nome ?? "—"}${n.destinatario_documento && n.destinatario_documento.length === 14 ? ` · ${formatarDocumento(n.destinatario_documento)}` : ""}`, largo: true },
                { rotulo: "Chave de acesso", valor: <span className="font-mono text-xs">{formatarChave(n.chave_acesso)}</span>, largo: true },
                { rotulo: "Veículo", valor: n.veiculo_id ? <Link href={`/estoque/${n.veiculo_id}`} className="text-primary hover:underline">{n.veiculo_nome}</Link> : null },
                { rotulo: "Fornecedor", valor: n.fornecedor_id ? <Link href={`/fornecedores/${n.fornecedor_id}`} className="text-primary hover:underline">{n.fornecedor_nome}</Link> : null },
                { rotulo: "Cliente", valor: n.cliente_id ? <Link href={`/clientes/${n.cliente_id}`} className="text-primary hover:underline">{n.cliente_nome}</Link> : null },
                { rotulo: "Venda", valor: n.venda_id ? <Link href={`/vendas/${n.venda_id}`} className="text-primary hover:underline">{n.venda_numero}</Link> : null },
                { rotulo: "Provedor", valor: n.provedor },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Itens</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(itens ?? []).map((i) => (
              <div key={i.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{i.numero_item}. {i.descricao}</p>
                <p className="text-xs text-muted-foreground">NCM {i.ncm ?? "—"} · CFOP {i.cfop ?? "—"}{i.chassi && ` · chassi ${i.chassi}`} · {formatarMoeda(i.valor_total)}</p>
              </div>
            ))}
            {(itens ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem itens detalhados.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Histórico da nota</CardTitle></CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {(eventos ?? []).map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="text-xs text-muted-foreground">{formatarDataHora(e.criado_em)} · </span>
                  <span className="font-medium capitalize">{e.tipo.replace("_", " ")}</span>
                  {e.mensagem && <span className="text-muted-foreground"> — {e.mensagem}</span>}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">Registrada em {formatarData(n.criado_em)}.</p>
          </CardContent>
        </Card>
      </Conteudo>
    </>
  );
}

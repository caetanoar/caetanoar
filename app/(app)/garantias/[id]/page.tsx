import Link from "next/link";
import { pode } from "@/lib/auth/permissoes";
import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarAnexos } from "@/lib/arquivos/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { ContatoRapido } from "@/components/cadastros/contato-rapido";
import { Anexos } from "@/components/arquivos/anexos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSignature } from "lucide-react";
import { STATUS_GARANTIA, STATUS_ACIONAMENTO } from "@/lib/vendas/rotulos";
import { formatarData } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/moeda";
import { FormAcionamento, AjustarGarantia } from "./garantia-cliente";

export default async function DetalheGarantia({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPermissao("garantias");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const [{ data: g }, { data: acionamentos }, { data: fornecedores }, anexos] = await Promise.all([
    supabase.from("v_garantias").select("*").eq("id", id).maybeSingle(),
    supabase.from("garantias_acionamentos").select("*, fornecedores(nome)").eq("garantia_id", id).order("data_abertura", { ascending: false }),
    supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
    carregarAnexos("garantia", id),
  ]);
  if (!g || !g.id) notFound();
  const st = STATUS_GARANTIA[g.status!] ?? STATUS_GARANTIA.ativa;
  return (
    <>
      <Cabecalho titulo={`Garantia · ${g.veiculo_nome}`} subtitulo={g.cliente_nome ?? undefined} voltar="/garantias" acoes={pode(usuario.papel, "garantias.ajustar") ? <AjustarGarantia garantia={{ id, dias: g.dias!, cobertura: g.cobertura, observacoes: g.observacoes }} /> : undefined} />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={st.variante}>{st.rotulo}</Badge>
          {g.status === "ativa" && <Badge variant={g.vence_em_breve ? "warning" : "muted"}>{g.dias_restantes} dias restantes</Badge>}
        </div>
        <ContatoRapido telefone={g.cliente_telefone} whatsapp={g.cliente_whatsapp} />
        {g.status !== "cancelada" && (
          <Button asChild variant="outline">
            <a href={`/garantias/${id}/termo`} download><FileSignature /> Baixar termo de garantia (PDF) para o cliente assinar</a>
          </Button>
        )}
        <Card>
          <CardContent className="p-4">
            <ListaDados
              itens={[
                { rotulo: "Venda", valor: <Link href={`/vendas/${g.venda_id}`} className="text-primary hover:underline">{g.venda_numero}</Link> },
                { rotulo: "Carro", valor: <Link href={`/estoque/${g.veiculo_id}`} className="text-primary hover:underline">{g.veiculo_nome}</Link> },
                { rotulo: "Início", valor: formatarData(g.data_inicio) },
                { rotulo: "Fim", valor: `${formatarData(g.data_fim)} (${g.dias} dias)` },
                { rotulo: "Custo com acionamentos", valor: formatarMoeda(g.custo_total) },
                { rotulo: "Cliente", valor: <Link href={`/clientes/${g.cliente_id}`} className="text-primary hover:underline">{g.cliente_nome}</Link> },
                { rotulo: "Cobertura", valor: g.cobertura ?? "Não definida (defina o texto padrão em Configurações)", largo: true },
                { rotulo: "Observações", valor: g.observacoes, largo: true },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Acionamentos</CardTitle>
            <FormAcionamento garantiaId={id} fornecedores={fornecedores ?? []} />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(acionamentos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum acionamento.</p>
            ) : (
              (acionamentos ?? []).map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{formatarData(a.data_abertura)}{(a.fornecedores as { nome: string } | null)?.nome && ` · ${(a.fornecedores as { nome: string }).nome}`}</p>
                      <p className="text-sm font-medium">{a.descricao}</p>
                      {a.solucao && <p className="text-sm text-muted-foreground">Solução: {a.solucao}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={a.status === "resolvido" ? "success" : a.status === "negado" ? "muted" : "destructive"}>{STATUS_ACIONAMENTO[a.status]}</Badge>
                      <span className="numero text-sm font-semibold">{formatarMoeda(a.custo)}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <FormAcionamento garantiaId={id} fornecedores={fornecedores ?? []} acionamento={a} />
                  </div>
                </div>
              ))
            )}
            <p className="text-xs text-muted-foreground">O custo do acionamento vira conta a pagar (Custo de garantia) e reduz o resultado da venda.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Arquivos (orçamentos, notas, fotos)</CardTitle></CardHeader>
          <CardContent><Anexos entidade="garantia" entidadeId={id} anexos={anexos} podeEnviar revalidar={`/garantias/${id}`} /></CardContent>
        </Card>
      </Conteudo>
    </>
  );
}

import Link from "next/link";
import { FileText, Plus, ShieldAlert } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { listarOrcamentos } from "@/lib/orcamentos/consultas";
import { STATUS_ORCAMENTO } from "@/lib/orcamentos/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/cadastros/busca";

export const metadata = { title: "Orçamentos" };

export default async function Orcamentos({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const usuario = await exigirPermissao("orcamentos");
  const { status } = await searchParams;
  const gestao = pode(usuario.papel, "orcamentos.aprovar");
  const [lista, pendentes] = await Promise.all([
    listarOrcamentos({ status }),
    gestao ? listarOrcamentos({ desconto: "aguardando" }) : Promise.resolve([]),
  ]);
  return (
    <>
      <Cabecalho
        titulo={gestao ? "Orçamentos" : "Meus orçamentos"}
        subtitulo={`${lista.length} orçamento(s)`}
        acoes={<Button asChild size="sm"><Link href="/orcamentos/novo"><Plus /> Novo</Link></Button>}
      />
      <Conteudo className="flex flex-col gap-3">
        {pendentes.length > 0 && (
          <Link href="/orcamentos/aprovacoes" className="flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/15 px-3 py-2.5 text-sm">
            <ShieldAlert className="size-4" /> {pendentes.length} desconto(s) aguardando sua aprovação
          </Link>
        )}
        <Chips parametro="status" opcoes={Object.entries(STATUS_ORCAMENTO).map(([valor, s]) => ({ valor, rotulo: s.rotulo }))} />
        {lista.length === 0 ? (
          <Vazio icone={FileText} titulo="Nenhum orçamento">Crie a partir de um carro do estoque ou da consulta por placa.</Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {lista.map((o) => {
              const st = STATUS_ORCAMENTO[o.status_efetivo!];
              return (
                <Link key={o.id} href={`/orcamentos/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{o.cliente_nome} · {o.veiculo_nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.numero} · {formatarMoeda(o.valor_final)}{o.validade ? ` · válido até ${formatarData(o.validade)}` : ""}
                      {gestao ? ` · ${o.vendedor_nome}` : ""}
                      {o.dias_sem_resposta !== null && o.status === "enviado" ? ` · ${o.dias_sem_resposta} dia(s) sem resposta` : ""}
                    </p>
                  </div>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={st.variante}>{st.rotulo}</Badge>
                    {o.desconto_status === "aguardando_aprovacao" && <Badge variant="warning">Aprovação</Badge>}
                  </span>
                </Link>
              );
            })}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

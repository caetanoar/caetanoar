import Link from "next/link";
import { AlertTriangle, CalendarClock, ShieldAlert, Wallet, Handshake, ChevronRight } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { resumoMes, alertasGerenciais } from "@/lib/indicadores/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Kpi, MedidorMeta } from "@/components/indicadores/kpi";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, nomeDoMes } from "@/lib/format/data";

export default async function Painel() {
  const usuario = await exigirPermissao("painel");
  const [r, a] = await Promise.all([resumoMes(), alertasGerenciais()]);
  return (
    <>
      <Cabecalho titulo={`Olá, ${usuario.nome.split(" ")[0]}`} subtitulo={`Resumo de ${nomeDoMes(r.ini)}`} />
      <Conteudo className="flex flex-col gap-4">
        {a.aprovacoes.length > 0 && (
          <Link href="/vendas" className="flex items-center gap-3 rounded-xl border border-warning/50 bg-warning/15 p-3">
            <Handshake className="size-5" />
            <span className="flex-1 text-sm font-medium">{a.aprovacoes.length} venda(s) aguardando aprovação</span>
            <ChevronRight className="size-4" />
          </Link>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Kpi rotulo="Vendas no mês" valor={String(r.qtd)} apoio={`ticket ${formatarMoeda(r.ticketMedio)}`} />
          <Kpi rotulo="Valor vendido" valor={formatarMoeda(r.faturamento)} />
          <Kpi rotulo="Lucro do mês" valor={formatarMoeda(r.lucro)} destaque />
          <Kpi rotulo="Saldo em caixa e bancos" valor={formatarMoeda(a.saldo)} />
        </div>

        {r.metaLoja && (
          <Card>
            <CardContent className="grid gap-4 p-4 md:grid-cols-3">
              <MedidorMeta rotulo="Meta de faturamento" realizado={r.faturamento} meta={r.metaLoja.meta_faturamento} formatar={formatarMoeda} />
              <MedidorMeta rotulo="Meta de lucro" realizado={r.lucro} meta={r.metaLoja.meta_lucro} formatar={formatarMoeda} />
              <MedidorMeta rotulo="Meta de vendas" realizado={r.qtd} meta={r.metaLoja.meta_qtd_vendas} formatar={(n) => String(n)} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-1.5"><Wallet className="size-4" /> Saldo projetado</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span>Saldo hoje</span><span className="numero font-semibold">{formatarMoeda(a.saldo)}</span></div>
              <div className="flex justify-between"><span>A receber até o fim do mês</span><span className="numero text-success">+ {formatarMoeda(a.entradasMes)}</span></div>
              <div className="flex justify-between"><span>A pagar até o fim do mês</span><span className="numero">− {formatarMoeda(a.saidasMes)}</span></div>
              <div className="flex justify-between border-t pt-2 font-semibold"><span>Projetado para {formatarData(r.fim)}</span><span className={`numero ${a.projetadoFimMes < 0 ? "text-destructive" : ""}`}>{formatarMoeda(a.projetadoFimMes)}</span></div>
              {a.vencidos > 0 && <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="size-3" /> {a.vencidos} lançamento(s) vencido(s) entram como pendentes</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-1.5"><CalendarClock className="size-4" /> Contas que vencem em {a.diasContas} dias</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {a.vencendo.length === 0 && <p className="text-sm text-muted-foreground">Nada vencendo.</p>}
              {a.vencendo.map((l) => (
                <Link key={l.id} href={`/financeiro/lancamentos/${l.id}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
                  <span className="min-w-0 truncate">{l.descricao}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`text-xs ${l.vencido ? "text-destructive" : "text-muted-foreground"}`}>{formatarData(l.data_vencimento)}</span>
                    <span className={`numero font-medium ${l.tipo === "receita" ? "text-success" : ""}`}>{l.tipo === "receita" ? "+" : "−"} {formatarMoeda(l.valor)}</span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-1.5"><ShieldAlert className="size-4" /> Garantias em risco</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {a.garantiasAcionadas.length + a.garantiasVencendo.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma garantia acionada ou vencendo.</p>}
              {a.garantiasAcionadas.map((g) => (
                <Link key={g.id} href={`/garantias/${g.id}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
                  <span className="min-w-0 truncate">{g.veiculo_nome} · {g.cliente_nome}</span>
                  <Badge variant="destructive">acionada</Badge>
                </Link>
              ))}
              {a.garantiasVencendo.map((g) => (
                <Link key={g.id} href={`/garantias/${g.id}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
                  <span className="min-w-0 truncate">{g.veiculo_nome} · {g.cliente_nome}</span>
                  <Badge variant="warning">vence em {g.dias_restantes}d</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-1.5"><CalendarClock className="size-4" /> Estoque parado (+{r.estoque.diasParado} dias)</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">{r.estoque.qtd} carros em estoque · média de {r.estoque.mediaDias} dias · {formatarMoeda(r.estoque.valorAnunciado)} anunciados</p>
              {r.estoque.parados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum carro parado.</p>}
              {r.estoque.parados.slice(0, 8).map((v) => (
                <Link key={v.id} href={`/estoque/${v.id}`} className="flex justify-between rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
                  <span>{v.marca} {v.modelo}</span>
                  <span className="numero">{v.dias_em_estoque} dias</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </Conteudo>
    </>
  );
}

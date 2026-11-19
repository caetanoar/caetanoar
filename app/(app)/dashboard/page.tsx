import Link from "next/link";
import { CalendarClock, Target, BellRing, Handshake } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { resumoMes } from "@/lib/indicadores/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Kpi, MedidorMeta, BarrasMensais } from "@/components/indicadores/kpi";
import { InputData } from "@/components/form/inputs";
import { formatarMoeda } from "@/lib/format/moeda";
import { inicioDoMes, nomeDoMes } from "@/lib/format/data";

const qtd = (n: number) => String(Math.round(n));

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const usuario = await exigirPermissao("dashboard");
  const { mes: mesParam } = await searchParams;
  const mes = inicioDoMes(mesParam && /^\d{4}-\d{2}-\d{2}$/.test(mesParam) ? mesParam : undefined);

  if (usuario.papel === "vendedor") {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.rpc("meu_dashboard", { p_mes: mes });
    const d = (data ?? {}) as Record<string, number | null>;
    return (
      <>
        <Cabecalho titulo="Minha meta" subtitulo={nomeDoMes(mes)} />
        <Conteudo className="flex max-w-3xl flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4 p-4">
              <MedidorMeta rotulo="Vendas no mês" realizado={Number(d.qtd_vendas ?? 0)} meta={d.meta_qtd_vendas ?? null} formatar={qtd} />
              <MedidorMeta rotulo="Faturamento" realizado={Number(d.faturamento ?? 0)} meta={d.meta_faturamento ?? null} formatar={formatarMoeda} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi rotulo="Vendas fechadas" valor={qtd(Number(d.qtd_vendas ?? 0))} />
            <Kpi rotulo="Ticket médio" valor={formatarMoeda(d.ticket_medio ?? 0)} />
            <Kpi rotulo="Minhas comissões" valor={formatarMoeda(d.comissoes ?? 0)} destaque apoio={<Link href="/minhas-comissoes" className="text-primary hover:underline">ver detalhes</Link>} />
            <Kpi rotulo="Aguardando aprovação" valor={qtd(Number(d.aguardando ?? 0))} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href="/clientes?followup=1" className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <BellRing className="size-5 text-primary" />
              <span className="flex-1 text-sm">Retornos para hoje ou atrasados</span>
              <span className="numero font-semibold">{d.retornos_pendentes ?? 0}</span>
            </Link>
            <Link href="/clientes" className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <Target className="size-5 text-primary" />
              <span className="flex-1 text-sm">Clientes em atendimento</span>
              <span className="numero font-semibold">{d.clientes_ativos ?? 0}</span>
            </Link>
          </div>
          <Button asChild size="lg"><Link href="/vendas/nova"><Handshake /> Registrar venda</Link></Button>
        </Conteudo>
      </>
    );
  }

  const r = await resumoMes(mes);
  const meta = r.metaLoja;
  return (
    <>
      <Cabecalho titulo="Metas e resultados" subtitulo={nomeDoMes(mes)} />
      <Conteudo className="flex flex-col gap-4">
        <form className="flex gap-2">
          <InputData name="mes" defaultValue={mes} aria-label="Mês (qualquer dia do mês)" />
          <Button type="submit" variant="outline">Ver mês</Button>
        </form>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Meta da loja</CardTitle>
            {usuario.papel === "dono" && <Link href="/configuracoes/metas" className="text-sm text-primary hover:underline">Definir metas</Link>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <MedidorMeta rotulo="Faturamento" realizado={r.faturamento} meta={meta?.meta_faturamento ?? null} formatar={formatarMoeda} />
            <MedidorMeta rotulo="Lucro" realizado={r.lucro} meta={meta?.meta_lucro ?? null} formatar={formatarMoeda} />
            <MedidorMeta rotulo="Número de vendas" realizado={r.qtd} meta={meta?.meta_qtd_vendas ?? null} formatar={qtd} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Kpi rotulo="Vendas do mês" valor={qtd(r.qtd)} />
          <Kpi rotulo="Ticket médio" valor={formatarMoeda(r.ticketMedio)} />
          <Kpi rotulo="Lucro" valor={formatarMoeda(r.lucro)} destaque />
          <Kpi rotulo="Comissões (vendedores e indicação)" valor={formatarMoeda(r.comissoes)} />
          <Kpi rotulo="Carros em estoque" valor={qtd(r.estoque.qtd)} />
          <Kpi rotulo="Valor do estoque (anunciado)" valor={formatarMoeda(r.estoque.valorAnunciado)} apoio={`custo dos próprios ${formatarMoeda(r.estoque.custoProprios)}`} />
          <Kpi rotulo="Média de dias em estoque" valor={`${r.estoque.mediaDias} dias`} />
          <Kpi rotulo={`Parados há mais de ${r.estoque.diasParado} dias`} valor={qtd(r.estoque.parados.length)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Vendedores</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-5">
              {r.porVendedor.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma venda nem meta no mês.</p>}
              {r.porVendedor.map((v) => (
                <div key={v.id} className="flex flex-col gap-2">
                  <p className="text-sm font-semibold">{v.nome} <span className="font-normal text-muted-foreground">· lucro {formatarMoeda(v.lucro)}</span></p>
                  <MedidorMeta rotulo="Vendas" realizado={v.qtd} meta={v.meta?.meta_qtd_vendas ?? null} formatar={qtd} />
                  <MedidorMeta rotulo="Faturamento" realizado={v.faturamento} meta={v.meta?.meta_faturamento ?? null} formatar={formatarMoeda} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <BarrasMensais titulo="Valor vendido nos últimos 6 meses" dados={r.meses} formatar={formatarMoeda} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><CalendarClock className="size-4" /> Carros parados há mais de {r.estoque.diasParado} dias</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {r.estoque.parados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum carro parado. 👏</p>}
            {r.estoque.parados.map((v) => (
              <Link key={v.id} href={`/estoque/${v.id}`} className="flex justify-between rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
                <span>{v.marca} {v.modelo} {v.placa ?? ""}</span>
                <span className="numero font-medium">{v.dias_em_estoque} dias · {formatarMoeda(v.preco_anunciado)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </Conteudo>
    </>
  );
}

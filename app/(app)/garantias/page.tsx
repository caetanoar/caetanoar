import Link from "next/link";
import { ShieldCheck, ChevronRight, AlertTriangle, Wrench } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Chips } from "@/components/cadastros/busca";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_GARANTIA } from "@/lib/vendas/rotulos";
import { formatarData } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/moeda";

export default async function Garantias({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await exigirPermissao("garantias");
  const { status } = await searchParams;
  const supabase = await criarClienteServidor();
  const [{ data }, { data: config }] = await Promise.all([
    supabase.from("v_garantias").select("*").order("data_fim", { ascending: true }),
    supabase.from("configuracoes").select("alerta_garantia_dias").single(),
  ]);
  const todas = data ?? [];
  const vencendo = todas.filter((g) => g.vence_em_breve && g.status === "ativa");
  const acionadas = todas.filter((g) => g.status === "acionada");
  const lista = status ? todas.filter((g) => g.status === status) : todas.filter((g) => g.status !== "cancelada");

  return (
    <>
      <Cabecalho titulo="Garantias" subtitulo={`${todas.filter((g) => g.status === "ativa" || g.status === "acionada").length} em vigor`} />
      <Conteudo className="flex flex-col gap-3">
        {acionadas.length > 0 && (
          <Link href="?status=acionada" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm">
            <Wrench className="size-4 text-destructive" /> {acionadas.length} garantia(s) acionada(s) com atendimento em aberto
          </Link>
        )}
        {vencendo.length > 0 && (
          <div className="rounded-lg border border-warning/50 bg-warning/15 px-3 py-2.5 text-sm">
            <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4" /> Vencem em até {config?.alerta_garantia_dias ?? 15} dias</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {vencendo.map((g) => (
                <li key={g.id}><Link href={`/garantias/${g.id}`} className="hover:underline">{g.veiculo_nome} · {g.cliente_nome} · vence {formatarData(g.data_fim)} ({g.dias_restantes} dias)</Link></li>
              ))}
            </ul>
          </div>
        )}
        <Chips parametro="status" todos="Todas" opcoes={Object.entries(STATUS_GARANTIA).map(([valor, s]) => ({ valor, rotulo: s.rotulo }))} />
        {lista.length === 0 ? (
          <Vazio icone={ShieldCheck} titulo="Nenhuma garantia">As garantias são criadas automaticamente quando uma venda é fechada.</Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {lista.map((g) => {
              const st = STATUS_GARANTIA[g.status!] ?? STATUS_GARANTIA.ativa;
              return (
                <Link key={g.id} href={`/garantias/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{g.veiculo_nome}</p>
                    <p className="truncate text-sm text-muted-foreground">{g.cliente_nome} · venda {g.venda_numero}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarData(g.data_inicio)} a {formatarData(g.data_fim)} ({g.dias} dias)
                      {Number(g.custo_total) > 0 && ` · custo ${formatarMoeda(g.custo_total)}`}
                    </p>
                  </div>
                  <Badge variant={st.variante}>{st.rotulo}</Badge>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

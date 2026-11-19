import Link from "next/link";
import { Plus, ArrowLeftRight, Landmark, Wallet, ListOrdered, ArrowDownLeft, ArrowUpRight, Tags, AlertCircle, ChevronRight } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListaLancamentos } from "@/components/financeiro/lista-lancamentos";
import { TIPO_CONTA } from "@/lib/financeiro/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { hojeISO, somarDias } from "@/lib/format/data";
import { NovaTransferencia } from "./transferencias/nova-transferencia";

export default async function Financeiro() {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const { data: config } = await supabase.from("configuracoes").select("alerta_contas_dias").single();
  const dias = config?.alerta_contas_dias ?? 7;
  const limite = somarDias(hojeISO(), dias);
  const [{ data: saldos }, { data: proximos }, { data: pendentes }] = await Promise.all([
    supabase.from("v_saldos_contas").select("id, nome, tipo, saldo_atual, ativa").eq("ativa", true).order("nome"),
    supabase.from("v_lancamentos").select("*").eq("status", "pendente").in("tipo", ["receita", "despesa"]).lte("data_vencimento", limite).order("data_vencimento").limit(30),
    supabase.from("lancamentos").select("tipo, valor, data_vencimento").eq("status", "pendente").in("tipo", ["receita", "despesa"]),
  ]);
  const contas = (saldos ?? []).map((s) => ({ id: s.id!, nome: s.nome! }));
  const total = (saldos ?? []).reduce((s, c) => s + Number(c.saldo_atual ?? 0), 0);
  const caixa = (saldos ?? []).filter((c) => c.tipo === "caixa").reduce((s, c) => s + Number(c.saldo_atual ?? 0), 0);
  const aReceber = (pendentes ?? []).filter((p) => p.tipo === "receita").reduce((s, p) => s + Number(p.valor), 0);
  const aPagar = (pendentes ?? []).filter((p) => p.tipo === "despesa").reduce((s, p) => s + Number(p.valor), 0);
  const vencidos = (pendentes ?? []).filter((p) => p.data_vencimento < hojeISO()).length;

  const atalhos = [
    { href: "/financeiro/lancamentos", rotulo: "Lançamentos", icone: ListOrdered },
    { href: "/financeiro/pagar", rotulo: "A pagar", icone: ArrowUpRight },
    { href: "/financeiro/receber", rotulo: "A receber", icone: ArrowDownLeft },
    { href: "/financeiro/contas", rotulo: "Contas", icone: Wallet },
    { href: "/financeiro/transferencias", rotulo: "Transferências", icone: ArrowLeftRight },
    { href: "/financeiro/conciliacao", rotulo: "Conciliação", icone: Landmark },
    { href: "/financeiro/categorias", rotulo: "Categorias", icone: Tags },
  ];

  return (
    <>
      <Cabecalho
        titulo="Financeiro"
        acoes={
          <>
            <NovaTransferencia contas={contas} />
            <Button asChild size="sm"><Link href="/financeiro/lancamentos/novo"><Plus /> Lançar</Link></Button>
          </>
        }
      />
      <Conteudo className="flex flex-col gap-4">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs opacity-80">Saldo total</p>
              <p className="numero text-2xl font-bold">{formatarMoeda(total)}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">Caixa</p>
              <p className="numero text-lg font-semibold">{formatarMoeda(caixa)}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">A receber</p>
              <p className="numero text-lg font-semibold">{formatarMoeda(aReceber)}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">A pagar</p>
              <p className="numero text-lg font-semibold">{formatarMoeda(aPagar)}</p>
            </div>
            <div className="col-span-2 border-t border-primary-foreground/20 pt-3 sm:col-span-4">
              <p className="text-xs opacity-80">Saldo projetado (saldo + a receber − a pagar)</p>
              <p className="numero text-lg font-semibold">{formatarMoeda(total + aReceber - aPagar)}</p>
            </div>
          </CardContent>
        </Card>

        {vencidos > 0 && (
          <Link href="/financeiro/pagar?vencidos=1" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm">
            <AlertCircle className="size-4 text-destructive" /> {vencidos} lançamento(s) vencido(s) sem baixa
          </Link>
        )}

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {atalhos.map((a) => (
            <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center text-xs hover:bg-secondary">
              <a.icone className="size-5 text-primary" />
              {a.rotulo}
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Saldo por conta</CardTitle>
            <Link href="/financeiro/contas" className="text-sm text-primary hover:underline">Gerenciar</Link>
          </CardHeader>
          <CardContent>
            {(saldos ?? []).length === 0 ? (
              <Vazio titulo="Nenhuma conta cadastrada"><Link href="/financeiro/contas" className="text-primary hover:underline">Cadastrar caixa e bancos</Link></Vazio>
            ) : (
              <ul className="divide-y">
                {(saldos ?? []).map((c) => (
                  <li key={c.id}>
                    <Link href={`/financeiro/lancamentos?conta=${c.id}&status=pago`} className="flex items-center justify-between py-2.5">
                      <span>
                        <span className="block text-sm font-medium">{c.nome}</span>
                        <span className="block text-xs text-muted-foreground">{TIPO_CONTA[c.tipo!]}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`numero font-semibold ${Number(c.saldo_atual) < 0 ? "text-destructive" : ""}`}>{formatarMoeda(c.saldo_atual)}</span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-2 font-semibold">Vencimentos até {dias} dias (inclui atrasados)</h2>
          {(proximos ?? []).length === 0 ? (
            <Vazio titulo="Nada vencendo nos próximos dias" />
          ) : (
            <ListaLancamentos itens={proximos ?? []} contas={contas} />
          )}
        </div>
      </Conteudo>
    </>
  );
}

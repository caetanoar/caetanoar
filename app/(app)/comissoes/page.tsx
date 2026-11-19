import Link from "next/link";
import { Percent, Settings } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { AbasLink } from "@/components/app/abas";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BotaoBaixar } from "@/components/financeiro/baixar";
import { TIPO_COMISSAO, STATUS_COMISSAO } from "@/lib/vendas/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";

type Aba = "a_receber" | "recebidas" | "a_pagar" | "pagas";
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "a_receber", rotulo: "A receber" },
  { id: "recebidas", rotulo: "Recebidas" },
  { id: "a_pagar", rotulo: "A pagar" },
  { id: "pagas", rotulo: "Pagas" },
];

export default async function Comissoes({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const usuario = await exigirPermissao("comissoes");
  const { aba: abaParam } = await searchParams;
  const aba: Aba = ABAS.some((a) => a.id === abaParam) ? (abaParam as Aba) : "a_pagar";
  const direcao = aba === "a_receber" || aba === "recebidas" ? "a_receber" : "a_pagar";
  const status = aba === "a_receber" || aba === "a_pagar" ? "pendente" : "quitada";
  const supabase = await criarClienteServidor();
  const [{ data }, { data: contas }, { data: totais }] = await Promise.all([
    supabase
      .from("comissoes")
      .select("*, vendas(numero, data_venda, veiculos(marca, modelo)), usuarios(nome), parceiros(nome), consignantes(nome), lancamentos(id, valor, conta_id, forma_pagamento, status, descricao)")
      .eq("direcao", direcao)
      .eq("status", status)
      .order(status === "pendente" ? "data_prevista" : "data_quitacao", { ascending: status === "pendente" })
      .limit(300),
    supabase.from("contas_financeiras").select("id, nome").eq("ativa", true).order("nome"),
    supabase.from("comissoes").select("direcao, status, valor").eq("status", "pendente"),
  ]);
  const lista = data ?? [];
  const soma = lista.reduce((s, c) => s + Number(c.valor), 0);
  const aReceber = (totais ?? []).filter((t) => t.direcao === "a_receber").reduce((s, t) => s + Number(t.valor), 0);
  const aPagar = (totais ?? []).filter((t) => t.direcao === "a_pagar").reduce((s, t) => s + Number(t.valor), 0);

  return (
    <>
      <Cabecalho
        titulo="Comissões"
        subtitulo={`A receber ${formatarMoeda(aReceber)} · a pagar ${formatarMoeda(aPagar)}`}
        acoes={<Button asChild size="sm" variant="outline"><Link href="/configuracoes/comissoes"><Settings /> Regras</Link></Button>}
      />
      <Conteudo className="flex flex-col gap-3">
        <AbasLink abas={ABAS} atual={aba} base="/comissoes" />
        <p className="text-sm text-muted-foreground">{lista.length} comissão(ões) · total {formatarMoeda(soma)}</p>
        {lista.length === 0 ? (
          <Vazio icone={Percent} titulo="Nada por aqui">
            {aba === "a_receber" ? "Comissões de consignados com pagamento direto ao dono aparecem aqui." : "As comissões são geradas ao fechar cada venda."}
          </Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {lista.map((c) => {
              const venda = c.vendas as { numero: string; data_venda: string; veiculos: { marca: string; modelo: string } | null } | null;
              const quem = (c.usuarios as { nome: string } | null)?.nome ?? (c.parceiros as { nome: string } | null)?.nome ?? (c.consignantes as { nome: string } | null)?.nome ?? "Loja";
              const l = c.lancamentos as { id: string; valor: number; conta_id: string | null; forma_pagamento: string | null; status: string; descricao: string } | null;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{quem}</p>
                    <p className="truncate text-sm text-muted-foreground">{TIPO_COMISSAO[c.tipo]} · <Link href={`/vendas/${c.venda_id}`} className="hover:underline">{venda?.numero}</Link> · {venda?.veiculos?.marca} {venda?.veiculos?.modelo}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.status === "pendente" ? `Previsto ${formatarData(c.data_prevista)}` : `Quitada em ${formatarData(c.data_quitacao)}`}
                      {c.manual && " · valor manual"}
                      {c.tipo === "loja_consignado" && c.status === "quitada" && !c.lancamento_id && " · retida do repasse"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="numero font-semibold">{formatarMoeda(c.valor)}</span>
                    {c.status === "pendente" && l && l.status === "pendente" ? (
                      <BotaoBaixar id={l.id} descricao={l.descricao} valor={Number(l.valor)} tipo={c.direcao === "a_receber" ? "receita" : "despesa"} contaId={l.conta_id} forma={l.forma_pagamento} contas={contas ?? []} compacto />
                    ) : (
                      <Badge variant={STATUS_COMISSAO[c.status].variante}>{STATUS_COMISSAO[c.status].rotulo}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
        {usuario.papel !== "dono" && <p className="text-xs text-muted-foreground">As regras de comissão são definidas pelo dono.</p>}
      </Conteudo>
    </>
  );
}

import Link from "next/link";
import { Coins } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_COMISSAO } from "@/lib/vendas/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";

export default async function MinhasComissoes() {
  await exigirPermissao("minhas-comissoes");
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("minhas_comissoes");
  const lista = data ?? [];
  const aReceber = lista.filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.valor), 0);
  const recebidas = lista.filter((c) => c.status === "quitada").reduce((s, c) => s + Number(c.valor), 0);
  return (
    <>
      <Cabecalho titulo="Minhas comissões" />
      <Conteudo className="flex max-w-2xl flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">A receber</p><p className="numero text-xl font-bold">{formatarMoeda(aReceber)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Já recebidas</p><p className="numero text-xl font-bold text-success">{formatarMoeda(recebidas)}</p></CardContent></Card>
        </div>
        {lista.length === 0 ? (
          <Vazio icone={Coins} titulo="Nenhuma comissão ainda">As comissões aparecem quando o gerente fecha as suas vendas.</Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {lista.map((c) => (
              <Link key={c.id} href={`/vendas/${c.venda_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.veiculo}</p>
                  <p className="text-xs text-muted-foreground">
                    Venda {c.venda_numero} · {formatarData(c.data_venda)} · {c.status === "quitada" ? `paga em ${formatarData(c.data_quitacao)}` : `previsão ${formatarData(c.data_prevista)}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="numero font-semibold">{formatarMoeda(c.valor)}</span>
                  <Badge variant={STATUS_COMISSAO[c.status].variante}>{STATUS_COMISSAO[c.status].rotulo}</Badge>
                </div>
              </Link>
            ))}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

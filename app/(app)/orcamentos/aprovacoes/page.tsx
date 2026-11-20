import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { listarOrcamentos } from "@/lib/orcamentos/consultas";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarDataHora } from "@/lib/format/data";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecidirDesconto } from "../[id]/acoes";

export const metadata = { title: "Aprovações de desconto" };

/** Fila do gerente e do dono: descontos fora do limite esperando decisão. */
export default async function Aprovacoes() {
  const usuario = await exigirPermissao("orcamentos.aprovar");
  const lista = await listarOrcamentos({ desconto: "aguardando" });
  return (
    <>
      <Cabecalho titulo="Aprovações de desconto" subtitulo={`${lista.length} pendente(s)`} voltar="/orcamentos" />
      <Conteudo className="flex max-w-3xl flex-col gap-3">
        {lista.length === 0 && <Vazio icone={ShieldCheck} titulo="Nada para aprovar">Os pedidos de desconto fora do limite aparecem aqui.</Vazio>}
        {lista.map((o) => {
          const pct = o.preco_anunciado ? (Number(o.desconto) / Number(o.preco_anunciado)) * 100 : 0;
          const proprio = usuario.papel !== "dono" && o.vendedor_id === usuario.id;
          return (
            <Card key={o.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  <Link href={`/orcamentos/${o.id}`} className="hover:underline">{o.numero} · {o.veiculo_nome}</Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <span>Cliente: {o.cliente_nome}</span>
                  <span>Vendedor: {o.vendedor_nome}</span>
                  <span>Anunciado: <span className="numero">{formatarMoeda(o.preco_anunciado)}</span></span>
                  <span>Proposto: <strong className="numero">{formatarMoeda(o.valor_final)}</strong></span>
                  <span>Desconto: <span className="numero">{formatarMoeda(o.desconto)} ({pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)</span></span>
                  <span className="text-muted-foreground">Pedido em {formatarDataHora(o.atualizado_em)}</span>
                </div>
                <p><span className="font-medium">Motivo do vendedor:</span> {o.desconto_motivo}</p>
                {proprio ? <p className="text-muted-foreground">Orçamento seu: outro gestor ou o dono decide.</p> : <DecidirDesconto id={o.id!} />}
              </CardContent>
            </Card>
          );
        })}
      </Conteudo>
    </>
  );
}

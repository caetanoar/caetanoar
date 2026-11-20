import { notFound } from "next/navigation";
import { MessageCircle, FileDown, Calculator } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dadosPdfDoPublico } from "@/lib/orcamentos/dados-pdf";
import { AVISO_SIMULACAO } from "@/lib/orcamentos/simulacao";
import { FORMA_VENDA } from "@/lib/vendas/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarKm } from "@/lib/format/veiculo";
import { linkWhatsApp } from "@/lib/whatsapp";
import { Logo } from "@/components/app/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alerta } from "@/components/ui/misc";
import { ListaAlertas } from "@/components/orcamentos/alertas";

export const metadata = { title: "Orçamento", robots: { index: false, follow: false } };

/** Página que o cliente abre pelo link do WhatsApp (sem login). */
export default async function OrcamentoPublico({ params }: PageProps<"/o/[token]">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("orcamento_publico", { p_token: token });
  if (!data) notFound();
  const bruto = data as Record<string, unknown>;
  const d = dadosPdfDoPublico(bruto);
  const vencido = Boolean(bruto.vencido) && bruto.status === "enviado";
  const wa = linkWhatsApp(d.loja.whatsapp, `Olá! Sobre o orçamento ${d.numero} do ${d.veiculo.nome}: `);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3">
        <Logo className="size-10" />
        <div>
          <p className="font-bold">{d.loja.nome}</p>
          <p className="text-xs text-muted-foreground">{d.loja.assinatura}</p>
        </div>
      </header>
      <div>
        <h1 className="text-xl font-bold">Orçamento {d.numero}</h1>
        <p className="text-sm text-muted-foreground">Para {d.cliente}{d.validade ? ` · válido até ${formatarData(d.validade)}` : ""}</p>
      </div>
      {vencido && <Alerta variante="aviso">Este orçamento venceu. Fale com a loja para atualizar.</Alerta>}

      <Card>
        <CardHeader><CardTitle>{d.veiculo.nome} {d.veiculo.ano}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1.5 text-sm">
          <p className="text-muted-foreground">{[d.veiculo.cor, d.veiculo.km !== null ? formatarKm(d.veiculo.km) : null].filter(Boolean).join(" · ")}</p>
          <div className="flex justify-between"><span>Preço anunciado</span><span className="numero">{formatarMoeda(d.precoAnunciado)}</span></div>
          {d.desconto > 0 && <div className="flex justify-between"><span>Desconto</span><span className="numero">− {formatarMoeda(d.desconto)}</span></div>}
          <div className="flex justify-between text-base font-semibold"><span>Valor</span><span className="numero">{formatarMoeda(d.valorFinal)}</span></div>
          {d.pagamentos.map((p, i) => (
            <div key={i} className="flex justify-between text-muted-foreground">
              <span>{FORMA_VENDA[p.forma as keyof typeof FORMA_VENDA] ?? p.forma}{p.banco ? ` · ${p.banco}${p.parcelas ? ` ${p.parcelas}x` : ""}` : ""}</span>
              <span className="numero">{formatarMoeda(p.valor)}</span>
            </div>
          ))}
          {d.trocas.map((t, i) => (
            <div key={`t${i}`} className="flex justify-between text-muted-foreground"><span>Seu carro na troca: {t.nome}</span><span className="numero">{formatarMoeda(t.valor)}</span></div>
          ))}
        </CardContent>
      </Card>

      {d.simulacao && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Calculator className="size-4" /> Simulação de financiamento</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p>{formatarMoeda(d.simulacao.valor_financiado)} em <strong className="numero">{d.simulacao.prazo}x de {formatarMoeda(d.simulacao.parcela)}</strong></p>
            <p className="text-xs text-muted-foreground">{AVISO_SIMULACAO}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Condições do veículo</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ListaAlertas alertas={d.alertas} />
          <p className="text-xs text-muted-foreground">
            Informações registradas em {d.alertasEm ? formatarDataHora(d.alertasEm) : "—"}. A consulta de placa reflete a base do provedor naquele momento e pode estar incompleta; recomendamos laudo cautelar independente.
          </p>
        </CardContent>
      </Card>

      {d.observacoes && <p className="text-sm"><span className="font-medium">Observações:</span> {d.observacoes}</p>}

      <div className="grid grid-cols-1 gap-2">
        {wa && <Button asChild variant="whatsapp" size="lg"><a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> Falar com a loja no WhatsApp</a></Button>}
        <Button asChild variant="outline"><a href={`/o/${token}/pdf`} download><FileDown /> Baixar PDF</a></Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">{d.loja.nome} · {d.loja.cidade}/{d.loja.uf} · {d.loja.telefones}</p>
    </main>
  );
}

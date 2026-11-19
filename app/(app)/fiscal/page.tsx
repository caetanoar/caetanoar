import Link from "next/link";
import { FileText, Upload, ChevronRight, AlertTriangle, FilePlus2 } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { situacaoProvedor } from "@/lib/integracoes/fiscal";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Chips } from "@/components/cadastros/busca";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alerta } from "@/components/ui/misc";
import { InputData } from "@/components/form/inputs";
import { STATUS_NOTA } from "@/lib/fiscal/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, inicioDoMes, fimDoMes } from "@/lib/format/data";

export default async function Fiscal({ searchParams }: { searchParams: Promise<{ direcao?: string; de?: string; ate?: string }> }) {
  await exigirPermissao("fiscal");
  const f = await searchParams;
  const de = f.de ?? inicioDoMes();
  const ate = f.ate ?? fimDoMes();
  const supabase = await criarClienteServidor();
  let q = supabase.from("v_notas_fiscais").select("*").gte("criado_em", `${de}T00:00:00-03:00`).lte("criado_em", `${ate}T23:59:59-03:00`).order("criado_em", { ascending: false }).limit(300);
  if (f.direcao === "entrada" || f.direcao === "saida") q = q.eq("direcao", f.direcao);
  const [{ data }, { data: semNota }] = await Promise.all([q, supabase.from("v_vendas_sem_nota").select("id, numero, data_venda, valor_venda").order("data_venda", { ascending: false }).limit(20)]);
  const notas = data ?? [];
  const provedor = situacaoProvedor();
  const totalEntrada = notas.filter((n) => n.direcao === "entrada" && n.status !== "cancelada").reduce((s, n) => s + Number(n.valor_total), 0);
  const totalSaida = notas.filter((n) => n.direcao === "saida" && n.status === "autorizada" && !n.simulada).reduce((s, n) => s + Number(n.valor_total), 0);

  return (
    <>
      <Cabecalho titulo="Fiscal (NF-e)" acoes={<Button asChild size="sm"><Link href="/fiscal/importar"><Upload /> Importar XML</Link></Button>} />
      <Conteudo className="flex flex-col gap-3">
        {provedor.simulado ? (
          <Alerta variante="aviso" titulo="Emissão em modo SIMULADO">
            As notas de saída geradas agora não têm valor fiscal. Para emitir de verdade são necessários CNPJ e IE, certificado digital A1, conta em um provedor (Focus NFe, NFE.io ou outro) e a configuração fiscal validada pelo contador.
          </Alerta>
        ) : (
          <Alerta variante="info">Provedor: {provedor.nome} · {provedor.ambiente}{!provedor.configurado && " · credenciais ausentes"}</Alerta>
        )}
        {(semNota ?? []).length > 0 && (
          <Card className="border-warning/50 bg-warning/10 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><AlertTriangle className="size-4" /> Vendas fechadas sem NF-e de saída</p>
            <ul className="flex flex-col gap-1">
              {(semNota ?? []).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{v.numero} · {formatarData(v.data_venda)} · {formatarMoeda(v.valor_venda)}</span>
                  <Button asChild size="sm" variant="outline"><Link href={`/fiscal/emitir?venda=${v.id}`}><FilePlus2 /> Emitir</Link></Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <form className="grid grid-cols-3 gap-2">
          <InputData name="de" defaultValue={de} aria-label="De" />
          <InputData name="ate" defaultValue={ate} aria-label="Até" />
          <input type="hidden" name="direcao" value={f.direcao ?? ""} />
          <Button type="submit" variant="outline">Filtrar</Button>
        </form>
        <Chips parametro="direcao" todos="Todas" opcoes={[{ valor: "entrada", rotulo: "Entrada" }, { valor: "saida", rotulo: "Saída" }]} />
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border bg-card p-2"><p className="text-[11px] text-muted-foreground">Entradas no período</p><p className="numero text-sm font-semibold">{formatarMoeda(totalEntrada)}</p></div>
          <div className="rounded-lg border bg-card p-2"><p className="text-[11px] text-muted-foreground">Saídas autorizadas</p><p className="numero text-sm font-semibold">{formatarMoeda(totalSaida)}</p></div>
        </div>
        {notas.length === 0 ? (
          <Vazio icone={FileText} titulo="Nenhuma nota no período"><Link href="/fiscal/importar" className="text-primary hover:underline">Importar XML de NF-e</Link></Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {notas.map((n) => {
              const st = STATUS_NOTA[n.status!];
              return (
                <Link key={n.id} href={`/fiscal/${n.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                  <Badge variant={n.direcao === "entrada" ? "info" : "secondary"} className="w-16 justify-center">{n.direcao === "entrada" ? "Entrada" : "Saída"}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.direcao === "entrada" ? n.emitente_nome : n.destinatario_nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      NF {n.numero ?? "—"}{n.serie ? `/${n.serie}` : ""} · {formatarData(n.data_emissao ?? n.criado_em)}{n.veiculo_nome && ` · ${n.veiculo_nome}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="numero text-sm font-semibold">{formatarMoeda(n.valor_total)}</span>
                    <span className="flex gap-1">{n.simulada && <Badge variant="warning">simulada</Badge>}<Badge variant={st.variante}>{st.rotulo}</Badge></span>
                  </div>
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

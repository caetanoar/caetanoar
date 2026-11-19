import Link from "next/link";
import { BellRing, Plus } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ETAPA_FUNIL, ORIGEM_LEAD, MOTIVO_PERDA } from "@/lib/clientes/rotulos";
import { formatarData } from "@/lib/format/data";
import { MoverCartao } from "./mover-cartao";

export default async function Funil({ searchParams }: { searchParams: Promise<{ vendedor?: string }> }) {
  const usuario = await exigirPermissao("clientes");
  const { vendedor } = await searchParams;
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("v_clientes")
    .select("id, nome, etapa, origem, interesses, proximo_contato_em, followup_pendente, vendedor_nome, motivo_perda, atualizado_em")
    .is("anonimizado_em", null)
    .order("atualizado_em", { ascending: false })
    .limit(400);
  if (vendedor) q = q.eq("vendedor_id", vendedor);
  const { data } = await q;
  const etapas = Object.keys(ETAPA_FUNIL) as (keyof typeof ETAPA_FUNIL)[];
  const total = (data ?? []).length;
  const ganhos = (data ?? []).filter((c) => c.etapa === "ganho").length;
  const fechados = (data ?? []).filter((c) => c.etapa === "ganho" || c.etapa === "perdido").length;

  return (
    <>
      <Cabecalho
        titulo="Funil de vendas"
        subtitulo={`${total} cliente(s) · conversão ${fechados ? Math.round((ganhos / fechados) * 100) : 0}% dos fechados`}
        voltar="/clientes"
        acoes={<Button asChild size="sm"><Link href="/clientes/novo"><Plus /> Novo</Link></Button>}
      />
      <Conteudo>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
          {etapas.map((etapa) => {
            const cards = (data ?? []).filter((c) => c.etapa === etapa);
            const info = ETAPA_FUNIL[etapa];
            return (
              <section key={etapa} className="flex w-[82%] shrink-0 snap-center flex-col gap-2 rounded-xl bg-muted/60 p-2 sm:w-[46%] lg:w-auto" aria-label={info.rotulo}>
                <header className="flex items-center justify-between px-1 py-1">
                  <Badge variant={info.variante}>{info.rotulo}</Badge>
                  <span className="text-sm text-muted-foreground">{cards.length}</span>
                </header>
                {cards.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nenhum cliente</p>}
                {cards.map((c) => (
                  <article key={c.id} className="rounded-lg border bg-card p-3 shadow-xs">
                    <Link href={`/clientes/${c.id}`} className="block">
                      <p className="flex items-center gap-1.5 font-medium">
                        {c.nome}
                        {c.followup_pendente && <BellRing className="size-3.5 text-warning-foreground dark:text-warning" aria-label="Retorno pendente" />}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{[ORIGEM_LEAD[c.origem!], c.interesses].filter(Boolean).join(" · ")}</p>
                      {etapa === "perdido" && c.motivo_perda && <p className="text-xs text-destructive">{MOTIVO_PERDA[c.motivo_perda]}</p>}
                      {c.proximo_contato_em && (etapa === "lead" || etapa === "negociacao") && (
                        <p className="text-xs text-muted-foreground">Retornar {formatarData(c.proximo_contato_em)}</p>
                      )}
                      {usuario.papel !== "vendedor" && c.vendedor_nome && <p className="text-[11px] text-muted-foreground">{c.vendedor_nome}</p>}
                    </Link>
                    {(etapa === "lead" || etapa === "negociacao") && <MoverCartao id={c.id!} etapa={etapa} />}
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </Conteudo>
    </>
  );
}

import Link from "next/link";
import { pode } from "@/lib/auth/permissoes";
import { Plus, Users, ChevronRight, KanbanSquare, BellRing } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Busca, Chips } from "@/components/cadastros/busca";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ETAPA_FUNIL, ORIGEM_LEAD } from "@/lib/clientes/rotulos";
import { formatarTelefone } from "@/lib/format/telefone";
import { formatarData } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";

type Etapa = Database["public"]["Enums"]["etapa_funil"];
type Origem = Database["public"]["Enums"]["origem_lead"];

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; etapa?: string; origem?: string; vendedor?: string; followup?: string }>;
}) {
  const usuario = await exigirPermissao("clientes");
  const f = await searchParams;
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("v_clientes")
    .select("id, nome, telefone, whatsapp, cidade, origem, etapa, vendedor_nome, interesses, proximo_contato_em, followup_pendente, ultimo_contato_em")
    .is("anonimizado_em", null)
    .order("atualizado_em", { ascending: false })
    .limit(500);
  if (f.etapa && f.etapa in ETAPA_FUNIL) q = q.eq("etapa", f.etapa as Etapa);
  if (f.origem && f.origem in ORIGEM_LEAD) q = q.eq("origem", f.origem as Origem);
  if (f.vendedor) q = q.eq("vendedor_id", f.vendedor);
  if (f.followup) q = q.eq("followup_pendente", true);
  const { data } = await q;
  const termo = normalizarTexto(f.q);
  const lista = (data ?? []).filter(
    (c) => !termo || normalizarTexto(`${c.nome} ${c.telefone ?? ""} ${c.whatsapp ?? ""} ${c.cidade ?? ""} ${c.interesses ?? ""}`).includes(termo),
  );
  const pendentes = (data ?? []).filter((c) => c.followup_pendente).length;

  return (
    <>
      <Cabecalho
        titulo={usuario.papel === "vendedor" ? "Meus clientes" : "Clientes"}
        subtitulo={`${lista.length} cliente(s)`}
        acoes={
          <>
            <Button asChild size="sm" variant="outline"><Link href="/clientes/funil"><KanbanSquare /> Funil</Link></Button>
            {pode(usuario.papel, "clientes.criar") && <Button asChild size="sm"><Link href="/clientes/novo"><Plus /> Novo</Link></Button>}
          </>
        }
      />
      <Conteudo className="flex flex-col gap-3">
        <Busca placeholder="Buscar nome, telefone ou carro de interesse" />
        <Chips parametro="etapa" opcoes={Object.entries(ETAPA_FUNIL).map(([valor, e]) => ({ valor, rotulo: e.rotulo }))} />
        {pendentes > 0 && !f.followup && (
          <Link href="?followup=1" className="flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/15 px-3 py-2.5 text-sm">
            <BellRing className="size-4" /> {pendentes} cliente(s) com retorno marcado para hoje ou atrasado
          </Link>
        )}
        {f.followup && <Link href="?" className="text-sm text-primary hover:underline">Ver todos os clientes</Link>}
        {lista.length === 0 ? (
          <Vazio icone={Users} titulo={f.q ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}>
            {pode(usuario.papel, "clientes.criar") && <Link href="/clientes/novo" className="text-primary hover:underline">Cadastrar cliente</Link>}
          </Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {lista.map((c) => {
              const etapa = ETAPA_FUNIL[c.etapa!];
              return (
                <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {c.nome}
                      {c.followup_pendente && <BellRing className="size-3.5 shrink-0 text-warning-foreground dark:text-warning" aria-label="Retorno pendente" />}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[(c.whatsapp || c.telefone) && formatarTelefone(c.whatsapp || c.telefone), ORIGEM_LEAD[c.origem!], c.interesses].filter(Boolean).join(" · ")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {usuario.papel !== "vendedor" && (c.vendedor_nome ? `${c.vendedor_nome} · ` : "Sem vendedor · ")}
                      {c.proximo_contato_em ? `Retornar em ${formatarData(c.proximo_contato_em)}` : c.ultimo_contato_em ? `Último contato ${formatarData(c.ultimo_contato_em)}` : "Sem contato registrado"}
                    </p>
                  </div>
                  <Badge variant={etapa.variante}>{etapa.rotulo}</Badge>
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

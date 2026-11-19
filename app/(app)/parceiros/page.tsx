import Link from "next/link";
import { Plus, Share2, ChevronRight } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Busca } from "@/components/cadastros/busca";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIPOS_PARCEIRO } from "@/lib/cadastros/esquemas";
import { formatarTelefone } from "@/lib/format/telefone";
import { normalizarTexto } from "@/lib/utils";

export default async function Parceiros({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string }> }) {
  await exigirPermissao("parceiros");
  const { q, situacao } = await searchParams;
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("parceiros")
    .select("id, nome, tipo, telefone, whatsapp, cidade, ativo")
    .eq("ativo", situacao !== "inativos")
    .order("nome")
    .limit(300);
  const termo = normalizarTexto(q);
  const lista = (data ?? []).filter((p) => !termo || normalizarTexto(`${p.nome} ${p.cidade ?? ""}`).includes(termo));
  return (
    <>
      <Cabecalho
        titulo="Parceiros"
        subtitulo="Indicação e corretagem"
        acoes={<Button asChild size="sm"><Link href="/parceiros/novo"><Plus /> Novo</Link></Button>}
      />
      <Conteudo className="flex flex-col gap-3">
        <Busca placeholder="Buscar parceiro" />
        <div className="flex justify-end">
          <Link href={situacao === "inativos" ? "?" : "?situacao=inativos"} className="text-sm text-primary hover:underline">
            {situacao === "inativos" ? "Ver ativos" : "Ver inativos"}
          </Link>
        </div>
        {lista.length === 0 ? (
          <Vazio icone={Share2} titulo={q ? "Nenhum parceiro encontrado" : "Nenhum parceiro cadastrado"}>
            <Link href="/parceiros/novo" className="text-primary hover:underline">Cadastrar parceiro</Link>
          </Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {lista.map((p) => (
              <Link key={p.id} href={`/parceiros/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.nome}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[p.cidade, (p.whatsapp || p.telefone) && formatarTelefone(p.whatsapp || p.telefone)].filter(Boolean).join(" · ") || "Sem dados de contato"}
                  </p>
                </div>
                <Badge variant="secondary">{TIPOS_PARCEIRO[p.tipo]}</Badge>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

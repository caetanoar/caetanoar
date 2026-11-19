import Link from "next/link";
import { Plus, UserRound, ChevronRight } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Busca } from "@/components/cadastros/busca";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mascararCPF, formatarDocumento } from "@/lib/format/documentos";
import { formatarTelefone } from "@/lib/format/telefone";
import { normalizarTexto } from "@/lib/utils";

export default async function Consignantes({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string }> }) {
  await exigirPermissao("consignantes");
  const { q, situacao } = await searchParams;
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("consignantes")
    .select("id, nome, documento, telefone, whatsapp, cidade, ativo")
    .eq("ativo", situacao !== "inativos")
    .order("nome")
    .limit(300);
  const termo = normalizarTexto(q);
  const lista = (data ?? []).filter((c) => !termo || normalizarTexto(`${c.nome} ${c.documento ?? ""} ${c.cidade ?? ""}`).includes(termo));

  return (
    <>
      <Cabecalho
        titulo="Consignantes"
        subtitulo="Donos dos carros consignados"
        acoes={<Button asChild size="sm"><Link href="/consignantes/novo"><Plus /> Novo</Link></Button>}
      />
      <Conteudo className="flex flex-col gap-3">
        <Busca placeholder="Buscar por nome, documento ou cidade" />
        <div className="flex justify-end">
          <Link href={situacao === "inativos" ? "?" : "?situacao=inativos"} className="text-sm text-primary hover:underline">
            {situacao === "inativos" ? "Ver ativos" : "Ver inativos"}
          </Link>
        </div>
        {lista.length === 0 ? (
          <Vazio icone={UserRound} titulo={q ? "Nenhum consignante encontrado" : "Nenhum consignante cadastrado"}>
            <Link href="/consignantes/novo" className="text-primary hover:underline">Cadastrar consignante</Link>
          </Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {lista.map((c) => (
              <Link key={c.id} href={`/consignantes/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nome}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[
                      c.documento && (c.documento.length === 11 ? mascararCPF(c.documento) : formatarDocumento(c.documento)),
                      c.cidade,
                      (c.whatsapp || c.telefone) && formatarTelefone(c.whatsapp || c.telefone),
                    ].filter(Boolean).join(" · ") || "Sem dados de contato"}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

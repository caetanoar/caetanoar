import Link from "next/link";
import { Plus, Truck, ChevronRight } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Busca, Chips } from "@/components/cadastros/busca";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIPOS_FORNECEDOR } from "@/lib/cadastros/esquemas";
import { formatarDocumento } from "@/lib/format/documentos";
import { formatarTelefone } from "@/lib/format/telefone";
import { normalizarTexto } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";

type Tipo = Database["public"]["Enums"]["tipo_fornecedor"];

export default async function Fornecedores({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; situacao?: string }> }) {
  await exigirPermissao("fornecedores");
  const { q, tipo, situacao } = await searchParams;
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("fornecedores")
    .select("id, nome, razao_social, tipo, documento, telefone, whatsapp, cidade, ativo")
    .order("nome")
    .limit(200);
  if (tipo && tipo in TIPOS_FORNECEDOR) consulta = consulta.eq("tipo", tipo as Tipo);
  consulta = consulta.eq("ativo", situacao !== "inativos");
  const { data } = await consulta;
  const termo = normalizarTexto(q);
  const lista = (data ?? []).filter(
    (f) => !termo || normalizarTexto(`${f.nome} ${f.razao_social ?? ""} ${f.documento ?? ""} ${f.cidade ?? ""}`).includes(termo),
  );

  return (
    <>
      <Cabecalho
        titulo="Fornecedores"
        subtitulo="Locadoras, lojistas, particulares, oficinas e despachantes"
        acoes={<Button asChild size="sm"><Link href="/fornecedores/novo"><Plus /> Novo</Link></Button>}
      />
      <Conteudo className="flex flex-col gap-3">
        <Busca placeholder="Buscar por nome, CNPJ/CPF ou cidade" />
        <Chips parametro="tipo" opcoes={Object.entries(TIPOS_FORNECEDOR).map(([valor, rotulo]) => ({ valor, rotulo }))} />
        <div className="flex justify-end">
          <Link href={situacao === "inativos" ? "?" : "?situacao=inativos"} className="text-sm text-primary hover:underline">
            {situacao === "inativos" ? "Ver ativos" : "Ver inativos"}
          </Link>
        </div>
        {lista.length === 0 ? (
          <Vazio icone={Truck} titulo={q ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}>
            <Link href="/fornecedores/novo" className="text-primary hover:underline">Cadastrar fornecedor</Link>
          </Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {lista.map((f) => (
              <Link key={f.id} href={`/fornecedores/${f.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.nome}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[f.documento && formatarDocumento(f.documento), f.cidade, (f.whatsapp || f.telefone) && formatarTelefone(f.whatsapp || f.telefone)]
                      .filter(Boolean)
                      .join(" · ") || "Sem dados de contato"}
                  </p>
                </div>
                <Badge variant="secondary">{TIPOS_FORNECEDOR[f.tipo]}</Badge>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

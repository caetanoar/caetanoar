import { Lock } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NATUREZA } from "@/lib/financeiro/rotulos";
import { FormCategoria } from "./form-categoria";

export default async function Categorias() {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("categorias_financeiras").select("*").order("tipo").order("grupo").order("nome");
  const lista = (data ?? []).filter((c) => c.natureza !== "transferencia");
  return (
    <>
      <Cabecalho titulo="Categorias" voltar="/financeiro" acoes={<FormCategoria />} />
      <Conteudo className="grid max-w-4xl gap-4 md:grid-cols-2">
        {(["receita", "despesa"] as const).map((tipo) => (
          <Card key={tipo}>
            <CardHeader><CardTitle>{tipo === "receita" ? "Receitas" : "Despesas"}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {lista.filter((c) => c.tipo === tipo).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {c.nome} {c.sistema && <Lock className="size-3 text-muted-foreground" aria-label="Usada pelas automações" />}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.grupo}</p>
                    </div>
                    {c.natureza !== "operacional" && <Badge variant="outline">{NATUREZA[c.natureza]}</Badge>}
                    {!c.ativa && <Badge variant="muted">Inativa</Badge>}
                    <FormCategoria categoria={c} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </Conteudo>
    </>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { salvarMetas } from "./acoes";
import { useAcao } from "@/components/form/use-acao";
import { InputMoeda } from "@/components/form/inputs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";

type Linha = { vendedorId: string | null; nome: string; meta: { meta_faturamento: number | null; meta_lucro: number | null; meta_qtd_vendas: number | null } | null };

export function FormMetas({ mes, linhas, podeEditar }: { mes: string; linhas: Linha[]; podeEditar: boolean }) {
  const [estado, despachar, pendente] = useAcao(salvarMetas);
  const chaves = linhas.map((l) => l.vendedorId ?? "loja");
  return (
    <form onSubmit={despachar} className="flex flex-col gap-3">
      <input type="hidden" name="mes" value={mes} />
      <input type="hidden" name="linhas" value={JSON.stringify(chaves)} />
      {!podeEditar && <Alerta variante="info">Somente o dono define as metas.</Alerta>}
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
      {linhas.map((l) => {
        const k = l.vendedorId ?? "loja";
        return (
          <Card key={k}>
            <CardHeader><CardTitle>{l.nome}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`fat_${k}`}>Faturamento</Label>
                <InputMoeda id={`fat_${k}`} name={`fat_${k}`} defaultValue={l.meta?.meta_faturamento ?? null} disabled={!podeEditar} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`lucro_${k}`}>Lucro</Label>
                <InputMoeda id={`lucro_${k}`} name={`lucro_${k}`} defaultValue={l.meta?.meta_lucro ?? null} disabled={!podeEditar} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`qtd_${k}`}>Número de vendas</Label>
                <Input id={`qtd_${k}`} name={`qtd_${k}`} inputMode="numeric" defaultValue={l.meta?.meta_qtd_vendas ?? ""} disabled={!podeEditar} />
              </div>
            </CardContent>
          </Card>
        );
      })}
      {podeEditar && <Button type="submit" size="lg" disabled={pendente} className="sm:self-end">{pendente && <Loader2 className="animate-spin" />} Salvar metas</Button>}
      <p className="text-xs text-muted-foreground">O vendedor vê só a própria meta de vendas e de faturamento (a de lucro fica com a gestão).</p>
    </form>
  );
}

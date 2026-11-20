"use client";

import { Loader2 } from "lucide-react";
import { salvarConfigOrcamentos } from "@/lib/orcamentos/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Campo } from "@/components/form/campo";
import { Alerta } from "@/components/ui/misc";

type Props = { validadeDias: number | null; limiteVendedor: number | null; limiteGerente: number | null; taxas: string };

export function FormConfigOrcamentos({ validadeDias, limiteVendedor, limiteGerente, taxas }: Props) {
  const [estado, aoEnviar, pendente] = useAcao(salvarConfigOrcamentos);
  const e = estado.erros ?? {};
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <Alerta variante="info">
          Campos vazios mantêm o modo seguro: sem validade padrão o vendedor escolhe a data; sem limite, todo desconto abaixo do valor negociável do carro vai para aprovação; sem taxas, a simulação de financiamento não aparece.
        </Alerta>
        <form onSubmit={aoEnviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="orcamento_validade_dias" rotulo="Validade padrão (dias)" dica="Vazio = o vendedor escolhe em cada orçamento" erro={e.orcamento_validade_dias} className="sm:col-span-2">
            <Input id="orcamento_validade_dias" name="orcamento_validade_dias" type="number" min={1} max={90} inputMode="numeric" defaultValue={validadeDias ?? ""} />
          </Campo>
          <Campo id="limite_vendedor" rotulo="Desconto máximo do vendedor (%)" dica="Sobre o preço anunciado. Acima disso, o gerente ou o dono aprova" erro={e.limite_vendedor}>
            <Input id="limite_vendedor" name="limite_vendedor" inputMode="decimal" defaultValue={limiteVendedor ?? ""} />
          </Campo>
          <Campo id="limite_gerente" rotulo="Desconto máximo do gerente (%)" dica="Acima disso, só o dono aprova. Vazio: o gerente aprova até o preço mínimo do carro" erro={e.limite_gerente}>
            <Input id="limite_gerente" name="limite_gerente" inputMode="decimal" defaultValue={limiteGerente ?? ""} />
          </Campo>
          <Campo id="taxas" rotulo="Taxas da simulação de financiamento" dica="Uma linha por prazo: meses; taxa ao mês (ex.: 48; 1,99)" erro={e.taxas} className="sm:col-span-2">
            <Textarea id="taxas" name="taxas" rows={5} placeholder={"24; 1,79\n36; 1,89\n48; 1,99"} defaultValue={taxas} />
          </Campo>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            O preço mínimo de cada carro (e o valor mínimo do consignante) continua valendo: abaixo dele, só o dono aprova, qualquer que seja o limite.
          </p>
          <Button type="submit" disabled={pendente} className="sm:col-span-2">{pendente && <Loader2 className="animate-spin" />} Salvar</Button>
        </form>
      </CardContent>
    </Card>
  );
}

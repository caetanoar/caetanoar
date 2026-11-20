"use client";

import { Loader2 } from "lucide-react";
import { salvarConfigConsulta } from "@/lib/consulta-veicular/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Campo } from "@/components/form/campo";
import { InputMoeda } from "@/components/form/inputs";

type Cfg = {
  consulta_custo_unitario: number;
  consulta_limite_mensal_qtd: number | null;
  consulta_limite_mensal_valor: number | null;
  consulta_cache_dias: number;
  consulta_validade_venda_dias: number;
};

export function FormConsultaVeicular({ cfg }: { cfg: Cfg }) {
  const [estado, aoEnviar, pendente] = useAcao(salvarConfigConsulta);
  const e = estado.erros ?? {};
  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={aoEnviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="consulta_custo_unitario" rotulo="Custo por consulta" dica="Valor do contrato com o provedor (o simulado é grátis)" erro={e.consulta_custo_unitario}>
            <InputMoeda id="consulta_custo_unitario" name="consulta_custo_unitario" defaultValue={Number(cfg.consulta_custo_unitario)} />
          </Campo>
          <Campo id="consulta_limite_mensal_qtd" rotulo="Limite de consultas por mês" dica="Vazio = sem limite" erro={e.consulta_limite_mensal_qtd}>
            <Input id="consulta_limite_mensal_qtd" name="consulta_limite_mensal_qtd" type="number" min={1} inputMode="numeric" defaultValue={cfg.consulta_limite_mensal_qtd ?? ""} />
          </Campo>
          <Campo id="consulta_limite_mensal_valor" rotulo="Limite de gasto por mês" dica="Vazio = sem limite" erro={e.consulta_limite_mensal_valor}>
            <InputMoeda id="consulta_limite_mensal_valor" name="consulta_limite_mensal_valor" defaultValue={cfg.consulta_limite_mensal_valor ?? undefined} />
          </Campo>
          <Campo id="consulta_cache_dias" rotulo="Reaproveitar consulta por (dias)" dica="Evita pagar duas vezes pela mesma placa" erro={e.consulta_cache_dias}>
            <Input id="consulta_cache_dias" name="consulta_cache_dias" type="number" min={0} max={90} inputMode="numeric" defaultValue={cfg.consulta_cache_dias} />
          </Campo>
          <Campo id="consulta_validade_venda_dias" rotulo="Validade da consulta para vender (dias)" dica="Mais antiga que isso, a venda pede nova consulta" erro={e.consulta_validade_venda_dias} className="sm:col-span-2">
            <Input id="consulta_validade_venda_dias" name="consulta_validade_venda_dias" type="number" min={1} max={90} inputMode="numeric" defaultValue={cfg.consulta_validade_venda_dias} />
          </Campo>
          <Button type="submit" disabled={pendente} className="sm:col-span-2">{pendente && <Loader2 className="animate-spin" />} Salvar</Button>
        </form>
      </CardContent>
    </Card>
  );
}

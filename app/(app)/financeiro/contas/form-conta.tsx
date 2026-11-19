"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { salvarConta } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputData, InputMoeda } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { TIPO_CONTA } from "@/lib/financeiro/rotulos";
import { hojeISO } from "@/lib/format/data";
import type { Database } from "@/lib/supabase/database.types";

type Conta = Database["public"]["Tables"]["contas_financeiras"]["Row"];

export function FormConta({ conta }: { conta?: Conta }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(salvarConta, { onSucesso: () => { setAberto(false); router.refresh(); } });
  const e = estado.erros ?? {};
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {conta ? <Button variant="ghost" size="icon-sm" aria-label={`Editar ${conta.nome}`}><Pencil /></Button> : <Button size="sm"><Plus /> Nova conta</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{conta ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>O saldo é calculado a partir do saldo inicial e dos lançamentos pagos depois dessa data.</DialogDescription>
        </DialogHeader>
        <form onSubmit={despachar} className="grid grid-cols-2 gap-3">
          {conta && <input type="hidden" name="id" value={conta.id} />}
          <Campo id="c-nome" rotulo="Nome" erro={e.nome} obrigatorio className="col-span-2">
            <Input name="nome" defaultValue={conta?.nome} placeholder="Ex.: Caixa da loja, Sicoob, Nubank" />
          </Campo>
          <Campo id="c-tipo" rotulo="Tipo" erro={e.tipo}>
            <Select name="tipo" defaultValue={conta?.tipo ?? "banco"}>
              {Object.entries(TIPO_CONTA).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </Campo>
          <Campo id="c-banco" rotulo="Banco" erro={e.banco}>
            <Input name="banco" defaultValue={conta?.banco ?? ""} />
          </Campo>
          <Campo id="c-agencia" rotulo="Agência">
            <Input name="agencia" defaultValue={conta?.agencia ?? ""} />
          </Campo>
          <Campo id="c-conta" rotulo="Conta">
            <Input name="conta" defaultValue={conta?.conta ?? ""} />
          </Campo>
          <Campo id="c-saldo" rotulo="Saldo inicial" erro={e.saldo_inicial}>
            <InputMoeda name="saldo_inicial" defaultValue={conta?.saldo_inicial ?? null} />
          </Campo>
          <Campo id="c-data" rotulo="Saldo em" erro={e.data_saldo_inicial}>
            <InputData name="data_saldo_inicial" defaultValue={conta?.data_saldo_inicial ?? hojeISO()} />
          </Campo>
          {conta && (
            <Campo id="c-ativa" rotulo="Situação" className="col-span-2">
              <Select name="ativa" defaultValue={String(conta.ativa)}>
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </Select>
            </Campo>
          )}
          <Button type="submit" disabled={pendente} className="col-span-2">{pendente && <Loader2 className="animate-spin" />} Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

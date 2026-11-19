"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { transferir } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputData, InputMoeda } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { hojeISO } from "@/lib/format/data";

export function NovaTransferencia({ contas }: { contas: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(transferir, { onSucesso: () => { setAberto(false); router.refresh(); } });
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label="Transferir entre contas"><ArrowLeftRight /> <span className="hidden sm:inline">Transferir</span></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferência entre contas</DialogTitle>
          <DialogDescription>Ex.: depósito do caixa no banco. Não conta como receita nem despesa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={despachar} className="flex flex-col gap-3">
          <Campo id="t-origem" rotulo="De" erro={estado.erros?.origem}>
            <Select name="origem" defaultValue="">
              <option value="" disabled>Conta de origem…</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>
          <Campo id="t-destino" rotulo="Para" erro={estado.erros?.destino}>
            <Select name="destino" defaultValue="">
              <option value="" disabled>Conta de destino…</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="t-valor" rotulo="Valor" erro={estado.erros?.valor}>
              <InputMoeda name="valor" />
            </Campo>
            <Campo id="t-data" rotulo="Data" erro={estado.erros?.data}>
              <InputData name="data" defaultValue={hojeISO()} />
            </Campo>
          </div>
          <Campo id="t-desc" rotulo="Descrição">
            <Input name="descricao" placeholder="Ex.: depósito do caixa" />
          </Campo>
          <Button type="submit" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Transferir</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

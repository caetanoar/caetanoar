"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { baixarLancamento } from "@/app/(app)/financeiro/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputData, InputMoeda } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FORMA_PAGAMENTO } from "@/lib/financeiro/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { hojeISO } from "@/lib/format/data";

export function BotaoBaixar({
  id,
  descricao,
  valor,
  tipo,
  contaId,
  forma,
  contas,
  compacto,
}: {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  contaId?: string | null;
  forma?: string | null;
  contas: { id: string; nome: string }[];
  compacto?: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(baixarLancamento, { onSucesso: () => { setAberto(false); router.refresh(); } });
  const receita = tipo === "receita";
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant={compacto ? "outline" : "success"}><CheckCircle2 /> {receita ? "Receber" : "Pagar"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{receita ? "Registrar recebimento" : "Registrar pagamento"}</DialogTitle>
          <DialogDescription>{descricao} · {formatarMoeda(valor)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={despachar} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <div className="grid grid-cols-2 gap-3">
            <Campo id={`bx-data-${id}`} rotulo="Data" erro={estado.erros?.data_pagamento}>
              <InputData name="data_pagamento" defaultValue={hojeISO()} />
            </Campo>
            <Campo id={`bx-valor-${id}`} rotulo="Valor" erro={estado.erros?.valor} dica="Mude se houve juros ou desconto">
              <InputMoeda name="valor" defaultValue={valor} />
            </Campo>
          </div>
          <Campo id={`bx-conta-${id}`} rotulo="Conta" erro={estado.erros?.conta_id} obrigatorio>
            <Select name="conta_id" defaultValue={contaId ?? ""}>
              <option value="" disabled>Escolha a conta…</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>
          <Campo id={`bx-forma-${id}`} rotulo="Forma de pagamento">
            <Select name="forma_pagamento" defaultValue={forma ?? "pix"}>
              {Object.entries(FORMA_PAGAMENTO).filter(([k]) => k !== "permuta").map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </Campo>
          <Button type="submit" variant="success" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Confirmar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

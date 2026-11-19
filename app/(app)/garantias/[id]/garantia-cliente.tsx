"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Settings2 } from "lucide-react";
import { salvarAcionamento, ajustarGarantia } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputData, InputMoeda } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { STATUS_ACIONAMENTO } from "@/lib/vendas/rotulos";
import { hojeISO } from "@/lib/format/data";
import type { Database } from "@/lib/supabase/database.types";

type Acionamento = Database["public"]["Tables"]["garantias_acionamentos"]["Row"];

export function FormAcionamento({ garantiaId, fornecedores, acionamento }: { garantiaId: string; fornecedores: { id: string; nome: string }[]; acionamento?: Acionamento }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(salvarAcionamento, { onSucesso: () => { setAberto(false); router.refresh(); } });
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {acionamento ? <Button size="sm" variant="ghost"><Pencil /> Atualizar</Button> : <Button size="sm"><Plus /> Acionar</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{acionamento ? "Atualizar acionamento" : "Registrar acionamento"}</DialogTitle></DialogHeader>
        <form onSubmit={despachar} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="garantia_id" value={garantiaId} />
          {acionamento && <input type="hidden" name="id" value={acionamento.id} />}
          <Campo id="a-desc" rotulo="Problema relatado" erro={estado.erros?.descricao} obrigatorio className="col-span-2">
            <Textarea name="descricao" defaultValue={acionamento?.descricao} rows={2} />
          </Campo>
          <Campo id="a-data" rotulo="Data">
            <InputData name="data_abertura" defaultValue={acionamento?.data_abertura ?? hojeISO()} />
          </Campo>
          <Campo id="a-status" rotulo="Situação">
            <Select name="status" defaultValue={acionamento?.status ?? "aberto"}>
              {Object.entries(STATUS_ACIONAMENTO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </Campo>
          <Campo id="a-custo" rotulo="Custo" erro={estado.erros?.custo}>
            <InputMoeda name="custo" defaultValue={acionamento?.custo ?? null} />
          </Campo>
          <Campo id="a-forn" rotulo="Oficina">
            <Select name="fornecedor_id" defaultValue={acionamento?.fornecedor_id ?? ""}>
              <option value="">Não informado</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </Select>
          </Campo>
          <Campo id="a-sol" rotulo="Solução" className="col-span-2">
            <Input name="solucao" defaultValue={acionamento?.solucao ?? ""} />
          </Campo>
          <Button type="submit" disabled={pendente} className="col-span-2">{pendente && <Loader2 className="animate-spin" />} Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AjustarGarantia({ garantia }: { garantia: { id: string; dias: number; cobertura: string | null; observacoes: string | null } }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(ajustarGarantia, { onSucesso: () => { setAberto(false); router.refresh(); } });
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Settings2 /> Ajustar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajustar garantia</DialogTitle></DialogHeader>
        <form onSubmit={despachar} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={garantia.id} />
          <Campo id="g-dias" rotulo="Prazo (dias)" erro={estado.erros?.dias}>
            <Input name="dias" type="number" inputMode="numeric" defaultValue={garantia.dias} />
          </Campo>
          <Campo id="g-cob" rotulo="Cobertura">
            <Textarea name="cobertura" defaultValue={garantia.cobertura ?? ""} rows={3} />
          </Campo>
          <Campo id="g-obs" rotulo="Observações">
            <Textarea name="observacoes" defaultValue={garantia.observacoes ?? ""} rows={2} />
          </Campo>
          <Button type="submit" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

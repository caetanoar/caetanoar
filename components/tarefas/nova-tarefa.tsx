"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { criarTarefa } from "@/lib/tarefas/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Campo } from "@/components/form/campo";
import { InputData } from "@/components/form/inputs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Pessoa = { id: string; nome: string };

/** Nova tarefa. A gestão escolhe o responsável; os demais criam para si. */
export function NovaTarefa({
  pessoas,
  eu,
  entidade,
  entidadeId,
  voltar,
  rotulo = "Nova tarefa",
}: {
  pessoas?: Pessoa[];
  eu: string;
  entidade?: string;
  entidadeId?: string;
  voltar?: string;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, aoEnviar, pendente] = useAcao(criarTarefa, { onSucesso: () => setAberto(false) });
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus /> {rotulo}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Com responsável e prazo, ela aparece em &quot;Minhas tarefas&quot;.</DialogDescription>
        </DialogHeader>
        <form onSubmit={aoEnviar} className="flex flex-col gap-3">
          <input type="hidden" name="entidade" value={entidade ?? ""} />
          <input type="hidden" name="entidade_id" value={entidadeId ?? ""} />
          <input type="hidden" name="voltar" value={voltar ?? ""} />
          <Campo id="tarefa-titulo" rotulo="O que fazer" erro={estado.erros?.titulo} obrigatorio>
            <Input id="tarefa-titulo" name="titulo" placeholder="Ex.: levar o carro para a vistoria" autoFocus />
          </Campo>
          <Campo id="tarefa-descricao" rotulo="Detalhes">
            <Textarea id="tarefa-descricao" name="descricao" rows={2} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="tarefa-prazo" rotulo="Prazo" erro={estado.erros?.prazo}>
              <InputData id="tarefa-prazo" name="prazo" />
            </Campo>
            {pessoas && pessoas.length > 0 && (
              <Campo id="tarefa-resp" rotulo="Responsável">
                <Select id="tarefa-resp" name="responsavel_id" defaultValue={eu}>
                  {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Select>
              </Campo>
            )}
          </div>
          <Button type="submit" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Criar tarefa</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

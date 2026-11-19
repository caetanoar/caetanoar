"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { alterarStatus } from "@/app/(app)/estoque/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { STATUS_VEICULO } from "@/lib/estoque/rotulos";

type Status = keyof typeof STATUS_VEICULO;

/** Botões para mudar a situação do carro conforme o tipo e o status atual. */
export function AcoesStatus({ id, status, tipo }: { id: string; status: Status; tipo: "proprio" | "consignado" }) {
  const router = useRouter();
  const [devolverAberto, setDevolverAberto] = useState(false);
  const [, despachar, pendente] = useAcao(alterarStatus, { onSucesso: () => { setDevolverAberto(false); router.refresh(); } });
  if (status === "vendido" || status === "devolvido") return null;

  const opcoes: Status[] = (tipo === "proprio" ? ["em_preparacao", "disponivel", "reservado"] : ["disponivel", "reservado"]) as Status[];

  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.filter((o) => o !== status).map((o) => (
        <form key={o} onSubmit={despachar}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={o} />
          <Button type="submit" variant="outline" size="sm" disabled={pendente}>
            {pendente && <Loader2 className="animate-spin" />} Marcar como {STATUS_VEICULO[o].rotulo.toLowerCase()}
          </Button>
        </form>
      ))}
      {tipo === "consignado" && (
        <Dialog open={devolverAberto} onOpenChange={setDevolverAberto}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Undo2 /> Devolver ao dono</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Devolver carro ao dono?</DialogTitle>
              <DialogDescription>O carro sai do estoque e a consignação é encerrada.</DialogDescription>
            </DialogHeader>
            <form onSubmit={despachar} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="devolvido" />
              <Textarea name="motivo" placeholder="Motivo (opcional)" rows={2} aria-label="Motivo da devolução" />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDevolverAberto(false)}>Cancelar</Button>
                <Button type="submit" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Confirmar devolução</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

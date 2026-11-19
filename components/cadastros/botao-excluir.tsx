"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { EstadoAcao } from "@/lib/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** Exclusão com confirmação. Se o registro tiver vínculos, o banco recusa e a mensagem sugere inativar. */
export function BotaoExcluir({
  id,
  acao,
  titulo = "Excluir registro?",
  descricao = "Esta ação fica registrada na auditoria e não pode ser desfeita.",
  destino,
  rotulo = "Excluir",
}: {
  id: string;
  acao: (estado: EstadoAcao, fd: FormData) => Promise<EstadoAcao>;
  titulo?: string;
  descricao?: string;
  destino?: string;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();
  const [, despachar, pendente] = useAcao(acao, {
    onSucesso: () => {
      setAberto(false);
      if (destino) router.push(destino);
      else router.refresh();
    },
  });
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"><Trash2 /> {rotulo}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <form onSubmit={despachar}>
          <input type="hidden" name="id" value={id} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={pendente}>
              {pendente && <Loader2 className="animate-spin" />} {rotulo}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

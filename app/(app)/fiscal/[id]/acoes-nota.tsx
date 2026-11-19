"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, XCircle } from "lucide-react";
import { consultarNota, cancelarNota } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alerta } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AcoesNota({ id, podeCancelar, podeConsultar }: { id: string; podeCancelar: boolean; podeConsultar: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [, consultar, consultando] = useAcao(consultarNota, { onSucesso: () => router.refresh() });
  const [estado, cancelar, cancelando] = useAcao(cancelarNota, { onSucesso: () => { setAberto(false); router.refresh(); } });
  return (
    <>
      {podeConsultar && (
        <form onSubmit={consultar}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="outline" size="sm" disabled={consultando}>{consultando ? <Loader2 className="animate-spin" /> : <RefreshCw />} Consultar situação</Button>
        </form>
      )}
      {podeCancelar && (
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><XCircle /> Cancelar NF-e</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar NF-e?</DialogTitle>
              <DialogDescription>A SEFAZ aceita o cancelamento em até 24 horas da autorização (regra geral). Informe o motivo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={cancelar} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={id} />
              {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
              <Textarea name="justificativa" rows={3} placeholder="Mínimo de 15 caracteres" aria-label="Justificativa" />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAberto(false)}>Voltar</Button>
                <Button type="submit" variant="destructive" disabled={cancelando}>{cancelando && <Loader2 className="animate-spin" />} Cancelar nota</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

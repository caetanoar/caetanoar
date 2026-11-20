"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { marcarItemChecklist } from "@/lib/tarefas/acoes";
import { Checkbox } from "@/components/ui/checkbox";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { cn } from "@/lib/utils";

export type ItemChecklist = { id: string; item: string; feito: boolean; feito_em: string | null; feito_por: string | null; prazo: string | null; observacao: string | null };

/** Checklist com marcação na hora (otimista) e registro de quem fez. */
export function Checklist({ itens, voltar, podeMarcar, hoje }: { itens: ItemChecklist[]; voltar: string; podeMarcar: boolean; hoje: string }) {
  const [lista, marcar] = useOptimistic(itens, (atual, { id, feito }: { id: string; feito: boolean }) =>
    atual.map((i) => (i.id === id ? { ...i, feito } : i)),
  );
  const [, iniciar] = useTransition();
  const feitos = lista.filter((i) => i.feito).length;

  function alternar(i: ItemChecklist, feito: boolean) {
    iniciar(async () => {
      marcar({ id: i.id, feito });
      const fd = new FormData();
      fd.set("id", i.id);
      fd.set("feito", String(feito));
      fd.set("voltar", voltar);
      const r = await marcarItemChecklist({ ok: false }, fd);
      if (!r.ok) toast.error(r.erro ?? "Não foi possível marcar.");
    });
  }

  if (!lista.length) return <p className="text-sm text-muted-foreground">Sem itens.</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground" aria-live="polite">{feitos} de {lista.length} concluído(s)</p>
      <ul className="divide-y">
        {lista.map((i) => {
          const atrasado = !i.feito && i.prazo !== null && i.prazo < hoje;
          return (
            <li key={i.id} className="flex items-start gap-3 py-2.5">
              <Checkbox
                id={`chk-${i.id}`}
                checked={i.feito}
                disabled={!podeMarcar}
                onCheckedChange={(c) => alternar(i, c === true)}
                aria-label={i.item}
                className="mt-0.5"
              />
              <label htmlFor={`chk-${i.id}`} className="min-w-0 flex-1 text-sm">
                <span className={cn(i.feito && "text-muted-foreground line-through")}>{i.item}</span>
                <span className="block text-xs text-muted-foreground">
                  {i.feito && i.feito_em ? `Feito ${i.feito_por ? `por ${i.feito_por} ` : ""}em ${formatarDataHora(i.feito_em)}` : null}
                  {!i.feito && i.prazo && (
                    <span className={cn("inline-flex items-center gap-1", atrasado && "font-semibold text-destructive")}>
                      <CalendarClock className="size-3" /> prazo {formatarData(i.prazo)}
                    </span>
                  )}
                </span>
                {i.observacao && <span className="block text-xs text-muted-foreground">{i.observacao}</span>}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

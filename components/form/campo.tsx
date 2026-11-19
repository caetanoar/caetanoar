import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Rótulo + controle + dica/erro, com acessibilidade (aria-describedby). */
export function Campo({
  id,
  rotulo,
  erro,
  dica,
  obrigatorio,
  className,
  children,
}: {
  id: string;
  rotulo: React.ReactNode;
  erro?: string | string[] | null;
  dica?: React.ReactNode;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  const mensagem = Array.isArray(erro) ? erro[0] : erro;
  const descId = mensagem ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {rotulo}
        {obrigatorio && <span className="text-destructive" aria-hidden>*</span>}
      </Label>
      {React.cloneElement(children, {
        id,
        "aria-invalid": mensagem ? true : undefined,
        "aria-describedby": descId,
      })}
      {mensagem ? (
        <p id={`${id}-erro`} className="text-xs text-destructive">{mensagem}</p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">{dica}</p>
      ) : null}
    </div>
  );
}

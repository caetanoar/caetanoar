"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Botão "Copiar" com confirmação visual. */
export function BotaoCopiar({ texto, rotulo = "Copiar", className }: { texto: string; rotulo?: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      aria-label={rotulo}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          toast.success("Copiado.");
          setTimeout(() => setCopiado(false), 1500);
        } catch {
          toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
        }
      }}
    >
      {copiado ? <Check /> : <Copy />} {rotulo}
    </Button>
  );
}

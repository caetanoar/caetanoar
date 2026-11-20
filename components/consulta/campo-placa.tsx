"use client";

import { useFormStatus } from "react-dom";
import { Search, Loader2 } from "lucide-react";
import { buscarPlaca } from "@/lib/consulta-veicular/acoes";
import { InputPlaca } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" disabled={pending} aria-label="Consultar placa">
      {pending ? <Loader2 className="animate-spin" /> : <Search />}
    </Button>
  );
}

/** Campo de placa em destaque: procura no estoque e, se não achar, consulta fora. */
export function CampoPlaca({ className }: { className?: string }) {
  return (
    <form action={buscarPlaca} className={cn("flex items-center gap-2", className)} role="search" aria-label="Consultar placa">
      <InputPlaca name="placa" aria-label="Placa do carro" placeholder="Placa (ABC1D23)" className="numero tracking-widest uppercase" required />
      <Enviar />
    </form>
  );
}

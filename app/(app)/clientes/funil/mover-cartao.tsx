"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { moverEtapa } from "../acoes";
import { useAcao } from "@/components/form/use-acao";

/** Atalho para avançar o cartão no funil (perda e ganho ficam na ficha do cliente). */
export function MoverCartao({ id, etapa }: { id: string; etapa: "lead" | "negociacao" }) {
  const router = useRouter();
  const [, despachar, pendente] = useAcao(moverEtapa, { onSucesso: () => router.refresh(), toastSucesso: false });
  if (etapa !== "lead") return null;
  return (
    <form onSubmit={despachar} className="mt-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="etapa" value="negociacao" />
      <button type="submit" disabled={pendente} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        Mover para negociação <ArrowRight className="size-3" />
      </button>
    </form>
  );
}

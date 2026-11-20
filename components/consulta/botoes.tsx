"use client";

import { useRouter } from "next/navigation";
import { RefreshCw, Search, Loader2 } from "lucide-react";
import { atualizarConsulta, consultarAgora } from "@/lib/consulta-veicular/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";

export function BotaoConsulta({ placa, atualizar, custo }: { placa: string; atualizar?: boolean; custo?: string | null }) {
  const router = useRouter();
  const [, aoEnviar, pendente] = useAcao(atualizar ? atualizarConsulta : consultarAgora, { onSucesso: () => router.refresh() });
  return (
    <form onSubmit={aoEnviar}>
      <input type="hidden" name="placa" value={placa} />
      <Button type="submit" variant={atualizar ? "outline" : "default"} disabled={pendente} className="w-full">
        {pendente ? <Loader2 className="animate-spin" /> : atualizar ? <RefreshCw /> : <Search />}
        {atualizar ? "Atualizar consulta" : "Consultar leilão, sinistro, gravame e débitos"}
        {custo ? ` (${custo})` : ""}
      </Button>
    </form>
  );
}

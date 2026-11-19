import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LANCAMENTO } from "@/lib/financeiro/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { BotaoBaixar } from "./baixar";
import { cn } from "@/lib/utils";

export type ItemLancamento = {
  id: string | null;
  tipo: "receita" | "despesa" | "transferencia_saida" | "transferencia_entrada" | null;
  descricao: string | null;
  valor: number | null;
  status: "pendente" | "pago" | "cancelado" | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  categoria_nome: string | null;
  conta_nome: string | null;
  conta_id: string | null;
  forma_pagamento: string | null;
  vencido: boolean | null;
  pessoa: string | null;
  veiculo_nome: string | null;
  natureza: string | null;
};

export function ListaLancamentos({ itens, contas, mostrarBaixa = true }: { itens: ItemLancamento[]; contas: { id: string; nome: string }[]; mostrarBaixa?: boolean }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {itens.map((l) => {
        const entrada = l.tipo === "receita" || l.tipo === "transferencia_entrada";
        const transf = l.tipo?.startsWith("transferencia");
        const Icone = transf ? ArrowLeftRight : entrada ? ArrowDownLeft : ArrowUpRight;
        const st = STATUS_LANCAMENTO[l.status!];
        return (
          <li key={l.id} className="flex items-center gap-3 px-3 py-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", entrada ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive", transf && "bg-muted text-muted-foreground")}>
              <Icone className="size-4" />
            </span>
            <Link href={`/financeiro/lancamentos/${l.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{l.descricao}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[l.categoria_nome, l.pessoa, l.veiculo_nome].filter(Boolean).join(" · ")}
              </p>
              <p className={cn("flex items-center gap-1 text-xs", l.vencido ? "font-medium text-destructive" : "text-muted-foreground")}>
                {l.vencido && <AlertCircle className="size-3" />}
                {l.status === "pago"
                  ? `Pago em ${formatarData(l.data_pagamento)}${l.conta_nome ? ` · ${l.conta_nome}` : ""}`
                  : `Vence ${formatarData(l.data_vencimento)}`}
                {l.natureza === "terceiros" && <Badge variant="outline" className="ml-1">terceiros</Badge>}
              </p>
            </Link>
            <div className="flex flex-col items-end gap-1">
              <span className={cn("numero text-sm font-semibold", entrada ? "text-success" : "")}>
                {entrada ? "+" : "−"} {formatarMoeda(l.valor)}
              </span>
              {l.status === "pendente" && mostrarBaixa && (l.tipo === "receita" || l.tipo === "despesa") ? (
                <BotaoBaixar id={l.id!} descricao={l.descricao!} valor={Number(l.valor)} tipo={l.tipo} contaId={l.conta_id} forma={l.forma_pagamento} contas={contas} compacto />
              ) : (
                <Badge variant={st.variante}>{st.rotulo}</Badge>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

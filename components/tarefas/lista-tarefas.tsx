"use client";

import Link from "next/link";
import { Check, Play, RotateCcw, Loader2, CalendarClock, Bot } from "lucide-react";
import { mudarStatusTarefa } from "@/lib/tarefas/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_TAREFA, ENTIDADE_TAREFA, linkEntidade } from "@/lib/tarefas/rotulos";
import { formatarData, relativoDias } from "@/lib/format/data";
import type { TarefaLista } from "@/lib/tarefas/consultas";
import { cn } from "@/lib/utils";

function BotaoStatus({ id, status, rotulo, icone: Icone, voltar, variante = "outline" }: {
  id: string; status: TarefaLista["status"]; rotulo: string; icone: React.ComponentType; voltar?: string; variante?: "outline" | "success";
}) {
  const [, aoEnviar, pendente] = useAcao(mudarStatusTarefa);
  return (
    <form onSubmit={aoEnviar}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="voltar" value={voltar ?? ""} />
      <Button type="submit" size="sm" variant={variante} disabled={pendente} aria-label={rotulo}>
        {pendente ? <Loader2 className="animate-spin" /> : <Icone />} <span className="hidden sm:inline">{rotulo}</span>
      </Button>
    </form>
  );
}

export function ItemTarefa({ t, hoje, mostrarResponsavel, voltar }: { t: TarefaLista; hoje: string; mostrarResponsavel?: boolean; voltar?: string }) {
  const aberta = t.status === "pendente" || t.status === "em_andamento";
  const atrasada = aberta && t.prazo !== null && t.prazo < hoje;
  const link = linkEntidade(t.entidade, t.entidade_id);
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", !aberta && "text-muted-foreground line-through")}>{t.titulo}</p>
        {t.descricao && <p className="text-sm text-muted-foreground">{t.descricao}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant={STATUS_TAREFA[t.status].variante}>{STATUS_TAREFA[t.status].rotulo}</Badge>
          {t.prazo && (
            <span className={cn("inline-flex items-center gap-1", atrasada && "font-semibold text-destructive")}>
              <CalendarClock className="size-3.5" /> {formatarData(t.prazo)} ({relativoDias(t.prazo)})
            </span>
          )}
          {t.origem === "automatica" && <span className="inline-flex items-center gap-1"><Bot className="size-3.5" /> automática</span>}
          {mostrarResponsavel && <span>· {t.responsavel ?? "sem responsável"}</span>}
          {link && t.entidade && <Link href={link} className="text-primary hover:underline">· {ENTIDADE_TAREFA[t.entidade].rotulo}</Link>}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {t.status === "pendente" && <BotaoStatus id={t.id} status="em_andamento" rotulo="Começar" icone={Play} voltar={voltar} />}
        {aberta && <BotaoStatus id={t.id} status="concluida" rotulo="Concluir" icone={Check} voltar={voltar} variante="success" />}
        {!aberta && <BotaoStatus id={t.id} status="pendente" rotulo="Reabrir" icone={RotateCcw} voltar={voltar} />}
      </div>
    </li>
  );
}

export function ListaTarefas({ tarefas, hoje, mostrarResponsavel, voltar, vazio = "Nenhuma tarefa." }: {
  tarefas: TarefaLista[]; hoje: string; mostrarResponsavel?: boolean; voltar?: string; vazio?: string;
}) {
  if (!tarefas.length) return <p className="text-sm text-muted-foreground">{vazio}</p>;
  return (
    <ul className="divide-y">
      {tarefas.map((t) => <ItemTarefa key={t.id} t={t} hoje={hoje} mostrarResponsavel={mostrarResponsavel} voltar={voltar} />)}
    </ul>
  );
}

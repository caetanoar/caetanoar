import { CircleAlert, CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";
import type { Alerta } from "@/lib/orcamentos/rotulos";
import { formatarData } from "@/lib/format/data";
import { cn } from "@/lib/utils";

const NIVEL = {
  vermelho: { rotulo: "Impeditivo", icone: CircleAlert, classe: "text-destructive" },
  amarelo: { rotulo: "Atenção", icone: TriangleAlert, classe: "text-warning-foreground dark:text-warning" },
  pendente: { rotulo: "Pendente", icone: CircleDashed, classe: "text-muted-foreground" },
  info: { rotulo: "Consulta", icone: CircleCheck, classe: "text-success" },
} as const;

/** Lista de alertas do carro: cor + ícone + texto (nunca só a cor). Não há como ocultar um alerta. */
export function ListaAlertas({ alertas, vazio = "Nenhum alerta no cadastro do carro." }: { alertas: Alerta[]; vazio?: string }) {
  if (!alertas.length) return <p className="text-sm text-muted-foreground">{vazio}</p>;
  const ordem = { vermelho: 0, amarelo: 1, pendente: 2, info: 3 };
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {[...alertas].sort((a, b) => ordem[a.nivel] - ordem[b.nivel]).map((a, i) => {
        const n = NIVEL[a.nivel] ?? NIVEL.pendente;
        return (
          <li key={`${a.codigo}-${i}`} className="flex items-start gap-2.5 px-3 py-2.5 text-sm">
            <n.icone className={cn("mt-0.5 size-4 shrink-0", n.classe)} />
            <div className="min-w-0 flex-1">
              <p><span className={cn("font-semibold", n.classe)}>{n.rotulo}:</span> {a.descricao}</p>
              {a.fonte && a.nivel !== "info" && <p className="text-xs text-muted-foreground">{a.fonte}{a.data ? ` · ${formatarData(a.data)}` : ""}</p>}
              {!a.fonte && a.origem === "cadastro" && <p className="text-xs text-muted-foreground">Cadastro do carro{a.data ? ` · ${formatarData(a.data)}` : ""}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

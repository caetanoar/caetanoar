import { cn } from "@/lib/utils";

/** Indicador: rótulo, valor e uma linha de apoio (texto sempre em tinta neutra). */
export function Kpi({ rotulo, valor, apoio, destaque, className }: { rotulo: string; valor: string; apoio?: React.ReactNode; destaque?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5 rounded-xl border bg-card p-3", destaque && "border-primary/30 bg-primary/5", className)}>
      <span className="truncate text-xs text-muted-foreground">{rotulo}</span>
      <span className="numero truncate text-lg font-semibold leading-tight sm:text-xl">{valor}</span>
      {apoio && <span className="truncate text-xs text-muted-foreground">{apoio}</span>}
    </div>
  );
}

/** Barra de meta: realizado sobre a meta, trilho em tom claro da mesma cor. */
export function MedidorMeta({ rotulo, realizado, meta, formatar }: { rotulo: string; realizado: number; meta: number | null; formatar: (n: number) => string }) {
  const pct = meta && meta > 0 ? (realizado / meta) * 100 : null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{rotulo}</span>
        <span className="numero text-muted-foreground">
          <span className="font-semibold text-foreground">{formatar(realizado)}</span>
          {meta ? ` de ${formatar(meta)}` : " · sem meta definida"}
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-primary/15"
        role="meter"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={meta ?? 0}
        aria-valuenow={realizado}
        aria-valuetext={pct !== null ? `${Math.round(pct)}% da meta` : "sem meta"}
      >
        {pct !== null && <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />}
      </div>
      {pct !== null && <span className="numero text-xs text-muted-foreground">{Math.round(pct)}% da meta{pct >= 100 ? " · meta atingida ✓" : ""}</span>}
    </div>
  );
}

/** Barras verticais de uma série (ex.: vendas por mês) com rótulo no hover e tabela acessível. */
export function BarrasMensais({ titulo, dados, formatar }: { titulo: string; dados: { rotulo: string; valor: number; detalhe?: string }[]; formatar: (n: number) => string }) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-medium">{titulo}</figcaption>
      <div className="flex h-36 items-end gap-2 border-b border-border pb-px" aria-hidden>
        {dados.map((d, i) => (
          <div key={d.rotulo} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              tabIndex={0}
              className={cn("w-full rounded-t-[4px] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring", i === dados.length - 1 ? "bg-primary" : "bg-primary/45")}
              style={{ height: `${Math.max(d.valor > 0 ? 3 : 0, (d.valor / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-md group-hover:block group-focus-within:block">
              <span className="font-medium">{d.rotulo}</span>: <span className="numero">{formatar(d.valor)}</span>{d.detalhe && ` · ${d.detalhe}`}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2" aria-hidden>
        {dados.map((d) => <span key={d.rotulo} className="flex-1 truncate text-center text-[11px] text-muted-foreground">{d.rotulo}</span>)}
      </div>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <tbody>{dados.map((d) => <tr key={d.rotulo}><th scope="row">{d.rotulo}</th><td>{formatar(d.valor)}</td><td>{d.detalhe}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

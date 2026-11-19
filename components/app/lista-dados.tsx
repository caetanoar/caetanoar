import { cn } from "@/lib/utils";

/** Pares rótulo/valor para telas de detalhe. Valores vazios aparecem como "—". */
export function ListaDados({
  itens,
  className,
  colunas = 2,
}: {
  itens: { rotulo: string; valor: React.ReactNode; largo?: boolean }[];
  className?: string;
  colunas?: 1 | 2 | 3;
}) {
  return (
    <dl className={cn("grid gap-x-4 gap-y-3", colunas === 2 && "grid-cols-2", colunas === 3 && "grid-cols-2 md:grid-cols-3", className)}>
      {itens.map((i) => (
        <div key={i.rotulo} className={cn("min-w-0", i.largo && "col-span-full")}>
          <dt className="text-xs text-muted-foreground">{i.rotulo}</dt>
          <dd className="mt-0.5 text-sm break-words">{i.valor === null || i.valor === undefined || i.valor === "" ? "—" : i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

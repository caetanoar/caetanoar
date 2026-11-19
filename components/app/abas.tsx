import Link from "next/link";
import { cn } from "@/lib/utils";

/** Abas como links (?aba=...), renderizadas no servidor. */
export function AbasLink({ abas, atual, base }: { abas: { id: string; rotulo: string }[]; atual: string; base: string }) {
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 [scrollbar-width:none] lg:mx-0 lg:px-0" aria-label="Seções">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={`${base}?aba=${a.id}`}
          scroll={false}
          aria-current={a.id === atual ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
            a.id === atual ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}

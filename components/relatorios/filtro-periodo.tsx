"use client";

import Form from "next/form";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { InputData } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Filtro de período: atalhos (chips) + intervalo livre em dd/mm/aaaa. */
export function FiltroPeriodo({
  base,
  de,
  ate,
  atalhos,
}: {
  base: string;
  de: string;
  ate: string;
  atalhos: { rotulo: string; de: string; ate: string }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {atalhos.map((a) => {
          const ativo = a.de === de && a.ate === ate;
          return (
            <Link
              key={a.rotulo}
              href={`${base}?de=${a.de}&ate=${a.ate}`}
              scroll={false}
              aria-current={ativo ? "true" : undefined}
              className={cn(
                "flex h-8 shrink-0 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
                ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
              )}
            >
              {a.rotulo}
            </Link>
          );
        })}
      </div>
      <Form action={base} scroll={false} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2" key={`${de}-${ate}`}>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          De
          <InputData name="de" defaultValue={de} aria-label="Data inicial" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Até
          <InputData name="ate" defaultValue={ate} aria-label="Data final" />
        </label>
        <Button type="submit" variant="outline" aria-label="Aplicar período">
          <CalendarRange /> <span className="hidden sm:inline">Aplicar</span>
        </Button>
      </Form>
    </div>
  );
}

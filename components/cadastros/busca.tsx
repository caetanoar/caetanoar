"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Campo de busca que atualiza ?q= na URL (com atraso para não pesar no celular). */
export function Busca({ placeholder = "Buscar…", parametro = "q" }: { placeholder?: string; parametro?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [valor, setValor] = useState(params.get(parametro) ?? "");
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    const atual = params.get(parametro) ?? "";
    if (valor === atual) return;
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (valor) sp.set(parametro, valor);
      else sp.delete(parametro);
      sp.delete("pagina");
      iniciar(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(t);
  }, [valor, params, parametro, pathname, router]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        enterKeyHint="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        className={cn("pl-9")}
        aria-label={placeholder}
      />
      {pendente && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
    </div>
  );
}

/** Filtros em "chips" que alteram um parâmetro da URL. */
export function Chips({
  parametro,
  opcoes,
  todos = "Todos",
}: {
  parametro: string;
  opcoes: { valor: string; rotulo: string }[];
  todos?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const atual = params.get(parametro) ?? "";
  const ir = (v: string) => {
    const sp = new URLSearchParams(params.toString());
    if (v) sp.set(parametro, v);
    else sp.delete(parametro);
    sp.delete("pagina");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };
  const todas = [{ valor: "", rotulo: todos }, ...opcoes];
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {todas.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => ir(o.valor)}
          className={cn(
            "h-8 shrink-0 rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
            atual === o.valor ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { InputMoeda } from "@/components/form/inputs";
import { STATUS_VEICULO } from "@/lib/estoque/rotulos";
import { CAMBIOS } from "@/lib/format/veiculo";

const CAMPOS = ["marca", "cambio", "status", "ano_min", "ano_max", "preco_min", "preco_max", "ordem"] as const;

export function FiltrosEstoque({ marcas }: { marcas: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const ativos = CAMPOS.filter((c) => params.get(c)).length;

  function aplicar(fd: FormData) {
    const sp = new URLSearchParams(params.toString());
    for (const c of CAMPOS) {
      const v = String(fd.get(c) ?? "").trim();
      if (v) sp.set(c, v);
      else sp.delete(c);
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    setAberto(false);
  }

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative shrink-0" aria-label="Filtros">
          <SlidersHorizontal /> <span className="hidden sm:inline">Filtros</span>
          {ativos > 0 && <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">{ativos}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetTitle>Filtros</SheetTitle>
        <SheetDescription>Refine a consulta do estoque.</SheetDescription>
        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            aplicar(new FormData(e.currentTarget));
          }}
        >
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="f-marca">Marca</Label>
            <Select id="f-marca" name="marca" defaultValue={params.get("marca") ?? ""}>
              <option value="">Todas</option>
              {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-cambio">Câmbio</Label>
            <Select id="f-cambio" name="cambio" defaultValue={params.get("cambio") ?? ""}>
              <option value="">Todos</option>
              {Object.entries(CAMBIOS).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-status">Situação</Label>
            <Select id="f-status" name="status" defaultValue={params.get("status") ?? ""}>
              <option value="">Em estoque</option>
              {Object.entries(STATUS_VEICULO).map(([k, s]) => <option key={k} value={k}>{s.rotulo}</option>)}
              <option value="todos">Todos (inclui vendidos)</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-ano-min">Ano de</Label>
            <Input id="f-ano-min" name="ano_min" inputMode="numeric" maxLength={4} defaultValue={params.get("ano_min") ?? ""} placeholder="2015" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-ano-max">Ano até</Label>
            <Input id="f-ano-max" name="ano_max" inputMode="numeric" maxLength={4} defaultValue={params.get("ano_max") ?? ""} placeholder="2026" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-preco-min">Preço de</Label>
            <InputMoeda id="f-preco-min" name="preco_min" defaultValue={params.get("preco_min") ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-preco-max">Preço até</Label>
            <InputMoeda id="f-preco-max" name="preco_max" defaultValue={params.get("preco_max") ?? ""} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="f-ordem">Ordenar por</Label>
            <Select id="f-ordem" name="ordem" defaultValue={params.get("ordem") ?? ""}>
              <option value="">Mais recentes</option>
              <option value="preco_asc">Menor preço</option>
              <option value="preco_desc">Maior preço</option>
              <option value="ano_desc">Mais novos (ano)</option>
              <option value="parados">Há mais tempo em estoque</option>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => { router.replace(pathname, { scroll: false }); setAberto(false); }}>Limpar</Button>
          <Button type="submit">Aplicar</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

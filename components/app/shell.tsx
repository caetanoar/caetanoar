"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { itensBarra, menuDoPapel } from "./navegacao";
import { NOME_PAPEL, type Papel } from "@/lib/auth/permissoes";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { sair } from "@/app/(auth)/acoes";

type Props = { usuario: { nome: string; papel: Papel; email: string }; children: React.ReactNode };

function ativo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ usuario, children }: Props) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const barra = itensBarra(usuario.papel);
  const menu = menuDoPapel(usuario.papel);
  const grupos = [...new Set(menu.map((m) => m.grupo))];

  return (
    <div className="flex min-h-dvh">
      {/* Menu lateral (tablet/desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-4 py-4">
          <Logo className="size-9" />
          <div className="leading-tight">
            <p className="font-bold">Caetano Auto</p>
            <p className="text-xs text-muted-foreground">CRM</p>
          </div>
        </Link>
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {grupos.map((g) => (
            <div key={g} className="mt-3">
              <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g}</p>
              {menu.filter((m) => m.grupo === g).map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-secondary",
                    ativo(pathname, m.href) && "bg-primary/10 font-medium text-primary",
                  )}
                >
                  <m.icone className="size-4" />
                  {m.rotulo}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="truncate text-sm font-medium">{usuario.nome}</p>
          <p className="text-xs text-muted-foreground">{NOME_PAPEL[usuario.papel]}</p>
          <form action={sair}>
            <button className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">{children}</main>
      </div>

      {/* Barra inferior (celular) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden" aria-label="Navegação principal">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {barra.map((item) => {
            const eMais = item.href === "#mais";
            const sel = eMais ? maisAberto : ativo(pathname, item.href);
            const conteudo = (
              <>
                <item.icone className={cn("size-6", sel && "stroke-[2.4]")} />
                <span className="text-[11px] leading-none">{item.rotulo}</span>
              </>
            );
            const classe = cn(
              "flex h-16 w-full flex-col items-center justify-center gap-1 text-muted-foreground",
              sel && "text-primary font-medium",
            );
            return (
              <li key={item.href}>
                {eMais ? (
                  <button type="button" className={classe} onClick={() => setMaisAberto(true)}>{conteudo}</button>
                ) : (
                  <Link href={item.href} className={classe} aria-current={sel ? "page" : undefined}>{conteudo}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <Sheet open={maisAberto} onOpenChange={setMaisAberto}>
        <SheetContent side="bottom">
          <div className="flex items-center gap-3">
            <UserCircle2 className="size-10 text-muted-foreground" />
            <div className="min-w-0">
              <SheetTitle className="truncate text-base">{usuario.nome}</SheetTitle>
              <SheetDescription>{NOME_PAPEL[usuario.papel]} · {usuario.email}</SheetDescription>
            </div>
          </div>
          {grupos.map((g) => (
            <div key={g}>
              <p className="pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g}</p>
              <div className="grid grid-cols-3 gap-2">
                {menu.filter((m) => m.grupo === g).map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    onClick={() => setMaisAberto(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border bg-background p-3 text-center text-xs",
                      ativo(pathname, m.href) && "border-primary/40 bg-primary/5 text-primary",
                    )}
                  >
                    <m.icone className="size-5" />
                    {m.rotulo}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <form action={sair}>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm text-muted-foreground">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

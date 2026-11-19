import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Cabeçalho de página: título, subtítulo, voltar e ações (fixo no topo no celular). */
export function Cabecalho({
  titulo,
  subtitulo,
  voltar,
  acoes,
  className,
}: {
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  voltar?: string;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("pt-safe sticky top-0 z-30 border-b bg-background/95 backdrop-blur lg:static lg:border-0 lg:bg-transparent", className)}>
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 lg:px-8 lg:pt-6">
        {voltar && (
          <Link href={voltar} className="-ml-2 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Voltar">
            <ChevronLeft className="size-6" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight lg:text-2xl">{titulo}</h1>
          {subtitulo && <p className="truncate text-sm text-muted-foreground">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      </div>
    </header>
  );
}

export function Conteudo({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-4 lg:px-8", className)}>{children}</div>;
}

export function Vazio({ icone: Icone, titulo, children }: { icone?: React.ComponentType<{ className?: string }>; titulo: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
      {Icone && <Icone className="size-10 text-muted-foreground/60" />}
      <p className="font-medium">{titulo}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

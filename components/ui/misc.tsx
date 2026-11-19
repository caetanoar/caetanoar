import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("border-0 border-t border-border", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function Progress({ valor, className, cor }: { valor: number; className?: string; cor?: string }) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full bg-primary transition-all", cor)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Alerta({
  className,
  variante = "info",
  titulo,
  children,
}: {
  className?: string;
  variante?: "info" | "aviso" | "erro" | "sucesso";
  titulo?: string;
  children?: React.ReactNode;
}) {
  const cores = {
    info: "border-primary/20 bg-primary/5 text-foreground",
    aviso: "border-warning/50 bg-warning/15 text-foreground",
    erro: "border-destructive/30 bg-destructive/10 text-foreground",
    sucesso: "border-success/30 bg-success/10 text-foreground",
  } as const;
  return (
    <div role={variante === "erro" ? "alert" : "status"} className={cn("rounded-lg border px-3 py-2.5 text-sm", cores[variante], className)}>
      {titulo && <p className="font-medium">{titulo}</p>}
      {children && <div className={cn(titulo && "mt-0.5 text-muted-foreground")}>{children}</div>}
    </div>
  );
}

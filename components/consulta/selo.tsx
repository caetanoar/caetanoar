import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

const SELOS = {
  verde: { rotulo: "Nada encontrado nos itens verificados", icone: ShieldCheck, classe: "border-success/40 bg-success/10 text-success" },
  amarelo: { rotulo: "Atenção: há registros a informar ao comprador", icone: ShieldAlert, classe: "border-warning/60 bg-warning/20 text-warning-foreground dark:text-warning" },
  vermelho: { rotulo: "Impeditivo: não negociar sem resolver", icone: ShieldX, classe: "border-destructive/50 bg-destructive/10 text-destructive" },
} as const;

/** Selo da consulta (cor + ícone + texto: nunca só a cor). */
export function SeloConsulta({ selo, compacto, className }: { selo: "verde" | "amarelo" | "vermelho" | null; compacto?: boolean; className?: string }) {
  if (!selo) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm text-muted-foreground", className)}>
        <ShieldQuestion className="size-4" /> Sem resultado
      </span>
    );
  }
  const s = SELOS[selo];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg border font-medium", compacto ? "px-2 py-0.5 text-xs" : "px-3 py-2 text-sm", s.classe, className)}>
      <s.icone className={compacto ? "size-3.5" : "size-5"} /> {compacto ? selo[0].toUpperCase() + selo.slice(1) : s.rotulo}
    </span>
  );
}

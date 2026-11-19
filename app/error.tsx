"use client";

import { Button } from "@/components/ui/button";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Não foi possível carregar esta tela. Tente de novo; se o problema continuar, avise o suporte.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground">Código: {error.digest}</p>}
      <Button onClick={reset}>Tentar de novo</Button>
    </main>
  );
}

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sair } from "@/app/(auth)/acoes";

export default async function SemAcesso({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams;
  const inativo = motivo === "inativo";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <ShieldAlert className="size-14 text-muted-foreground" />
      <h1 className="text-xl font-bold">{inativo ? "Acesso desativado" : "Sem permissão"}</h1>
      <p className="max-w-sm text-muted-foreground">
        {inativo
          ? "Sua conta está desativada. Fale com o dono da loja para reativar o acesso."
          : "Seu perfil não tem acesso a esta área. Se precisar, peça ao dono para ajustar sua permissão."}
      </p>
      {inativo ? (
        <form action={sair}><Button variant="outline">Sair</Button></form>
      ) : (
        <Button asChild variant="outline"><Link href="/">Voltar ao início</Link></Button>
      )}
    </main>
  );
}

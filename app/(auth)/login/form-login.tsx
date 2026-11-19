"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { entrar } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { Campo } from "@/components/form/campo";

export function FormLogin({ voltar }: { voltar?: string }) {
  const [estado, acao, pendente] = useAcao(entrar, { toastErro: false, toastSucesso: false });
  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={acao} className="flex flex-col gap-4">
          <input type="hidden" name="voltar" value={voltar ?? ""} />
          {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
          <Campo id="email" rotulo="E-mail" erro={estado.erros?.email}>
            <Input name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
          </Campo>
          <Campo id="senha" rotulo="Senha" erro={estado.erros?.senha}>
            <Input name="senha" type="password" autoComplete="current-password" required />
          </Campo>
          <Button type="submit" size="lg" disabled={pendente}>
            {pendente && <Loader2 className="animate-spin" />}
            Entrar
          </Button>
          <Link href="/recuperar-senha" className="text-center text-sm text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

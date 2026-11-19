"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { recuperarSenha } from "../acoes";
import { ESTADO_INICIAL } from "@/lib/acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { Campo } from "@/components/form/campo";

export default function PaginaRecuperarSenha() {
  const [estado, acao, pendente] = useActionState(recuperarSenha, ESTADO_INICIAL);
  return (
    <Card>
      <CardContent className="p-5">
        <form action={acao} className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">Recuperar senha</h2>
            <p className="text-sm text-muted-foreground">Enviaremos um link para você criar uma nova senha.</p>
          </div>
          {estado.ok && <Alerta variante="sucesso">{estado.mensagem}</Alerta>}
          <Campo id="email" rotulo="E-mail" erro={estado.erros?.email}>
            <Input name="email" type="email" autoComplete="email" inputMode="email" required />
          </Campo>
          <Button type="submit" size="lg" disabled={pendente}>
            {pendente && <Loader2 className="animate-spin" />}
            Enviar link
          </Button>
          <Link href="/login" className="text-center text-sm text-primary hover:underline">
            Voltar para o login
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

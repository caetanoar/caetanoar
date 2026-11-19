"use client";

import { Loader2 } from "lucide-react";
import { definirSenha } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { Campo } from "@/components/form/campo";

export default function PaginaDefinirSenha() {
  const [estado, acao, pendente] = useAcao(definirSenha, { toastErro: false, toastSucesso: false });
  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={acao} className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">Criar senha</h2>
            <p className="text-sm text-muted-foreground">Escolha uma senha com pelo menos 8 caracteres.</p>
          </div>
          {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
          <Campo id="senha" rotulo="Nova senha" erro={estado.erros?.senha}>
            <Input name="senha" type="password" autoComplete="new-password" required minLength={8} />
          </Campo>
          <Campo id="confirmacao" rotulo="Repita a senha" erro={estado.erros?.confirmacao}>
            <Input name="confirmacao" type="password" autoComplete="new-password" required />
          </Campo>
          <Button type="submit" size="lg" disabled={pendente}>
            {pendente && <Loader2 className="animate-spin" />}
            Salvar senha e entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

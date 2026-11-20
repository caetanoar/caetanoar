"use client";

import { useState } from "react";
import { Loader2, UserPlus, Pencil } from "lucide-react";
import { convidarUsuario, alterarUsuario } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { NOME_PAPEL, type Papel } from "@/lib/auth/permissoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { Campo } from "@/components/form/campo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

type Usuario = { id: string; nome: string; email: string; papel: Papel; ativo: boolean; telefone: string | null };

const DESC_PAPEL: Record<Papel, string> = {
  dono: "Acesso total, incluindo configurações e regras de comissão",
  gerente: "Estoque, vendas, financeiro, fiscal e relatórios",
  vendedor: "Estoque, seus clientes, suas vendas, meta e comissão",
  atendimento: "Clientes, garantias, acionamentos e contatos (sem CPF)",
  preparador: "Carros em preparação, checklist, fotos e os custos que lançar",
  administrativo: "Documentação e transferência das vendas fechadas",
};

export function ConvidarUsuario() {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useAcao(convidarUsuario, { onSucesso: () => setAberto(false) });
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus /> Convidar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
          <DialogDescription>A pessoa recebe um e-mail para criar a própria senha.</DialogDescription>
        </DialogHeader>
        <form onSubmit={acao} className="flex flex-col gap-4">
          {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
          <Campo id="conv-nome" rotulo="Nome" erro={estado.erros?.nome} obrigatorio>
            <Input name="nome" autoComplete="off" />
          </Campo>
          <Campo id="conv-email" rotulo="E-mail" erro={estado.erros?.email} obrigatorio>
            <Input name="email" type="email" inputMode="email" autoComplete="off" />
          </Campo>
          <Campo id="conv-papel" rotulo="Perfil" erro={estado.erros?.papel}>
            <Select name="papel" defaultValue="vendedor">
              {(Object.keys(NOME_PAPEL) as Papel[]).map((p) => (
                <option key={p} value={p}>{NOME_PAPEL[p]} — {DESC_PAPEL[p]}</option>
              ))}
            </Select>
          </Campo>
          <Button type="submit" disabled={pendente}>
            {pendente && <Loader2 className="animate-spin" />} Enviar convite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditarUsuario({ usuario, eu }: { usuario: Usuario; eu: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useAcao(alterarUsuario, { onSucesso: () => setAberto(false) });
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${usuario.nome}`}><Pencil /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{usuario.nome}</DialogTitle>
          <DialogDescription>{usuario.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={acao} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={usuario.id} />
          {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
          {eu && <Alerta variante="aviso">Você não pode rebaixar nem desativar o próprio acesso.</Alerta>}
          <Campo id={`papel-${usuario.id}`} rotulo="Perfil">
            <Select name="papel" defaultValue={usuario.papel} disabled={eu}>
              {(Object.keys(NOME_PAPEL) as Papel[]).map((p) => (
                <option key={p} value={p}>{NOME_PAPEL[p]}</option>
              ))}
            </Select>
          </Campo>
          {eu && <input type="hidden" name="papel" value={usuario.papel} />}
          <Campo id={`ativo-${usuario.id}`} rotulo="Situação">
            <Select name="ativo" defaultValue={String(usuario.ativo)} disabled={eu}>
              <option value="true">Ativo</option>
              <option value="false">Desativado (perde o acesso na hora)</option>
            </Select>
          </Campo>
          {eu && <input type="hidden" name="ativo" value="true" />}
          <Button type="submit" disabled={pendente || eu}>
            {pendente && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ListaUsuarios({ usuarios, meuId }: { usuarios: Usuario[]; meuId: string }) {
  return (
    <Card className="divide-y overflow-hidden p-0">
      {usuarios.map((u) => (
        <div key={u.id} className="flex items-center gap-3 px-4 py-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {u.nome.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-medium">
              <span className="truncate">{u.nome}</span>
              {u.id === meuId && <Badge variant="muted">você</Badge>}
            </p>
            <p className="truncate text-sm text-muted-foreground">{u.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={u.papel === "dono" ? "default" : u.papel === "gerente" ? "info" : "secondary"}>{NOME_PAPEL[u.papel]}</Badge>
            {!u.ativo && <Badge variant="destructive">Desativado</Badge>}
          </div>
          <EditarUsuario usuario={u} eu={u.id === meuId} />
        </div>
      ))}
    </Card>
  );
}

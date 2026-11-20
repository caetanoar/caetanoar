"use client";

import { useState } from "react";
import { KeyRound, Webhook, Plus, Loader2, Ban, Send, Pause, Play, Trash2, RotateCw, ShieldCheck } from "lucide-react";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alerta } from "@/components/ui/misc";
import { Campo } from "@/components/form/campo";
import { InputData } from "@/components/form/inputs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BotaoCopiar } from "@/components/ia/copiar";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { criarChaveApi, revogarChaveApi, criarWebhook, alternarWebhook, excluirWebhook, testarWebhook, reenviarEntrega } from "./acoes";

function SegredoUmaVez({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Alerta variante="aviso" titulo="Copie agora">Por segurança, {rotulo.toLowerCase()} não será mostrado(a) de novo.</Alerta>
      <code className="block rounded-lg border bg-muted p-3 font-mono text-xs break-all" aria-label={rotulo}>{valor}</code>
      <BotaoCopiar texto={valor} rotulo={`Copiar ${rotulo.toLowerCase()}`} />
    </div>
  );
}

export function NovaChave({ escopos }: { escopos: Record<string, string> }) {
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState<string | null>(null);
  const [estado, aoEnviar, pendente] = useAcao(criarChaveApi, { onSucesso: (r) => setChave(r.dados?.chave ?? null), toastSucesso: false });
  return (
    <Dialog open={aberto} onOpenChange={(a) => { setAberto(a); if (!a) setChave(null); }}>
      <DialogTrigger asChild><Button size="sm"><Plus /> Nova chave</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova chave de API</DialogTitle>
          <DialogDescription>Use no servidor do site ou do sistema que vai se integrar. Nunca coloque a chave em página pública.</DialogDescription>
        </DialogHeader>
        {chave ? (
          <SegredoUmaVez rotulo="Chave" valor={chave} />
        ) : (
          <form onSubmit={aoEnviar} className="flex flex-col gap-4">
            <Campo id="nome-chave" rotulo="Nome" erro={estado.erros?.nome} obrigatorio>
              <Input id="nome-chave" name="nome" placeholder="Ex.: Site da loja" />
            </Campo>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Permissões</legend>
              {Object.entries(escopos).map(([k, rotulo]) => (
                <Label key={k} className="items-start font-normal"><Checkbox name="escopos" value={k} defaultChecked={k === "estoque:ler"} /> <span><code className="text-xs">{k}</code> · {rotulo}</span></Label>
              ))}
              {estado.erros?.escopos && <p className="text-xs text-destructive">{estado.erros.escopos[0]}</p>}
            </fieldset>
            <Campo id="expira" rotulo="Expira em (opcional)">
              <InputData id="expira" name="expira_em" />
            </Campo>
            <Button type="submit" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Criar chave</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BotaoAcao({ acao, campos, rotulo, icone: Icone, variante = "outline", confirmar }: {
  acao: Parameters<typeof useAcao>[0];
  campos: Record<string, string>;
  rotulo: string;
  icone: React.ComponentType;
  variante?: "outline" | "ghost" | "destructive";
  confirmar?: string;
}) {
  const [, aoEnviar, pendente] = useAcao(acao);
  return (
    <form onSubmit={(e) => { if (confirmar && !window.confirm(confirmar)) { e.preventDefault(); return; } aoEnviar(e); }}>
      {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Button type="submit" size="sm" variant={variante} disabled={pendente} aria-label={rotulo}>
        {pendente ? <Loader2 className="animate-spin" /> : <Icone />} <span className="hidden sm:inline">{rotulo}</span>
      </Button>
    </form>
  );
}

type Chave = { id: string; nome: string; prefixo: string; escopos: string[]; ultimo_uso_em: string | null; expira_em: string | null; revogada_em: string | null; criado_em: string };

export function ListaChaves({ chaves }: { chaves: Chave[] }) {
  if (!chaves.length) return <p className="text-sm text-muted-foreground">Nenhuma chave criada.</p>;
  return (
    <ul className="flex flex-col divide-y">
      {chaves.map((c) => (
        <li key={c.id} className="flex items-center gap-3 py-3">
          <KeyRound className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 font-medium">
              {c.nome}
              {c.revogada_em ? <Badge variant="destructive">Revogada</Badge> : <Badge variant="success">Ativa</Badge>}
            </p>
            <p className="truncate text-xs text-muted-foreground"><code>{c.prefixo}</code> · {c.escopos.join(", ")}</p>
            <p className="text-xs text-muted-foreground">
              Último uso: {c.ultimo_uso_em ? formatarDataHora(c.ultimo_uso_em) : "nunca"}{c.expira_em ? ` · expira ${formatarData(c.expira_em)}` : ""}
            </p>
          </div>
          {!c.revogada_em && <BotaoAcao acao={revogarChaveApi} campos={{ id: c.id }} rotulo="Revogar" icone={Ban} variante="destructive" confirmar={`Revogar a chave "${c.nome}"? Integrações que a usam vão parar.`} />}
        </li>
      ))}
    </ul>
  );
}

export function NovoWebhook({ eventos }: { eventos: Record<string, string> }) {
  const [aberto, setAberto] = useState(false);
  const [segredo, setSegredo] = useState<string | null>(null);
  const [estado, aoEnviar, pendente] = useAcao(criarWebhook, { onSucesso: (r) => setSegredo(r.dados?.segredo ?? null), toastSucesso: false });
  return (
    <Dialog open={aberto} onOpenChange={(a) => { setAberto(a); if (!a) setSegredo(null); }}>
      <DialogTrigger asChild><Button size="sm"><Plus /> Novo webhook</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo webhook</DialogTitle>
          <DialogDescription>O CRM avisa este endereço (POST JSON assinado) quando os eventos escolhidos acontecerem.</DialogDescription>
        </DialogHeader>
        {segredo ? (
          <SegredoUmaVez rotulo="Segredo" valor={segredo} />
        ) : (
          <form onSubmit={aoEnviar} className="flex flex-col gap-4">
            <Campo id="nome-wh" rotulo="Nome" erro={estado.erros?.nome} obrigatorio>
              <Input id="nome-wh" name="nome" placeholder="Ex.: Atualizar site" />
            </Campo>
            <Campo id="url-wh" rotulo="URL (https)" erro={estado.erros?.url} obrigatorio>
              <Input id="url-wh" name="url" type="url" inputMode="url" placeholder="https://..." />
            </Campo>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Eventos</legend>
              {Object.entries(eventos).map(([k, rotulo]) => (
                <Label key={k} className="items-start font-normal"><Checkbox name="eventos" value={k} /> <span><code className="text-xs">{k}</code> · {rotulo}</span></Label>
              ))}
              {estado.erros?.eventos && <p className="text-xs text-destructive">{estado.erros.eventos[0]}</p>}
            </fieldset>
            <Button type="submit" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Criar webhook</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type Hook = { id: string; nome: string; url: string; eventos: string[]; ativo: boolean; falhas_consecutivas: number; ultimo_envio_em: string | null; ultimo_status: number | null };

export function ListaWebhooks({ webhooks }: { webhooks: Hook[] }) {
  if (!webhooks.length) return <p className="text-sm text-muted-foreground">Nenhum webhook configurado.</p>;
  return (
    <ul className="flex flex-col divide-y">
      {webhooks.map((w) => (
        <li key={w.id} className="flex flex-col gap-2 py-3">
          <div className="flex items-start gap-3">
            <Webhook className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 font-medium">
                {w.nome}
                {w.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="muted">Pausado</Badge>}
                {w.falhas_consecutivas > 0 && <Badge variant="warning">{w.falhas_consecutivas} falha(s)</Badge>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{w.url}</p>
              <p className="text-xs text-muted-foreground">{w.eventos.join(", ")}</p>
              {w.ultimo_envio_em && <p className="text-xs text-muted-foreground">Último envio: {formatarDataHora(w.ultimo_envio_em)}{w.ultimo_status ? ` (HTTP ${w.ultimo_status})` : ""}</p>}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <BotaoAcao acao={testarWebhook} campos={{ id: w.id }} rotulo="Enviar teste" icone={Send} />
            <BotaoAcao acao={alternarWebhook} campos={{ id: w.id, ativo: String(!w.ativo) }} rotulo={w.ativo ? "Pausar" : "Ativar"} icone={w.ativo ? Pause : Play} />
            <BotaoAcao acao={excluirWebhook} campos={{ id: w.id }} rotulo="Excluir" icone={Trash2} variante="destructive" confirmar={`Excluir o webhook "${w.nome}"?`} />
          </div>
        </li>
      ))}
    </ul>
  );
}

type Entrega = { id: number; evento_tipo: string; status: "pendente" | "entregue" | "falhou" | "desistiu"; tentativas: number; ultimo_status_http: number | null; ultimo_erro: string | null; criado_em: string; webhook: string | null };
const STATUS = { pendente: { r: "Pendente", v: "info" }, entregue: { r: "Entregue", v: "success" }, falhou: { r: "Falhou (vai tentar de novo)", v: "warning" }, desistiu: { r: "Desistiu", v: "destructive" } } as const;

export function ListaEntregas({ entregas }: { entregas: Entrega[] }) {
  if (!entregas.length) return <p className="text-sm text-muted-foreground">Nenhuma notificação enviada ainda.</p>;
  return (
    <ul className="flex flex-col divide-y">
      {entregas.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5"><code className="text-xs">{e.evento_tipo}</code> <Badge variant={STATUS[e.status].v}>{STATUS[e.status].r}</Badge></p>
            <p className="truncate text-xs text-muted-foreground">
              {e.webhook} · {formatarDataHora(e.criado_em)} · {e.tentativas} tentativa(s){e.ultimo_status_http ? ` · HTTP ${e.ultimo_status_http}` : ""}{e.ultimo_erro ? ` · ${e.ultimo_erro}` : ""}
            </p>
          </div>
          {e.status !== "entregue" && <BotaoAcao acao={reenviarEntrega} campos={{ id: String(e.id) }} rotulo="Reenviar" icone={RotateCw} />}
        </li>
      ))}
    </ul>
  );
}

export function Situacao({ itens }: { itens: { nome: string; ok: boolean; detalhe: string }[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {itens.map((i) => (
        <li key={i.nome} className="flex items-start gap-2.5 rounded-lg border p-3">
          <ShieldCheck className={i.ok ? "mt-0.5 size-4 shrink-0 text-success" : "mt-0.5 size-4 shrink-0 text-muted-foreground"} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{i.nome}</p>
            <p className="text-xs text-muted-foreground">{i.detalhe}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

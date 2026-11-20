"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { salvarItemModelo, acaoItemModelo } from "@/lib/checklists/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ItemModelo = { id: string; item: string; ordem: number; prazo_dias: number | null; ativo: boolean };

function BotaoAcao({ id, acao, rotulo, icone: Icone, desabilitado, perigo }: {
  id: string; acao: string; rotulo: string; icone: typeof ArrowUp; desabilitado?: boolean; perigo?: boolean;
}) {
  const [, aoEnviar, pendente] = useAcao(acaoItemModelo);
  return (
    <form onSubmit={(e) => { if (acao === "excluir" && !confirm("Excluir este item do modelo? Checklists já criados não mudam.")) { e.preventDefault(); return; } aoEnviar(e); }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="acao" value={acao} />
      <Button type="submit" variant="ghost" size="icon-sm" aria-label={rotulo} title={rotulo} disabled={desabilitado || pendente} className={perigo ? "text-destructive" : undefined}>
        {pendente ? <Loader2 className="animate-spin" /> : <Icone />}
      </Button>
    </form>
  );
}

function FormItem({ tipo, item, aoTerminar, rotuloPrazo }: { tipo: string; item?: ItemModelo; aoTerminar?: () => void; rotuloPrazo: string }) {
  const [versao, setVersao] = useState(0);
  const [estado, aoEnviar, pendente] = useAcao(salvarItemModelo, {
    onSucesso: () => { setVersao((n) => n + 1); aoTerminar?.(); },
  });
  const e = estado.erros ?? {};
  const id = item?.id ?? `novo-${tipo}`;
  return (
    <form key={versao} onSubmit={aoEnviar} className="flex flex-col gap-2">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-muted-foreground" htmlFor={`item-${id}`}>
          {item ? "Item" : "Novo item"}
          <Input id={`item-${id}`} name="item" defaultValue={item?.item ?? ""} maxLength={80} placeholder={tipo === "preparacao" ? "Ex.: Higienização interna" : "Ex.: Reconhecimento de firma"} />
        </label>
        <label className="flex w-28 flex-col gap-1 text-xs text-muted-foreground" htmlFor={`prazo-${id}`}>
          {rotuloPrazo}
          <Input id={`prazo-${id}`} name="prazo_dias" type="number" min={0} max={365} inputMode="numeric" defaultValue={item?.prazo_dias ?? ""} />
        </label>
        <Button type="submit" size={item ? "icon" : "default"} disabled={pendente} aria-label={item ? "Salvar item" : undefined}>
          {pendente ? <Loader2 className="animate-spin" /> : item ? <Check /> : <Plus />}{item ? null : " Adicionar"}
        </Button>
        {item && <Button type="button" variant="ghost" size="icon" onClick={aoTerminar} aria-label="Cancelar"><X /></Button>}
      </div>
      {(e.item || e.prazo_dias) && <p className="text-xs text-destructive">{e.item?.[0] ?? e.prazo_dias?.[0]}</p>}
    </form>
  );
}

export function EditorChecklist({ tipo, itens, rotuloPrazo }: { tipo: "preparacao" | "documentacao"; itens: ItemModelo[]; rotuloPrazo: string }) {
  const [editando, setEditando] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item. Adicione abaixo.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {itens.map((it, i) => (
            <li key={it.id} className="px-3 py-2">
              {editando === it.id ? (
                <FormItem tipo={tipo} item={it} aoTerminar={() => setEditando(null)} rotuloPrazo={rotuloPrazo} />
              ) : (
                <div className="flex items-center gap-2">
                  <div className={cn("min-w-0 flex-1", !it.ativo && "text-muted-foreground")}>
                    <p className={cn("truncate text-sm font-medium", !it.ativo && "line-through")}>{it.item}</p>
                    <p className="text-xs text-muted-foreground">{it.prazo_dias !== null ? `Prazo: ${it.prazo_dias} dia(s)` : "Sem prazo"}</p>
                  </div>
                  {!it.ativo && <Badge variant="muted">inativo</Badge>}
                  <div className="flex shrink-0 items-center">
                    <BotaoAcao id={it.id} acao="subir" rotulo={`Subir ${it.item}`} icone={ArrowUp} desabilitado={i === 0} />
                    <BotaoAcao id={it.id} acao="descer" rotulo={`Descer ${it.item}`} icone={ArrowDown} desabilitado={i === itens.length - 1} />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar ${it.item}`} title="Editar" onClick={() => setEditando(it.id)}><Pencil /></Button>
                    <BotaoAcao id={it.id} acao={it.ativo ? "desativar" : "ativar"} rotulo={`${it.ativo ? "Desativar" : "Ativar"} ${it.item}`} icone={it.ativo ? EyeOff : Eye} />
                    <BotaoAcao id={it.id} acao="excluir" rotulo={`Excluir ${it.item}`} icone={Trash2} perigo />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <FormItem tipo={tipo} rotuloPrazo={rotuloPrazo} />
    </div>
  );
}

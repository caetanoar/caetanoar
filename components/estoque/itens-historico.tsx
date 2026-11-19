"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CheckCircle2, Circle, Loader2, Plus, Trash2, BadgeCheck, Eye } from "lucide-react";
import { adicionarItem, alternarItem, salvarHistorico, excluirHistorico } from "@/app/(app)/estoque/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputData } from "@/components/form/inputs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TIPO_HISTORICO } from "@/lib/estoque/rotulos";
import { formatarData, hojeISO } from "@/lib/format/data";
import { cn } from "@/lib/utils";

type Item = { id: string; item: string; confirmado: boolean; fonte: string | null };
type Hist = { id: string; data: string; tipo: keyof typeof TIPO_HISTORICO; descricao: string; comprovado: boolean; visivel_anuncio: boolean };

export function ItensVeiculo({ veiculoId, itens, catalogo, podeEditar }: { veiculoId: string; itens: Item[]; catalogo: string[]; podeEditar: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [novo, setNovo] = useState("");
  const jaTem = new Set(itens.map((i) => i.item.toLowerCase()));
  const sugestoes = catalogo.filter((c) => !jaTem.has(c.toLowerCase()));

  function executar(fn: typeof adicionarItem, dados: Record<string, string>) {
    const fd = new FormData();
    Object.entries({ ...dados, veiculo_id: veiculoId }).forEach(([k, v]) => fd.set(k, v));
    iniciar(async () => {
      const r = await fn({ ok: false }, fd);
      if (!r.ok) toast.error(r.erro ?? "Erro.");
      router.refresh();
    });
  }

  return (
    <div className={cn("flex flex-col gap-3", pendente && "opacity-70")}>
      <p className="text-xs text-muted-foreground">
        Só itens <strong>confirmados</strong> (verificados no carro ou em documento) entram com ✅ nos anúncios. Os demais aparecem como “consulte no privado”.
      </p>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {itens.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              {i.confirmado ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
              <span className="flex-1 text-sm">{i.item}</span>
              {podeEditar && (
                <>
                  <Button type="button" size="sm" variant={i.confirmado ? "ghost" : "outline"} onClick={() => executar(alternarItem, { id: i.id, acao: i.confirmado ? "desconfirmar" : "confirmar" })}>
                    {i.confirmado ? "Desconfirmar" : <><Check /> Confirmar</>}
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" className="text-destructive" aria-label={`Remover ${i.item}`} onClick={() => executar(alternarItem, { id: i.id, acao: "remover" })}>
                    <Trash2 />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {podeEditar && (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (novo.trim().length < 2) return;
              executar(adicionarItem, { item: novo.trim(), confirmado: "false" });
              setNovo("");
            }}
          >
            <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Outro item (ex.: Kit multimídia)" aria-label="Novo item" />
            <Button type="submit" variant="outline" className="shrink-0"><Plus /> Adicionar</Button>
          </form>
          {sugestoes.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Toque para adicionar:</p>
              <div className="flex flex-wrap gap-1.5">
                {sugestoes.map((s) => (
                  <button key={s} type="button" onClick={() => executar(adicionarItem, { item: s, confirmado: "false" })}
                    className="rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-secondary">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function HistoricoVeiculo({ veiculoId, historico, podeEditar }: { veiculoId: string; historico: Hist[]; podeEditar: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(salvarHistorico, { onSucesso: () => { setAberto(false); router.refresh(); } });
  const [, excluir] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {historico.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum registro de histórico.</p>
      ) : (
        <ol className="relative flex flex-col gap-3 border-l pl-4">
          {historico.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{formatarData(h.data)}</span>
                <Badge variant="secondary">{TIPO_HISTORICO[h.tipo]}</Badge>
                {h.comprovado && <Badge variant="success"><BadgeCheck /> Comprovado</Badge>}
                {h.visivel_anuncio && <Badge variant="info"><Eye /> No anúncio</Badge>}
              </div>
              <p className="text-sm">{h.descricao}</p>
              {podeEditar && (
                <button type="button" className="text-xs text-destructive hover:underline"
                  onClick={() => confirm("Remover este registro?") && excluir(async () => {
                    const fd = new FormData(); fd.set("id", h.id); fd.set("veiculo_id", veiculoId);
                    const r = await excluirHistorico({ ok: false }, fd);
                    if (!r.ok) toast.error(r.erro ?? "Erro."); router.refresh();
                  })}>
                  Remover
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {podeEditar && !aberto && (
        <Button type="button" variant="outline" onClick={() => setAberto(true)}><Plus /> Registrar histórico</Button>
      )}
      {podeEditar && aberto && (
        <form onSubmit={despachar} className="flex flex-col gap-3 rounded-lg border p-3">
          <input type="hidden" name="veiculo_id" value={veiculoId} />
          <div className="grid grid-cols-2 gap-3">
            <Campo id="h-data" rotulo="Data" erro={estado.erros?.data}>
              <InputData name="data" defaultValue={hojeISO()} />
            </Campo>
            <Campo id="h-tipo" rotulo="Tipo" erro={estado.erros?.tipo}>
              <Select name="tipo" defaultValue="observacao">
                {Object.entries(TIPO_HISTORICO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </Select>
            </Campo>
          </div>
          <Campo id="h-desc" rotulo="Descrição" erro={estado.erros?.descricao} dica='Ex.: "para-choques repintados", "revisão de 40 mil km na concessionária"'>
            <Textarea name="descricao" rows={2} />
          </Campo>
          <div className="flex flex-col gap-2">
            <Label className="font-normal"><Checkbox name="comprovado" value="true" /> Comprovado (nota, laudo ou foto)</Label>
            <Label className="font-normal"><Checkbox name="visivel_anuncio" value="true" /> Pode aparecer no anúncio</Label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Salvar</Button>
          </div>
        </form>
      )}
    </div>
  );
}

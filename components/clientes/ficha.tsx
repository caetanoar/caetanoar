"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, Loader2, MessageCircle, Plus, X, Phone, Store, Camera, Mail, MessageSquare } from "lucide-react";
import { moverEtapa, registrarContato, adicionarInteresse, removerInteresse, revelarCPF } from "@/app/(app)/clientes/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputData, InputMoeda } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ETAPA_FUNIL, MOTIVO_PERDA, CANAL_CONTATO } from "@/lib/clientes/rotulos";
import { formatarDataHora, formatarData, somarDias, hojeISO } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarCPF } from "@/lib/format/documentos";
import { cn } from "@/lib/utils";

type Etapa = keyof typeof ETAPA_FUNIL;

export function SeletorEtapa({ id, etapa }: { id: string; etapa: Etapa }) {
  const router = useRouter();
  const [perdaAberta, setPerdaAberta] = useState(false);
  const [estado, despachar, pendente] = useAcao(moverEtapa, { onSucesso: () => { setPerdaAberta(false); router.refresh(); } });
  return (
    <>
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Etapa do funil">
        {(Object.keys(ETAPA_FUNIL) as Etapa[]).map((e) => (
          <form key={e} onSubmit={e === "perdido" ? (ev) => { ev.preventDefault(); setPerdaAberta(true); } : despachar}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="etapa" value={e} />
            <button
              type="submit"
              role="radio"
              aria-checked={etapa === e}
              disabled={pendente || etapa === e}
              className={cn(
                "h-9 w-full rounded-md text-xs font-medium transition-colors sm:text-sm",
                etapa === e ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ETAPA_FUNIL[e].rotulo}
            </button>
          </form>
        ))}
      </div>
      <Dialog open={perdaAberta} onOpenChange={setPerdaAberta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como perdido</DialogTitle>
            <DialogDescription>O motivo ajuda a entender onde a loja perde vendas.</DialogDescription>
          </DialogHeader>
          <form onSubmit={despachar} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="etapa" value="perdido" />
            <Campo id="motivo_perda" rotulo="Motivo" erro={estado.erros?.motivo_perda} obrigatorio>
              <Select name="motivo_perda" defaultValue="">
                <option value="" disabled>Escolha…</option>
                {Object.entries(MOTIVO_PERDA).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </Select>
            </Campo>
            <Campo id="motivo_perda_detalhe" rotulo="Detalhe (opcional)">
              <Textarea name="motivo_perda_detalhe" rows={2} />
            </Campo>
            <Button type="submit" variant="destructive" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Marcar como perdido</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CpfProtegido({ clienteId, mascarado }: { clienteId: string; mascarado: string | null }) {
  const [valor, setValor] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  if (!mascarado) return <span>—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="numero">{valor ? formatarCPF(valor) : mascarado}</span>
      {!valor && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={() =>
            iniciar(async () => {
              const r = await revelarCPF(clienteId);
              if (r.ok) setValor(r.dados?.valor ?? null);
              else toast.error(r.erro ?? "Não foi possível revelar.");
            })
          }
        >
          {pendente ? <Loader2 className="size-3 animate-spin" /> : <Eye className="size-3" />} Revelar
        </button>
      )}
    </span>
  );
}

const ICONE_CANAL = { whatsapp: MessageCircle, ligacao: Phone, loja: Store, instagram: Camera, email: Mail, outro: MessageSquare };

type Contato = { id: string; data_hora: string; canal: keyof typeof CANAL_CONTATO; resumo: string; proximo_passo: string | null; proximo_contato_em: string | null; usuario: string | null };

export function Contatos({ clienteId, contatos }: { clienteId: string; contatos: Contato[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(registrarContato, { onSucesso: () => { setAberto(false); router.refresh(); } });
  const atalhos = [
    { r: "Amanhã", d: 1 },
    { r: "3 dias", d: 3 },
    { r: "1 semana", d: 7 },
  ];
  const [proximo, setProximo] = useState<string>("");
  const [chave, setChave] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {!aberto ? (
        <Button type="button" onClick={() => setAberto(true)}><Plus /> Registrar contato</Button>
      ) : (
        <form onSubmit={despachar} className="flex flex-col gap-3 rounded-lg border p-3">
          <input type="hidden" name="cliente_id" value={clienteId} />
          <Campo id="canal" rotulo="Canal">
            <Select name="canal" defaultValue="whatsapp">
              {Object.entries(CANAL_CONTATO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </Campo>
          <Campo id="resumo" rotulo="O que foi conversado" erro={estado.erros?.resumo} obrigatorio>
            <Textarea name="resumo" rows={3} placeholder="Ex.: pediu vídeo do motor, quer financiar 48x com entrada de 20 mil" />
          </Campo>
          <Campo id="proximo_passo" rotulo="Próximo passo">
            <Input name="proximo_passo" placeholder="Ex.: mandar simulação do financiamento" />
          </Campo>
          <Campo id="proximo_contato_em" rotulo="Retornar em" erro={estado.erros?.proximo_contato_em}>
            <InputData key={chave} name="proximo_contato_em" defaultValue={proximo} />
          </Campo>
          <div className="flex gap-1.5">
            {atalhos.map((a) => (
              <button key={a.r} type="button" className="rounded-full border px-2.5 py-1 text-xs hover:bg-secondary"
                onClick={() => { setProximo(somarDias(hojeISO(), a.d)); setChave((c) => c + 1); }}>
                {a.r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Salvar</Button>
          </div>
        </form>
      )}
      {contatos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum contato registrado ainda.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {contatos.map((c) => {
            const Icone = ICONE_CANAL[c.canal];
            return (
              <li key={c.id} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icone className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{formatarDataHora(c.data_hora)} · {CANAL_CONTATO[c.canal]}{c.usuario && ` · ${c.usuario}`}</p>
                  <p className="text-sm whitespace-pre-line">{c.resumo}</p>
                  {(c.proximo_passo || c.proximo_contato_em) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Próximo: {[c.proximo_passo, c.proximo_contato_em && `em ${formatarData(c.proximo_contato_em)}`].filter(Boolean).join(" ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

type Interesse = { id: string; veiculo_id: string | null; veiculo: string | null; preco: number | null; status: string | null; descricao: string | null; preco_max: number | null; whatsapp: string | null };

export function Interesses({ clienteId, interesses, veiculos }: { clienteId: string; interesses: Interesse[]; veiculos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(adicionarInteresse, { onSucesso: () => { setAberto(false); router.refresh(); } });
  const [, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {interesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum carro de interesse registrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {interesses.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <div className="min-w-0 flex-1">
                {i.veiculo_id ? (
                  <Link href={`/estoque/${i.veiculo_id}`} className="text-sm font-medium text-primary hover:underline">{i.veiculo}</Link>
                ) : (
                  <p className="text-sm font-medium">{i.descricao}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {[i.preco && formatarMoeda(i.preco), i.status, i.preco_max && `até ${formatarMoeda(i.preco_max)}`, i.veiculo_id && i.descricao].filter(Boolean).join(" · ")}
                </p>
              </div>
              {i.whatsapp && (
                <Button asChild variant="whatsapp" size="icon-sm" aria-label="Enviar este carro ao cliente">
                  <a href={i.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /></a>
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" aria-label="Remover interesse"
                onClick={() => iniciar(async () => {
                  const fd = new FormData(); fd.set("id", i.id); fd.set("cliente_id", clienteId);
                  await removerInteresse({ ok: false }, fd); router.refresh();
                })}>
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!aberto ? (
        <Button type="button" variant="outline" onClick={() => setAberto(true)}><Plus /> Adicionar interesse</Button>
      ) : (
        <form onSubmit={despachar} className="flex flex-col gap-3 rounded-lg border p-3">
          <input type="hidden" name="cliente_id" value={clienteId} />
          <Campo id="veiculo_id" rotulo="Carro do estoque">
            <Select name="veiculo_id" defaultValue="">
              <option value="">Nenhum (descrever abaixo)</option>
              {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </Select>
          </Campo>
          <Campo id="descricao" rotulo="Descrição" erro={estado.erros?.descricao} dica='Ex.: "SUV automático até 100 mil"'>
            <Input name="descricao" />
          </Campo>
          <Campo id="preco_max" rotulo="Quanto pode pagar (opcional)">
            <InputMoeda name="preco_max" />
          </Campo>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Adicionar</Button>
          </div>
        </form>
      )}
    </div>
  );
}

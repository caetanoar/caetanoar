"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Loader2, Link2, Plus, EyeOff, Wand2, Undo2, RefreshCw } from "lucide-react";
import { importarExtrato, conciliar, lancarTransacao, ignorarTransacao, conciliarAutomatico, desfazer, sincronizarConexao } from "./acoes";
import { decodificarOFX } from "@/lib/extrato/ofx";
import type { LayoutCSV } from "@/lib/extrato/csv";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { cn } from "@/lib/utils";

function useExecutar() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const executar = (fn: () => Promise<{ ok: boolean; erro?: string; mensagem?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.mensagem) toast.success(r.mensagem);
      } else toast.error(r.erro ?? "Erro.");
      router.refresh();
    });
  return [pendente, executar] as const;
}

export function ImportarExtrato({ contaId }: { contaId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pendente, iniciar] = useTransition();
  const [arquivo, setArquivo] = useState<{ nome: string; conteudo: string } | null>(null);
  const [cabecalho, setCabecalho] = useState<string[] | null>(null);
  const [layout, setLayout] = useState<Partial<LayoutCSV>>({ formatoData: "dd/mm/aaaa", decimal: "," });

  function enviar(nome: string, conteudo: string, l?: LayoutCSV) {
    iniciar(async () => {
      const r = await importarExtrato(contaId, nome, conteudo, l);
      if (r.ok) {
        toast.success(r.mensagem ?? "Extrato importado.");
        setCabecalho(null);
        setArquivo(null);
        router.refresh();
      } else if (r.dados?.cabecalho) {
        setCabecalho(r.dados.cabecalho);
        toast.message(r.erro ?? "Indique as colunas.");
      } else toast.error(r.erro ?? "Falha ao importar.");
    });
  }

  async function ler(f: File | undefined) {
    if (!f) return;
    const bytes = await f.arrayBuffer();
    const conteudo = /\.ofx$/i.test(f.name) ? decodificarOFX(bytes) : new TextDecoder("utf-8").decode(bytes);
    setArquivo({ nome: f.name, conteudo });
    enviar(f.name, conteudo);
    if (input.current) input.current.value = "";
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input ref={input} type="file" accept=".ofx,.csv,.txt" className="hidden" onChange={(e) => ler(e.target.files?.[0])} aria-label="Arquivo de extrato" />
          <Button type="button" onClick={() => input.current?.click()} disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" /> : <FileUp />} Importar extrato (OFX ou CSV)
          </Button>
          <p className="text-xs text-muted-foreground">Transações repetidas são ignoradas. Valores e datas iguais são conciliados automaticamente.</p>
        </div>
        {cabecalho && arquivo && (
          <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
            <Alerta variante="aviso" className="col-span-full">Indique as colunas do seu CSV.</Alerta>
            {([
              ["colunaData", "Data"],
              ["colunaDescricao", "Descrição"],
              ["colunaValor", "Valor (com sinal)"],
            ] as const).map(([campo, rotulo]) => (
              <div key={campo} className="flex flex-col gap-1">
                <Label>{rotulo}</Label>
                <Select value={layout[campo] ?? ""} onChange={(e) => setLayout((l) => ({ ...l, [campo]: e.target.value }))}>
                  <option value="">—</option>
                  {cabecalho.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <Label>Formato da data</Label>
              <Select value={layout.formatoData} onChange={(e) => setLayout((l) => ({ ...l, formatoData: e.target.value as LayoutCSV["formatoData"] }))}>
                <option value="dd/mm/aaaa">dd/mm/aaaa</option>
                <option value="aaaa-mm-dd">aaaa-mm-dd</option>
                <option value="dd/mm/aa">dd/mm/aa</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Separador</Label>
              <Input value={layout.separador ?? (arquivo.conteudo.includes(";") ? ";" : ",")} onChange={(e) => setLayout((l) => ({ ...l, separador: e.target.value }))} maxLength={1} />
            </div>
            <Button
              type="button"
              className="col-span-full"
              disabled={pendente || !layout.colunaData || !layout.colunaDescricao || !layout.colunaValor}
              onClick={() => enviar(arquivo.nome, arquivo.conteudo, { separador: layout.separador ?? (arquivo.conteudo.includes(";") ? ";" : ","), ...layout } as LayoutCSV)}
            >
              Importar com estas colunas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type Sugestao = { id: string; descricao: string; data: string; status: string; pontuacao: number };

export function LinhaTransacao({
  transacao,
  sugestoes,
  categorias,
}: {
  transacao: { id: string; data: string; valor: number; descricao: string };
  sugestoes: Sugestao[];
  categorias: { id: string; nome: string }[];
}) {
  const [pendente, executar] = useExecutar();
  const [lancando, setLancando] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState(transacao.descricao);
  const entrada = transacao.valor > 0;
  return (
    <Card className={cn(pendente && "opacity-60")}>
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium break-words">{transacao.descricao || "(sem descrição)"}</p>
            <p className="text-xs text-muted-foreground">{formatarData(transacao.data)}</p>
          </div>
          <span className={cn("numero font-semibold", entrada ? "text-success" : "")}>{formatarMoeda(transacao.valor)}</span>
        </div>
        {sugestoes.length > 0 && !lancando && (
          <div className="flex flex-col gap-1.5">
            {sugestoes.slice(0, 2).map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pendente}
                onClick={() => executar(() => conciliar(transacao.id, s.id))}
                className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/5 px-3 py-2 text-left text-sm hover:bg-success/10"
              >
                <Link2 className="size-4 shrink-0 text-success" />
                <span className="min-w-0 flex-1 truncate">Conciliar com: {s.descricao}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatarData(s.data)} · {s.status}</span>
              </button>
            ))}
          </div>
        )}
        {lancando ? (
          <div className="flex flex-col gap-2 rounded-lg border p-2">
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} aria-label="Descrição do lançamento" />
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
              <option value="">Categoria…</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setLancando(false)}>Voltar</Button>
              <Button size="sm" className="flex-1" disabled={!categoria || pendente} onClick={() => executar(() => lancarTransacao(transacao.id, categoria, descricao))}>Criar lançamento</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setLancando(true)}><Plus /> Lançar</Button>
            <Button size="sm" variant="ghost" disabled={pendente} onClick={() => executar(() => ignorarTransacao(transacao.id))}><EyeOff /> Ignorar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BotaoAuto({ contaId }: { contaId: string }) {
  const [pendente, executar] = useExecutar();
  return (
    <Button variant="outline" className="self-start" disabled={pendente} onClick={() => executar(() => conciliarAutomatico(contaId))}>
      {pendente ? <Loader2 className="animate-spin" /> : <Wand2 />} Conciliar automaticamente
    </Button>
  );
}

export function BotaoDesfazer({ transacaoId }: { transacaoId: string }) {
  const [pendente, executar] = useExecutar();
  return (
    <Button size="icon-sm" variant="ghost" aria-label="Desfazer" disabled={pendente} onClick={() => executar(() => desfazer(transacaoId))}>
      <Undo2 />
    </Button>
  );
}

export function SincronizarOpenFinance({ conexao }: { conexao: { id: string; nome: string | null; ultimo: string | null } }) {
  const [pendente, executar] = useExecutar();
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>{conexao.nome ?? "Banco"} · {conexao.ultimo ? `sincronizado ${formatarDataHora(conexao.ultimo)}` : "nunca sincronizado"}</span>
      <Button size="sm" variant="outline" disabled={pendente} onClick={() => executar(() => sincronizarConexao(conexao.id))}><RefreshCw /> Sincronizar</Button>
    </div>
  );
}

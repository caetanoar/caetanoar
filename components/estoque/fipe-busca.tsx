"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alerta } from "@/components/ui/misc";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { formatarMoeda } from "@/lib/format/moeda";

type Opcao = { codigo: string; nome: string };
export type ResultadoFipe = {
  valor: number;
  marca: string;
  marcaNormalizada: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  combustivelNormalizado: string | null;
  codigoFipe: string;
  mesReferencia: string;
};

async function buscar<T>(params: Record<string, string>): Promise<T> {
  const r = await fetch(`/api/fipe?${new URLSearchParams(params)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.erro ?? "Erro na consulta FIPE.");
  return j as T;
}

/** Consulta a Tabela FIPE (marca → modelo → ano) e devolve os dados para o formulário. */
export function FipeBusca({ onSelecionar, rotulo = "Buscar na FIPE" }: { onSelecionar: (r: ResultadoFipe) => void; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [marcas, setMarcas] = useState<Opcao[]>([]);
  const [modelos, setModelos] = useState<Opcao[]>([]);
  const [anos, setAnos] = useState<Opcao[]>([]);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [resultado, setResultado] = useState<ResultadoFipe | null>(null);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function executar<T>(etapa: string, fn: () => Promise<T>): Promise<T | undefined> {
    setCarregando(etapa);
    setErro(null);
    try {
      return await fn();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na consulta FIPE.");
    } finally {
      setCarregando(null);
    }
  }

  function abrir(novo: boolean) {
    setAberto(novo);
    if (novo && !marcas.length) {
      void executar("marcas", () => buscar<Opcao[]>({ acao: "marcas" })).then((m) => m && setMarcas(m));
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={abrir}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm"><Search /> {rotulo}</Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetTitle>Tabela FIPE</SheetTitle>
        <SheetDescription>Escolha marca, modelo e ano. Os dados preenchem o cadastro.</SheetDescription>
        {erro && <Alerta variante="erro">{erro}</Alerta>}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fipe-marca">Marca {carregando === "marcas" && <Loader2 className="size-3 animate-spin" />}</Label>
            <Select
              id="fipe-marca"
              value={marca}
              onChange={async (e) => {
                const v = e.target.value;
                setMarca(v); setModelo(""); setAno(""); setModelos([]); setAnos([]); setResultado(null);
                if (v) {
                  const m = await executar("modelos", () => buscar<Opcao[]>({ acao: "modelos", marca: v }));
                  if (m) setModelos(m);
                }
              }}
            >
              <option value="">Escolha a marca…</option>
              {marcas.map((m) => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fipe-modelo">Modelo {carregando === "modelos" && <Loader2 className="size-3 animate-spin" />}</Label>
            <Select
              id="fipe-modelo"
              value={modelo}
              disabled={!modelos.length}
              onChange={async (e) => {
                const v = e.target.value;
                setModelo(v); setAno(""); setAnos([]); setResultado(null);
                if (v) {
                  const a = await executar("anos", () => buscar<Opcao[]>({ acao: "anos", marca, modelo: v }));
                  if (a) setAnos(a);
                }
              }}
            >
              <option value="">Escolha o modelo…</option>
              {modelos.map((m) => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fipe-ano">Ano / combustível {carregando === "anos" && <Loader2 className="size-3 animate-spin" />}</Label>
            <Select
              id="fipe-ano"
              value={ano}
              disabled={!anos.length}
              onChange={async (e) => {
                const v = e.target.value;
                setAno(v); setResultado(null);
                if (v) {
                  const r = await executar("valor", () => buscar<ResultadoFipe>({ acao: "valor", marca, modelo, ano: v }));
                  if (r) setResultado(r);
                }
              }}
            >
              <option value="">Escolha o ano…</option>
              {anos.map((a) => <option key={a.codigo} value={a.codigo}>{a.nome}</option>)}
            </Select>
          </div>
          {carregando === "valor" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Consultando valor…</p>}
          {resultado && (
            <div className="rounded-xl border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Valor FIPE · {resultado.mesReferencia}</p>
              <p className="numero text-2xl font-bold">{formatarMoeda(resultado.valor)}</p>
              <p className="text-sm">{resultado.marcaNormalizada} {resultado.modelo}</p>
              <p className="text-xs text-muted-foreground">{resultado.anoModelo} · {resultado.combustivel} · código {resultado.codigoFipe}</p>
              <Button
                type="button"
                className="mt-3 w-full"
                onClick={() => {
                  onSelecionar(resultado);
                  setAberto(false);
                }}
              >
                Usar estes dados
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

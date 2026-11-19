"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Upload, Lock, Unlock, Trash2, ExternalLink } from "lucide-react";
import { enviarArquivo, comprimirFoto } from "@/lib/upload";
import { registrarArquivos, removerDocumento, alternarSigiloDocumento } from "@/app/(app)/estoque/acoes";
import { CATEGORIAS_DOCUMENTO } from "@/lib/estoque/rotulos";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatarData } from "@/lib/format/data";

type Doc = { id: string; nome: string; categoria: string; sigiloso: boolean; url: string | null; criado_em: string };
type Categoria = keyof typeof CATEGORIAS_DOCUMENTO;

export function DocumentosVeiculo({ veiculoId, documentos, podeEditar }: { veiculoId: string; documentos: Doc[]; podeEditar: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState<Categoria>("crlv");
  const [enviando, setEnviando] = useState(false);

  async function enviar(lista: FileList | null) {
    if (!lista?.length) return;
    setEnviando(true);
    try {
      const registros = [];
      for (const original of Array.from(lista).slice(0, 10)) {
        const arq = original.type.startsWith("image/") ? await comprimirFoto(original) : original;
        const r = await enviarArquivo("documentos", `veiculos/${veiculoId}`, arq);
        registros.push({
          ...r,
          bucket: "documentos" as const,
          entidade: "veiculo" as const,
          entidade_id: veiculoId,
          categoria,
          // Laudo pode ser mostrado ao cliente; CRLV e demais têm dados pessoais.
          sigiloso: categoria !== "laudo",
        });
      }
      const res = await registrarArquivos(registros, veiculoId);
      if (!res.ok) throw new Error(res.erro);
      toast.success("Documento anexado.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  async function acao(fn: typeof removerDocumento, dados: Record<string, string>) {
    const fd = new FormData();
    Object.entries({ ...dados, veiculo_id: veiculoId }).forEach(([k, v]) => fd.set(k, v));
    const r = await fn({ ok: false }, fd);
    if (!r.ok) toast.error(r.erro ?? "Erro.");
    else if (r.mensagem) toast.success(r.mensagem);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {podeEditar && (
        <div className="flex gap-2">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} aria-label="Tipo de documento">
            {Object.entries(CATEGORIAS_DOCUMENTO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
          </Select>
          <input ref={input} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => enviar(e.target.files)} aria-label="Escolher documento" />
          <Button type="button" variant="outline" className="shrink-0" onClick={() => input.current?.click()} disabled={enviando}>
            {enviando ? <Loader2 className="animate-spin" /> : <Upload />} Anexar
          </Button>
        </div>
      )}
      {documentos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum documento anexado.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {documentos.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.nome}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {CATEGORIAS_DOCUMENTO[d.categoria as Categoria] ?? d.categoria} · {formatarData(d.criado_em)}
                  {d.sigiloso && <Badge variant="muted"><Lock /> Só gestão</Badge>}
                </p>
              </div>
              {d.url && (
                <Button asChild variant="ghost" size="icon-sm" aria-label="Abrir documento">
                  <a href={d.url} target="_blank" rel="noopener noreferrer"><ExternalLink /></a>
                </Button>
              )}
              {podeEditar && (
                <>
                  <Button variant="ghost" size="icon-sm" aria-label={d.sigiloso ? "Liberar para vendedores" : "Restringir à gestão"}
                    onClick={() => acao(alternarSigiloDocumento, { id: d.id, sigiloso: String(!d.sigiloso) })}>
                    {d.sigiloso ? <Unlock /> : <Lock />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label="Remover documento"
                    onClick={() => confirm("Remover este documento?") && acao(removerDocumento, { id: d.id })}>
                    <Trash2 />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

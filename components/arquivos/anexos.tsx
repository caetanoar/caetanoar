"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Upload, ExternalLink, Trash2 } from "lucide-react";
import { enviarArquivo, comprimirFoto } from "@/lib/upload";
import { registrarArquivo, removerArquivo } from "@/lib/arquivos/acoes";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatarData } from "@/lib/format/data";

type Anexo = { id: string; nome: string; categoria: string; url: string | null; criado_em: string };
type Entidade = "venda" | "garantia" | "cliente" | "lancamento";

const CATEGORIAS = {
  contrato: "Contrato", documento: "Documento", comprovante: "Comprovante", termo_ciencia: "Termo de Ciência assinado",
  atpv: "ATPV-e", vistoria: "Vistoria", comprovante_debitos: "Comprovante de débitos", baixa_gravame: "Baixa de gravame", outro: "Outro",
} as const;

/** Anexos genéricos (contratos, recibos, comprovantes) de uma venda, garantia etc. */
export function Anexos({
  entidade,
  entidadeId,
  anexos,
  podeEnviar,
  revalidar,
}: {
  entidade: Entidade;
  entidadeId: string;
  anexos: Anexo[];
  podeEnviar: boolean;
  revalidar: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState<keyof typeof CATEGORIAS>("contrato");
  const [enviando, setEnviando] = useState(false);
  const [, iniciar] = useTransition();

  async function enviar(lista: FileList | null) {
    if (!lista?.length) return;
    setEnviando(true);
    try {
      for (const original of Array.from(lista).slice(0, 10)) {
        const arq = original.type.startsWith("image/") ? await comprimirFoto(original) : original;
        const r = await enviarArquivo("documentos", `${entidade}s/${entidadeId}`, arq);
        const res = await registrarArquivo({ ...r, bucket: "documentos", entidade, entidade_id: entidadeId, categoria, sigiloso: false }, revalidar);
        if (!res.ok) throw new Error(res.erro);
      }
      toast.success("Arquivo anexado.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {podeEnviar && (
        <div className="flex gap-2">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as keyof typeof CATEGORIAS)} aria-label="Tipo de arquivo">
            {Object.entries(CATEGORIAS).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
          </Select>
          <input ref={input} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => enviar(e.target.files)} aria-label="Escolher arquivo" />
          <Button type="button" variant="outline" className="shrink-0" onClick={() => input.current?.click()} disabled={enviando}>
            {enviando ? <Loader2 className="animate-spin" /> : <Upload />} Anexar
          </Button>
        </div>
      )}
      {anexos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.nome}</p>
                <p className="text-xs text-muted-foreground">{CATEGORIAS[a.categoria as keyof typeof CATEGORIAS] ?? a.categoria} · {formatarData(a.criado_em)}</p>
              </div>
              {a.url && (
                <Button asChild variant="ghost" size="icon-sm" aria-label="Abrir arquivo">
                  <a href={a.url} target="_blank" rel="noopener noreferrer"><ExternalLink /></a>
                </Button>
              )}
              {podeEnviar && (
                <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label="Remover arquivo"
                  onClick={() => confirm("Remover este arquivo?") && iniciar(async () => {
                    const fd = new FormData(); fd.set("id", a.id); fd.set("revalidar", revalidar);
                    const r = await removerArquivo({ ok: false }, fd);
                    if (!r.ok) toast.error(r.erro ?? "Erro."); router.refresh();
                  })}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

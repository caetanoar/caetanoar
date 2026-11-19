"use client";

/* eslint-disable @next/next/no-img-element -- fotos já otimizadas no envio */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, ChevronLeft, ChevronRight, Loader2, Star, Trash2, ImagePlus } from "lucide-react";
import { comprimirFoto, enviarArquivo } from "@/lib/upload";
import { registrarArquivos, acaoFoto } from "@/app/(app)/estoque/acoes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Foto = { id: string; url: string; capa: boolean };

export function FotosVeiculo({ veiculoId, fotos, podeEditar }: { veiculoId: string; fotos: Foto[]; podeEditar: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState<{ feitos: number; total: number } | null>(null);
  const [pendente, iniciar] = useTransition();

  async function enviar(lista: FileList | null) {
    if (!lista?.length) return;
    const arquivos = Array.from(lista).slice(0, 30);
    setEnviando({ feitos: 0, total: arquivos.length });
    const enviados: Parameters<typeof registrarArquivos>[0] = [];
    try {
      for (const [i, original] of arquivos.entries()) {
        const foto = await comprimirFoto(original);
        const r = await enviarArquivo("fotos-veiculos", veiculoId, foto);
        enviados.push({ ...r, bucket: "fotos-veiculos", entidade: "veiculo", entidade_id: veiculoId, categoria: "foto", sigiloso: false });
        setEnviando({ feitos: i + 1, total: arquivos.length });
      }
      const res = await registrarArquivos(enviados, veiculoId);
      if (!res.ok) throw new Error(res.erro);
      toast.success(`${enviados.length} foto(s) adicionada(s).`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar as fotos.");
    } finally {
      setEnviando(null);
      if (input.current) input.current.value = "";
    }
  }

  function executar(id: string, acao: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("veiculo_id", veiculoId);
    fd.set("acao", acao);
    iniciar(async () => {
      const r = await acaoFoto({ ok: false }, fd);
      if (!r.ok) toast.error(r.erro ?? "Não foi possível alterar a foto.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {podeEditar && (
        <>
          <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => enviar(e.target.files)} aria-label="Escolher fotos" />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => { input.current?.setAttribute("capture", "environment"); input.current?.click(); }} disabled={!!enviando}>
              <Camera /> Tirar foto
            </Button>
            <Button type="button" variant="outline" onClick={() => { input.current?.removeAttribute("capture"); input.current?.click(); }} disabled={!!enviando}>
              <ImagePlus /> Da galeria
            </Button>
          </div>
          {enviando && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Enviando {enviando.feitos} de {enviando.total}…
            </p>
          )}
        </>
      )}
      {fotos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma foto ainda.</p>
      ) : (
        <ul className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", pendente && "opacity-60")}>
          {fotos.map((f, i) => (
            <li key={f.id} className="relative overflow-hidden rounded-lg border bg-muted">
              <img src={f.url} alt={`Foto ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              {f.capa && (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                  <Star className="size-3" /> Capa
                </span>
              )}
              {podeEditar && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <div className="flex gap-1">
                    <button type="button" aria-label="Mover para a esquerda" disabled={i === 0} onClick={() => executar(f.id, "esquerda")} className="rounded-md bg-white/90 p-1.5 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
                    <button type="button" aria-label="Mover para a direita" disabled={i === fotos.length - 1} onClick={() => executar(f.id, "direita")} className="rounded-md bg-white/90 p-1.5 disabled:opacity-30"><ChevronRight className="size-4" /></button>
                  </div>
                  <div className="flex gap-1">
                    {!f.capa && <button type="button" aria-label="Usar como capa" onClick={() => executar(f.id, "capa")} className="rounded-md bg-white/90 p-1.5"><Star className="size-4" /></button>}
                    <button type="button" aria-label="Remover foto" onClick={() => confirm("Remover esta foto?") && executar(f.id, "remover")} className="rounded-md bg-white/90 p-1.5 text-destructive"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Carrossel de fotos para o topo da tela do carro (rolagem lateral). */
export function CarrosselFotos({ fotos, alt }: { fotos: { id: string; url: string }[]; alt: string }) {
  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Camera className="size-10" />
      </div>
    );
  }
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
      {fotos.map((f, i) => (
        <img key={f.id} src={f.url} alt={`${alt} — foto ${i + 1}`} className="aspect-[16/10] w-[88%] shrink-0 snap-center rounded-xl object-cover sm:w-[60%]" loading={i === 0 ? "eager" : "lazy"} />
      ))}
    </div>
  );
}

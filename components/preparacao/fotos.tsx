"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { comprimirFoto, enviarArquivo } from "@/lib/upload";
import { registrarFotosPreparacao } from "@/lib/preparacao/acoes";
import { Button } from "@/components/ui/button";

/** Fotos do carro em preparação: pela câmera do celular ou da galeria. */
export function FotosPreparacao({ veiculoId, fotos, podeEnviar }: { veiculoId: string; fotos: { id: string; url: string }[]; podeEnviar: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(lista: FileList | null) {
    if (!lista?.length) return;
    setEnviando(true);
    try {
      const enviados = [];
      for (const original of Array.from(lista).slice(0, 20)) {
        if (!original.type.startsWith("image/")) continue;
        const foto = await comprimirFoto(original);
        enviados.push(await enviarArquivo("fotos-veiculos", veiculoId, foto));
      }
      if (!enviados.length) throw new Error("Escolha imagens (JPG ou PNG).");
      const r = await registrarFotosPreparacao(enviados, veiculoId);
      if (!r.ok) throw new Error(r.erro);
      toast.success(r.mensagem);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar as fotos.");
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {fotos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto ainda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f.id} src={f.url} alt="Foto do carro" className="aspect-[4/3] w-full rounded-lg border object-cover" loading="lazy" />
          ))}
        </div>
      )}
      {podeEnviar && (
        <>
          <input ref={input} type="file" accept="image/*" multiple className="hidden" aria-label="Fotos do carro" onChange={(e) => enviar(e.target.files)} />
          <Button type="button" variant="outline" disabled={enviando} onClick={() => input.current?.click()}>
            {enviando ? <Loader2 className="animate-spin" /> : <Camera />} Tirar ou escolher fotos
          </Button>
        </>
      )}
    </div>
  );
}

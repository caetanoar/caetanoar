"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, ShieldOff, FileSignature, Upload } from "lucide-react";
import { registrarCiencia, liberarBloqueio, enviarParaAprovacao } from "@/lib/vendas/acoes-verificacao";
import { registrarArquivo } from "@/lib/arquivos/acoes";
import { enviarArquivo, comprimirFoto } from "@/lib/upload";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** "Informei o cliente": exige marcar a confirmação. Os alertas são copiados pelo banco. */
export function RegistrarCiencia({ id }: { id: string }) {
  const router = useRouter();
  const [estado, aoEnviar, pendente] = useAcao(registrarCiencia, { onSucesso: () => router.refresh() });
  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-start gap-2.5">
        <Checkbox id={`confirmo-${id}`} name="confirmo" className="mt-0.5" />
        <Label htmlFor={`confirmo-${id}`} className="text-sm leading-snug font-normal">
          Informei o cliente, antes da compra, de todos os alertas acima e recomendei laudo cautelar independente.
        </Label>
      </div>
      {estado.erros?.confirmo && <p className="text-xs text-destructive">{estado.erros.confirmo[0]}</p>}
      <Button type="submit" disabled={pendente}>{pendente ? <Loader2 className="animate-spin" /> : <FileSignature />} Registrar ciência do cliente</Button>
    </form>
  );
}

/** Só o dono: libera o bloqueio com justificativa escrita (fica registrada e não se altera). */
export function LiberarBloqueio({ id }: { id: string }) {
  const router = useRouter();
  const [estado, aoEnviar, pendente] = useAcao(liberarBloqueio, { onSucesso: () => router.refresh() });
  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3">
      <input type="hidden" name="id" value={id} />
      <Campo id={`justificativa-${id}`} rotulo="Justificativa da liberação (dono)" erro={estado.erros?.justificativa} obrigatorio
        dica="Ex.: BO baixado e documentação regularizada no Detran. Fica registrada com seu nome e não pode ser alterada.">
        <Textarea id={`justificativa-${id}`} name="justificativa" rows={3} />
      </Campo>
      <Button type="submit" variant="destructive" disabled={pendente}>{pendente ? <Loader2 className="animate-spin" /> : <ShieldOff />} Liberar venda</Button>
    </form>
  );
}

export function EnviarParaAprovacao({ id }: { id: string }) {
  const router = useRouter();
  const [, aoEnviar, pendente] = useAcao(enviarParaAprovacao, { onSucesso: () => router.refresh() });
  return (
    <form onSubmit={aoEnviar}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="lg" className="w-full" disabled={pendente}>{pendente ? <Loader2 className="animate-spin" /> : <Send />} Enviar para aprovação do gerente</Button>
    </form>
  );
}

/** Anexa o Termo de Ciência assinado (foto ou PDF) à venda. */
export function EnviarTermo({ id }: { id: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(lista: FileList | null) {
    const original = lista?.[0];
    if (!original) return;
    setEnviando(true);
    try {
      const arq = original.type.startsWith("image/") ? await comprimirFoto(original) : original;
      const r = await enviarArquivo("documentos", `vendas/${id}`, arq);
      const res = await registrarArquivo({ ...r, bucket: "documentos", entidade: "venda", entidade_id: id, categoria: "termo_ciencia", sigiloso: false }, `/vendas/${id}`);
      if (!res.ok) throw new Error(res.erro);
      toast.success("Termo assinado anexado.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="application/pdf,image/*" className="hidden" aria-label="Arquivo do termo assinado"
        onChange={(e) => enviar(e.target.files)} />
      <Button type="button" variant="outline" disabled={enviando} onClick={() => input.current?.click()}>
        {enviando ? <Loader2 className="animate-spin" /> : <Upload />} Anexar termo assinado (foto ou PDF)
      </Button>
    </>
  );
}

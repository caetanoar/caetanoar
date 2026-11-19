"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { enviarArquivo } from "@/lib/upload";
import { registrarArquivos } from "@/app/(app)/estoque/acoes";
import { Button } from "@/components/ui/button";

export function EnviarContrato({ consignacaoId, veiculoId, temContrato }: { consignacaoId: string; veiculoId: string; temContrato: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const r = await enviarArquivo("documentos", `consignacoes/${consignacaoId}`, arquivo);
      const res = await registrarArquivos(
        [{ ...r, bucket: "documentos", entidade: "consignacao", entidade_id: consignacaoId, categoria: "contrato", sigiloso: true }],
        veiculoId,
      );
      if (!res.ok) throw new Error(res.erro);
      toast.success("Contrato anexado.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar o contrato.");
    } finally {
      setEnviando(false);
    }
  }
  return (
    <>
      <input ref={input} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => enviar(e.target.files?.[0])} aria-label="Escolher contrato" />
      <Button type="button" variant={temContrato ? "outline" : "default"} size="sm" onClick={() => input.current?.click()} disabled={enviando}>
        {enviando ? <Loader2 className="animate-spin" /> : <FileUp />} {temContrato ? "Substituir contrato" : "Anexar contrato (PDF)"}
      </Button>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Sparkles, Loader2, MessageCircle, CalendarClock, Car, Info } from "lucide-react";
import { gerarResumoCliente } from "@/lib/ia/acoes";
import type { ResultadoCliente } from "@/lib/ia/esquemas";
import { validarTexto } from "@/lib/ia/validador";
import { linkWhatsApp } from "@/lib/whatsapp";
import { formatarDataHora } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/moeda";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alerta } from "@/components/ui/misc";
import { BotaoCopiar } from "./copiar";

const TEMPERATURA = {
  quente: { rotulo: "Quente", variante: "destructive" },
  morno: { rotulo: "Morno", variante: "warning" },
  frio: { rotulo: "Frio", variante: "info" },
} as const;

const prazo = (d: number) => (d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`);

export function ResumoCliente({ clienteId, inicial, telefone, iaAtiva }: { clienteId: string; inicial: ResultadoCliente | null; telefone: string | null; iaAtiva: boolean }) {
  const [r, setR] = useState<ResultadoCliente | null>(inicial);
  const [mensagem, setMensagem] = useState(inicial?.mensagem_whatsapp ?? "");
  const [gerando, iniciar] = useTransition();

  function gerar() {
    iniciar(async () => {
      const res = await gerarResumoCliente(clienteId);
      if (!res.ok) {
        toast.error(res.erro);
        return;
      }
      setR(res.dados);
      setMensagem(res.dados.mensagem_whatsapp);
    });
  }

  const wa = linkWhatsApp(telefone, mensagem);
  const proibidas = validarTexto(mensagem, { laudoAprovado: false });

  return (
    <div className="flex flex-col gap-3">
      {!r && <p className="text-sm text-muted-foreground">Resumo do histórico, temperatura do cliente e uma mensagem pronta para o próximo contato.</p>}
      {r && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={TEMPERATURA[r.temperatura].variante}>{TEMPERATURA[r.temperatura].rotulo}</Badge>
            {r.simulado && <Badge variant="muted">Modo simulado</Badge>}
            <span className="text-xs text-muted-foreground">{formatarDataHora(r.criadoEm)}</span>
          </div>
          <p className="text-sm">{r.resumo}</p>
          <p className="flex items-start gap-1.5 text-sm">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
            <span><strong>Próximo passo ({prazo(r.prazo_dias)}):</strong> {r.proximo_passo}</span>
          </p>
          {r.veiculos.length > 0 && (
            <ul className="flex flex-col gap-1">
              {r.veiculos.map((v) => (
                <li key={v.id}>
                  <Link href={`/estoque/${v.id}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <Car className="size-4" /> {v.nome}{v.preco ? ` · ${formatarMoeda(v.preco)}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {r.avisos.map((a) => <Alerta key={a} variante="aviso">{a}</Alerta>)}
          <Textarea aria-label="Mensagem sugerida" rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          {proibidas.length > 0 && <p role="alert" className="text-xs text-destructive">Evite: {proibidas.map((p) => `"${p}"`).join(", ")}.</p>}
          <div className="grid grid-cols-2 gap-2">
            <BotaoCopiar texto={mensagem} rotulo="Copiar mensagem" className="w-full" />
            {wa ? (
              <Button asChild variant="whatsapp" size="sm" className="w-full">
                <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> Enviar no WhatsApp</a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled className="w-full">Sem telefone</Button>
            )}
          </div>
        </>
      )}
      {!iaAtiva && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" /> IA desligada: o resumo é montado por regras, sem custo.</p>
      )}
      <Button type="button" variant={r ? "outline" : "default"} onClick={gerar} disabled={gerando}>
        {gerando ? <Loader2 className="animate-spin" /> : <Sparkles />} {r ? "Atualizar resumo" : "Gerar resumo e sugestão"}
      </Button>
    </div>
  );
}

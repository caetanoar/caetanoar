"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Camera, ShoppingBag, Store, ShieldAlert, Info } from "lucide-react";
import { gerarAnuncios } from "@/lib/ia/acoes";
import type { ResultadoAnuncio } from "@/lib/ia/esquemas";
import { validarTexto } from "@/lib/ia/validador";
import { formatarDataHora } from "@/lib/format/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alerta } from "@/components/ui/misc";
import { BotaoCopiar } from "./copiar";

function AvisoTexto({ texto, r }: { texto: string; r: ResultadoAnuncio }) {
  const proibidas = validarTexto(texto, { laudoAprovado: r.laudoAprovado, comprovados: r.comprovados });
  if (!proibidas.length) return null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
      <ShieldAlert className="mt-0.5 size-3.5 shrink-0" /> Não use sem laudo cautelar aprovado: {proibidas.map((p) => `"${p}"`).join(", ")}.
    </p>
  );
}

export function AnunciosVeiculo({ veiculoId, inicial, iaAtiva, disponivel }: { veiculoId: string; inicial: ResultadoAnuncio | null; iaAtiva: boolean; disponivel: boolean }) {
  const [r, setR] = useState<ResultadoAnuncio | null>(inicial);
  const [gerando, iniciar] = useTransition();

  function gerar() {
    iniciar(async () => {
      const res = await gerarAnuncios(veiculoId);
      if (!res.ok) {
        toast.error(res.erro);
        return;
      }
      setR(res.dados);
      toast.success(res.dados.simulado ? "Textos montados (modo simulado)." : "Textos gerados.");
    });
  }

  const editar = (f: (atual: ResultadoAnuncio) => ResultadoAnuncio) => setR((atual) => (atual ? f(atual) : atual));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="size-5" /></span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">Legenda do Instagram, OLX e Marketplace</p>
              <p className="text-muted-foreground">
                O formato da loja é fixo: só aparecem com ✅ os itens confirmados e o histórico comprovado. O que faltar vira &quot;consulte no privado&quot;.
              </p>
            </div>
          </div>
          {!iaAtiva && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" /> IA desligada (sem chave configurada): os textos são montados por regras, sem custo.
            </p>
          )}
          <Button type="button" onClick={gerar} disabled={gerando || !disponivel} size="lg">
            {gerando ? <Loader2 className="animate-spin" /> : <Sparkles />} {r ? "Gerar de novo" : "Gerar textos"}
          </Button>
          {!disponivel && <p className="text-xs text-muted-foreground">Este carro não está mais à venda.</p>}
        </CardContent>
      </Card>

      {r && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Gerado em {formatarDataHora(r.criadoEm)}</span>
            {r.simulado && <Badge variant="muted">Modo simulado</Badge>}
            {!r.laudoAprovado && <Badge variant="warning">Sem laudo aprovado</Badge>}
          </div>
          {r.pendencias.length > 0 && (
            <Alerta variante="aviso" titulo="Complete o cadastro">
              Faltam: {r.pendencias.join(", ")}. Nesses pontos o anúncio diz &quot;consulte no privado&quot;.
            </Alerta>
          )}
          {r.avisos.map((a) => <Alerta key={a} variante="aviso">{a}</Alerta>)}

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5"><Camera className="size-4" /> Instagram</CardTitle>
              <BotaoCopiar texto={r.instagram} rotulo="Copiar legenda" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Textarea aria-label="Legenda do Instagram" rows={16} value={r.instagram} onChange={(e) => editar((a) => ({ ...a, instagram: e.target.value }))} className="font-[inherit] text-sm" />
              <AvisoTexto texto={r.instagram} r={r} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5"><ShoppingBag className="size-4" /> OLX</CardTitle>
              <BotaoCopiar texto={r.olx.descricao} rotulo="Copiar descrição" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input aria-label="Título da OLX" value={r.olx.titulo} maxLength={70} onChange={(e) => editar((a) => ({ ...a, olx: { ...a.olx, titulo: e.target.value } }))} />
                <BotaoCopiar texto={r.olx.titulo} rotulo="Título" />
              </div>
              <p className="text-right text-xs text-muted-foreground numero">{r.olx.titulo.length}/70</p>
              <Textarea aria-label="Descrição da OLX" rows={7} value={r.olx.descricao} onChange={(e) => editar((a) => ({ ...a, olx: { ...a.olx, descricao: e.target.value } }))} />
              <AvisoTexto texto={`${r.olx.titulo}\n${r.olx.descricao}`} r={r} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5"><Store className="size-4" /> Marketplace</CardTitle>
              <BotaoCopiar texto={r.marketplace.descricao} rotulo="Copiar descrição" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input aria-label="Título do Marketplace" value={r.marketplace.titulo} onChange={(e) => editar((a) => ({ ...a, marketplace: { ...a.marketplace, titulo: e.target.value } }))} />
                <BotaoCopiar texto={r.marketplace.titulo} rotulo="Título" />
              </div>
              <Textarea aria-label="Descrição do Marketplace" rows={7} value={r.marketplace.descricao} onChange={(e) => editar((a) => ({ ...a, marketplace: { ...a.marketplace, descricao: e.target.value } }))} />
              <AvisoTexto texto={`${r.marketplace.titulo}\n${r.marketplace.descricao}`} r={r} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Check, X, Pencil, Handshake, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { enviarOrcamento, responderOrcamento, reabrirOrcamento, converterEmVenda, decidirDesconto } from "@/lib/orcamentos/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/form/campo";

type Acao = Parameters<typeof useAcao>[0];

function Botao({ acao, id, extras, rotulo, icone: Icone, variante = "default", className }: {
  acao: Acao; id: string; extras?: Record<string, string>; rotulo: string; icone: React.ComponentType; variante?: "default" | "outline" | "success" | "destructive"; className?: string;
}) {
  const router = useRouter();
  const [, aoEnviar, pendente] = useAcao(acao, { onSucesso: () => router.refresh() });
  return (
    <form onSubmit={aoEnviar} className={className}>
      <input type="hidden" name="id" value={id} />
      {Object.entries(extras ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Button type="submit" variant={variante} disabled={pendente} className="w-full">{pendente ? <Loader2 className="animate-spin" /> : <Icone />} {rotulo}</Button>
    </form>
  );
}

export function EnviarOrcamento({ id }: { id: string }) {
  return <Botao acao={enviarOrcamento} id={id} rotulo="Enviar ao cliente" icone={Send} />;
}
export function ReabrirOrcamento({ id }: { id: string }) {
  return <Botao acao={reabrirOrcamento} id={id} rotulo="Reabrir para editar" icone={Pencil} variante="outline" />;
}
export function ConverterEmVenda({ id }: { id: string }) {
  return <Botao acao={converterEmVenda} id={id} rotulo="Converter em venda" icone={Handshake} variante="success" />;
}

export function ResponderOrcamento({ id }: { id: string }) {
  const [recusando, setRecusando] = useState(false);
  const router = useRouter();
  const [, aoEnviar, pendente] = useAcao(responderOrcamento, { onSucesso: () => router.refresh() });
  if (recusando) {
    return (
      <form onSubmit={aoEnviar} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="aceito" value="false" />
        <Campo id="motivo-recusa" rotulo="Por que o cliente recusou?">
          <Textarea id="motivo-recusa" name="motivo" rows={2} placeholder="Ex.: achou caro, comprou em outra loja" />
        </Campo>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => setRecusando(false)}>Voltar</Button>
          <Button type="submit" variant="destructive" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Marcar recusado</Button>
        </div>
      </form>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <Botao acao={responderOrcamento} id={id} extras={{ aceito: "true" }} rotulo="Cliente aceitou" icone={Check} variante="success" />
      <Button type="button" variant="outline" onClick={() => setRecusando(true)}><X /> Cliente recusou</Button>
    </div>
  );
}

export function DecidirDesconto({ id }: { id: string }) {
  const router = useRouter();
  const [estado, aoEnviar, pendente] = useAcao(decidirDesconto, { onSucesso: () => router.refresh() });
  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <Campo id="motivo-decisao" rotulo="Motivo da decisão" erro={estado.erros?.motivo} obrigatorio>
        <Textarea id="motivo-decisao" name="motivo" rows={2} />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" name="aprovar" value="true" variant="success" disabled={pendente}><ShieldCheck /> Aprovar desconto</Button>
        <Button type="submit" name="aprovar" value="false" variant="destructive" disabled={pendente}><ShieldX /> Recusar</Button>
      </div>
    </form>
  );
}

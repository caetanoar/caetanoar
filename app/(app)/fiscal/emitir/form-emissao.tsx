"use client";

import { useRouter } from "next/navigation";
import { Loader2, FileCheck2 } from "lucide-react";
import { emitirNotaVenda } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { formatarMoeda } from "@/lib/format/moeda";

export function FormEmissao({
  vendaId,
  padrao,
  resumo,
}: {
  vendaId: string;
  padrao: { natureza: string; cfop: string; ncm: string; csosn: string; informacoes: string };
  resumo: { cliente: string; valor: number; tipo: string };
}) {
  const router = useRouter();
  const [estado, despachar, pendente] = useAcao(emitirNotaVenda, {
    onSucesso: (e) => e.dados?.id && router.push(`/fiscal/${e.dados.id}`),
  });
  const e = estado.erros ?? {};
  return (
    <form onSubmit={despachar} className="flex flex-col gap-4">
      <input type="hidden" name="venda_id" value={vendaId} />
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
      <Card>
        <CardContent className="flex justify-between p-4 text-sm">
          <span>Destinatário: <strong>{resumo.cliente}</strong><br /><span className="text-muted-foreground">{resumo.tipo === "consignado" ? "Carro consignado" : "Carro próprio"}</span></span>
          <span className="numero text-lg font-bold">{formatarMoeda(resumo.valor)}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <Campo id="natureza_operacao" rotulo="Natureza da operação" erro={e.natureza_operacao} className="sm:col-span-2">
            <Input name="natureza_operacao" defaultValue={padrao.natureza} />
          </Campo>
          <Campo id="cfop" rotulo="CFOP" erro={e.cfop} dica="Confirme com o contador">
            <Input name="cfop" inputMode="numeric" maxLength={4} defaultValue={padrao.cfop} />
          </Campo>
          <Campo id="ncm" rotulo="NCM" erro={e.ncm}>
            <Input name="ncm" inputMode="numeric" maxLength={8} defaultValue={padrao.ncm} />
          </Campo>
          <Campo id="csosn_cst" rotulo="CSOSN / CST" erro={e.csosn_cst}>
            <Input name="csosn_cst" defaultValue={padrao.csosn} />
          </Campo>
          <Campo id="informacoes" rotulo="Informações complementares" className="sm:col-span-2">
            <Textarea name="informacoes" rows={3} defaultValue={padrao.informacoes} />
          </Campo>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">O CPF do cliente é consultado com registro de acesso (LGPD) apenas para preencher a nota.</p>
      <Button type="submit" size="lg" disabled={pendente}>{pendente ? <Loader2 className="animate-spin" /> : <FileCheck2 />} Emitir NF-e</Button>
    </form>
  );
}

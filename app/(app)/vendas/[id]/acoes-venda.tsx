"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { fecharVenda, cancelarVenda } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputMoeda } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alerta } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RECEBIMENTO_CONSIGNADO } from "@/lib/estoque/rotulos";

export function FecharVenda({
  id,
  consignado,
  recebimento,
  pedirLoja,
  pedirVendedor,
  pedirParceiro,
  errosBloqueantes,
}: {
  id: string;
  consignado: boolean;
  recebimento: string | null;
  pedirLoja: boolean;
  pedirVendedor: boolean;
  pedirParceiro: boolean;
  errosBloqueantes: string[];
}) {
  const router = useRouter();
  const [estado, despachar, pendente] = useAcao(fecharVenda, { onSucesso: () => router.refresh() });
  return (
    <form onSubmit={despachar} className="flex flex-col gap-3 border-t pt-3">
      <input type="hidden" name="id" value={id} />
      {errosBloqueantes.map((e) => <Alerta key={e} variante="erro">{e}</Alerta>)}
      {consignado && (
        <Campo id="recebimento_consignado" rotulo="Como o dinheiro circula" dica="Padrão da loja: o comprador paga o dono e a loja recebe a comissão separada">
          <Select name="recebimento_consignado" defaultValue={recebimento ?? "direto_dono"}>
            {Object.entries(RECEBIMENTO_CONSIGNADO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
          </Select>
        </Campo>
      )}
      {(pedirLoja || pedirVendedor || pedirParceiro) && (
        <Alerta variante="aviso">Sem regra de comissão para este caso. Informe o valor (pode ser 0); o dono pode criar a regra depois.</Alerta>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {pedirLoja && (
          <Campo id="manual_loja" rotulo="Comissão da loja">
            <InputMoeda name="manual_loja" />
          </Campo>
        )}
        {pedirVendedor && (
          <Campo id="manual_vendedor" rotulo="Comissão do vendedor">
            <InputMoeda name="manual_vendedor" defaultValue="0,00" />
          </Campo>
        )}
        {pedirParceiro && (
          <Campo id="manual_parceiro" rotulo="Comissão de indicação">
            <InputMoeda name="manual_parceiro" defaultValue="0,00" />
          </Campo>
        )}
      </div>
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
      <Button type="submit" variant="success" size="lg" disabled={pendente || errosBloqueantes.length > 0}>
        {pendente ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Fechar venda
      </Button>
      <p className="text-xs text-muted-foreground">
        Ao fechar: o carro vira vendido, a troca entra no estoque em preparação, as comissões e a garantia são geradas e os valores vão para o financeiro.
      </p>
    </form>
  );
}

export function CancelarVenda({ id, fechada }: { id: string; fechada: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(cancelarVenda, { onSucesso: () => { setAberto(false); router.refresh(); } });
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"><XCircle /> Cancelar venda</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar venda?</DialogTitle>
          <DialogDescription>
            {fechada
              ? "Desfaz comissões, garantia e lançamentos pendentes, tira do estoque o carro da troca e devolve o carro vendido ao estoque. Recebimentos já baixados precisam ser estornados antes."
              : "O carro volta a ficar disponível."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={despachar} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
          <Textarea name="motivo" placeholder="Motivo do cancelamento" rows={2} aria-label="Motivo do cancelamento" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>Voltar</Button>
            <Button type="submit" variant="destructive" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Cancelar venda</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

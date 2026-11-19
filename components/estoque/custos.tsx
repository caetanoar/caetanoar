"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { salvarCusto, excluirCusto } from "@/app/(app)/estoque/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputMoeda, InputData } from "@/components/form/inputs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TIPO_CUSTO } from "@/lib/estoque/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, hojeISO } from "@/lib/format/data";

type Custo = { id: string; tipo: keyof typeof TIPO_CUSTO; descricao: string | null; valor: number; data: string; fornecedor: string | null; cobrar_do_consignante: boolean };

export function CustosVeiculo({
  veiculoId,
  custos,
  fornecedores,
  consignado,
}: {
  veiculoId: string;
  custos: Custo[];
  fornecedores: { id: string; nome: string }[];
  consignado: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(salvarCusto, { onSucesso: () => { setAberto(false); router.refresh(); } });
  const [, iniciar] = useTransition();
  const total = custos.reduce((s, c) => s + Number(c.valor), 0);

  return (
    <div className="flex flex-col gap-3">
      {custos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum custo de preparação lançado.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {custos.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{TIPO_CUSTO[c.tipo]}{c.descricao && <span className="font-normal text-muted-foreground"> — {c.descricao}</span>}</p>
                <p className="text-xs text-muted-foreground">
                  {formatarData(c.data)}{c.fornecedor && ` · ${c.fornecedor}`}
                  {c.cobrar_do_consignante && <Badge variant="warning" className="ml-1.5">Desconta do dono</Badge>}
                </p>
              </div>
              <span className="numero text-sm font-semibold">{formatarMoeda(c.valor)}</span>
              <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label="Remover custo"
                onClick={() => confirm("Remover este custo?") && iniciar(async () => {
                  const fd = new FormData(); fd.set("id", c.id); fd.set("veiculo_id", veiculoId);
                  const r = await excluirCusto({ ok: false }, fd);
                  if (!r.ok) toast.error(r.erro ?? "Erro."); router.refresh();
                })}>
                <Trash2 />
              </Button>
            </li>
          ))}
          <li className="flex justify-between bg-muted/40 px-3 py-2.5 text-sm font-semibold">
            <span>Total de custos</span>
            <span className="numero">{formatarMoeda(total)}</span>
          </li>
        </ul>
      )}
      {!aberto ? (
        <Button type="button" variant="outline" onClick={() => setAberto(true)}><Plus /> Lançar custo</Button>
      ) : (
        <form onSubmit={despachar} className="flex flex-col gap-3 rounded-lg border p-3">
          <input type="hidden" name="veiculo_id" value={veiculoId} />
          <div className="grid grid-cols-2 gap-3">
            <Campo id="c-tipo" rotulo="Tipo" erro={estado.erros?.tipo}>
              <Select name="tipo" defaultValue="mecanica">
                {Object.entries(TIPO_CUSTO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </Select>
            </Campo>
            <Campo id="c-valor" rotulo="Valor" erro={estado.erros?.valor} obrigatorio>
              <InputMoeda name="valor" />
            </Campo>
            <Campo id="c-data" rotulo="Data" erro={estado.erros?.data}>
              <InputData name="data" defaultValue={hojeISO()} />
            </Campo>
            <Campo id="c-forn" rotulo="Oficina / fornecedor" erro={estado.erros?.fornecedor_id}>
              <Select name="fornecedor_id" defaultValue="">
                <option value="">Não informado</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </Select>
            </Campo>
          </div>
          <Campo id="c-desc" rotulo="Descrição" erro={estado.erros?.descricao}>
            <Input name="descricao" placeholder="Ex.: troca de pastilhas e discos" />
          </Campo>
          {consignado && (
            <Label className="font-normal"><Checkbox name="cobrar_do_consignante" value="true" /> Descontar do repasse ao dono do carro</Label>
          )}
          <Label className="font-normal"><Checkbox name="lancar_financeiro" value="true" defaultChecked /> Gerar conta a pagar no financeiro</Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Lançar</Button>
          </div>
        </form>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { criarLancamento } from "../../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputData, InputMoeda } from "@/components/form/inputs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { FORMA_PAGAMENTO } from "@/lib/financeiro/rotulos";
import { hojeISO } from "@/lib/format/data";
import { cn } from "@/lib/utils";
import type { OpcoesFinanceiro } from "@/lib/financeiro/consultas";

export function FormLancamento({ opcoes, tipoInicial, veiculoId }: { opcoes: OpcoesFinanceiro; tipoInicial: "receita" | "despesa"; veiculoId?: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState(tipoInicial);
  const [pago, setPago] = useState(false);
  const [estado, despachar, pendente] = useAcao(criarLancamento, { onSucesso: () => router.push(tipo === "receita" ? "/financeiro/receber" : "/financeiro/pagar") });
  const e = estado.erros ?? {};
  const categorias = opcoes.categorias.filter((c) => c.tipo === tipo && c.natureza !== "transferencia");
  const grupos = [...new Set(categorias.map((c) => c.grupo))];

  return (
    <form onSubmit={despachar} className="flex flex-col gap-4">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="pago" value={String(pago)} />
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de lançamento">
        {(["despesa", "receita"] as const).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => setTipo(t)}
            className={cn("h-11 rounded-lg border font-medium", tipo === t ? (t === "despesa" ? "border-destructive bg-destructive/10 text-destructive" : "border-success bg-success/10 text-success") : "bg-card")}>
            {t === "despesa" ? "Despesa (saída)" : "Receita (entrada)"}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <Campo id="descricao" rotulo="Descrição" erro={e.descricao} obrigatorio className="sm:col-span-2">
            <Input name="descricao" placeholder={tipo === "despesa" ? "Ex.: Conta de energia de novembro" : "Ex.: Venda de acessório"} />
          </Campo>
          <Campo id="categoria_id" rotulo="Categoria" erro={e.categoria_id} obrigatorio>
            <Select name="categoria_id" defaultValue="" key={tipo}>
              <option value="" disabled>Escolha…</option>
              {grupos.map((g) => (
                <optgroup key={g} label={g}>
                  {categorias.filter((c) => c.grupo === g).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </optgroup>
              ))}
            </Select>
          </Campo>
          <Campo id="valor" rotulo="Valor total" erro={e.valor} obrigatorio>
            <InputMoeda name="valor" />
          </Campo>
          <Campo id="data_vencimento" rotulo="Vencimento" erro={e.data_vencimento} obrigatorio>
            <InputData name="data_vencimento" defaultValue={hojeISO()} />
          </Campo>
          <Campo id="data_competencia" rotulo="Competência" erro={e.data_competencia} dica="Mês a que se refere (vazio = vencimento)">
            <InputData name="data_competencia" />
          </Campo>
          <Campo id="parcelas" rotulo="Parcelas" erro={e.parcelas} dica="Gera uma parcela por mês">
            <Input name="parcelas" type="number" inputMode="numeric" min={1} max={120} defaultValue={1} />
          </Campo>
          <Campo id="pago-sel" rotulo="Situação">
            <Select value={String(pago)} onChange={(ev) => setPago(ev.target.value === "true")}>
              <option value="false">Pendente (a {tipo === "despesa" ? "pagar" : "receber"})</option>
              <option value="true">Já {tipo === "despesa" ? "pago" : "recebido"}</option>
            </Select>
          </Campo>
          {pago && (
            <>
              <Campo id="data_pagamento" rotulo="Data do pagamento" erro={e.data_pagamento}>
                <InputData name="data_pagamento" defaultValue={hojeISO()} />
              </Campo>
              <Campo id="forma_pagamento" rotulo="Forma" erro={e.forma_pagamento}>
                <Select name="forma_pagamento" defaultValue="pix">
                  {Object.entries(FORMA_PAGAMENTO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
                </Select>
              </Campo>
            </>
          )}
          <Campo id="conta_id" rotulo="Conta" erro={e.conta_id} obrigatorio={pago}>
            <Select name="conta_id" defaultValue="">
              <option value="">{pago ? "Escolha…" : "Definir na baixa"}</option>
              {opcoes.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>
          <Campo id="veiculo_id" rotulo="Veículo vinculado (opcional)" erro={e.veiculo_id}>
            <Select name="veiculo_id" defaultValue={veiculoId ?? ""}>
              <option value="">Nenhum</option>
              {opcoes.veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </Select>
          </Campo>
          {tipo === "despesa" && (
            <Campo id="fornecedor_id" rotulo="Fornecedor (opcional)" erro={e.fornecedor_id}>
              <Select name="fornecedor_id" defaultValue="">
                <option value="">Nenhum</option>
                {opcoes.fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </Select>
            </Campo>
          )}
          <Campo id="observacoes" rotulo="Observações" className="sm:col-span-2">
            <Textarea name="observacoes" rows={2} />
          </Campo>
        </CardContent>
      </Card>
      <div className="flex gap-2 sm:justify-end">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={pendente} className="flex-1 sm:flex-none">{pendente && <Loader2 className="animate-spin" />} Salvar lançamento</Button>
      </div>
    </form>
  );
}

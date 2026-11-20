"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Calculator } from "lucide-react";
import { salvarRegra, definirRegraConsignacao } from "./acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputData, InputMoeda } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { TIPO_COMISSAO, BASE_COMISSAO } from "@/lib/vendas/rotulos";
import { formatarMoeda, parseMoeda } from "@/lib/format/moeda";
import { hojeISO } from "@/lib/format/data";
import type { Database } from "@/lib/supabase/database.types";

type Regra = Database["public"]["Tables"]["regras_comissao"]["Row"];
type Opcao = { id: string; nome: string };

export function FormRegra({ regra, consignantes, vendedores, parceiros }: { regra?: Regra; consignantes: Opcao[]; vendedores: Opcao[]; parceiros: Opcao[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<Regra["tipo"]>(regra?.tipo ?? "loja_consignado");
  const [modo, setModo] = useState<Regra["modo"]>(regra?.modo ?? "percentual");
  const [estado, despachar, pendente] = useAcao(salvarRegra, { onSucesso: () => { setAberto(false); router.refresh(); } });
  const e = estado.erros ?? {};
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {regra ? <Button variant="ghost" size="icon-sm" aria-label={`Editar ${regra.nome}`}><Pencil /></Button> : <Button size="sm"><Plus /> Nova regra</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{regra ? "Editar regra" : "Nova regra de comissão"}</DialogTitle>
          <DialogDescription>Percentual (com piso e teto opcionais) ou valor fixo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={despachar} className="grid grid-cols-2 gap-3">
          {regra && <input type="hidden" name="id" value={regra.id} />}
          <Campo id="r-nome" rotulo="Nome" erro={e.nome} obrigatorio className="col-span-2">
            <Input name="nome" defaultValue={regra?.nome} placeholder="Ex.: Consignado padrão, Família, Vendedor João" />
          </Campo>
          <Campo id="r-tipo" rotulo="Tipo" className="col-span-2">
            <Select name="tipo" value={tipo} onChange={(ev) => setTipo(ev.target.value as Regra["tipo"])}>
              {Object.entries(TIPO_COMISSAO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </Campo>
          {tipo === "loja_consignado" && (
            <Campo id="r-consignante" rotulo="Consignante" className="col-span-2" dica="Vazio = vale para todos os consignantes">
              <Select name="consignante_id" defaultValue={regra?.consignante_id ?? ""}>
                <option value="">Todos (regra padrão)</option>
                {consignantes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </Campo>
          )}
          {tipo === "vendedor" && (
            <Campo id="r-vendedor" rotulo="Vendedor" dica="Vazio = todos">
              <Select name="vendedor_id" defaultValue={regra?.vendedor_id ?? ""}>
                <option value="">Todos</option>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </Select>
            </Campo>
          )}
          {tipo === "parceiro" && (
            <Campo id="r-parceiro" rotulo="Parceiro" dica="Vazio = todos">
              <Select name="parceiro_id" defaultValue={regra?.parceiro_id ?? ""}>
                <option value="">Todos</option>
                {parceiros.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </Campo>
          )}
          {tipo !== "loja_consignado" ? (
            <Campo id="r-aplica" rotulo="Vale para">
              <Select name="aplica_a" defaultValue={regra?.aplica_a ?? "todos"}>
                <option value="todos">Próprios e consignados</option>
                <option value="proprio">Só carros próprios</option>
                <option value="consignado">Só consignados</option>
              </Select>
            </Campo>
          ) : (
            <input type="hidden" name="aplica_a" value="consignado" />
          )}
          <Campo id="r-modo" rotulo="Modo">
            <Select name="modo" value={modo} onChange={(ev) => setModo(ev.target.value as Regra["modo"])}>
              <option value="percentual">Percentual</option>
              <option value="fixo">Valor fixo</option>
            </Select>
          </Campo>
          {modo === "percentual" ? (
            <Campo id="r-pct" rotulo="Percentual (%)" erro={e.percentual}>
              <Input name="percentual" inputMode="decimal" defaultValue={regra?.percentual ?? ""} placeholder="Ex.: 5" />
            </Campo>
          ) : (
            <Campo id="r-fixo" rotulo="Valor fixo" erro={e.valor_fixo}>
              <InputMoeda name="valor_fixo" defaultValue={regra?.valor_fixo ?? null} />
            </Campo>
          )}
          {tipo !== "loja_consignado" && modo === "percentual" ? (
            <Campo id="r-base" rotulo="Calculado sobre" className="col-span-2" dica="Para carro próprio, “comissão da loja” usa o lucro">
              <Select name="base" defaultValue={regra?.base ?? (tipo === "vendedor" ? "comissao_loja" : "valor_venda")}>
                {Object.entries(BASE_COMISSAO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </Select>
            </Campo>
          ) : (
            <input type="hidden" name="base" value={regra?.base ?? "valor_venda"} />
          )}
          {modo === "percentual" && (
            <>
              <Campo id="r-piso" rotulo="Piso (mínimo)" erro={e.piso}>
                <InputMoeda name="piso" defaultValue={regra?.piso ?? null} />
              </Campo>
              <Campo id="r-teto" rotulo="Teto (máximo)" erro={e.teto}>
                <InputMoeda name="teto" defaultValue={regra?.teto ?? null} />
              </Campo>
            </>
          )}
          <Campo id="r-desde" rotulo="Vigente desde" erro={e.vigente_desde}>
            <InputData name="vigente_desde" defaultValue={regra?.vigente_desde ?? hojeISO()} />
          </Campo>
          <Campo id="r-ate" rotulo="Até (opcional)" erro={e.vigente_ate}>
            <InputData name="vigente_ate" defaultValue={regra?.vigente_ate ?? ""} />
          </Campo>
          <Campo id="r-prio" rotulo="Prioridade" dica="Maior vence em empate">
            <Input name="prioridade" type="number" inputMode="numeric" defaultValue={regra?.prioridade ?? 0} />
          </Campo>
          <Campo id="r-ativa" rotulo="Situação">
            <Select name="ativa" defaultValue={String(regra?.ativa ?? true)}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </Select>
          </Campo>
          <Campo id="r-obs" rotulo="Observações" className="col-span-2">
            <Textarea name="observacoes" defaultValue={regra?.observacoes ?? ""} rows={2} />
          </Campo>
          <Button type="submit" disabled={pendente} className="col-span-2">{pendente && <Loader2 className="animate-spin" />} Salvar regra</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function calcular(r: Regra, base: number) {
  const bruto = r.modo === "fixo" ? Number(r.valor_fixo) : (Math.max(base, 0) * Number(r.percentual)) / 100;
  const comPiso = Math.max(Number(r.piso ?? 0), bruto);
  const comTeto = r.teto !== null ? Math.min(Number(r.teto), comPiso) : comPiso;
  return Math.max(0, Math.round(comTeto * 100) / 100);
}

export function Simulador({ regras }: { regras: Regra[] }) {
  const [regraId, setRegraId] = useState(regras[0]?.id ?? "");
  const [base, setBase] = useState("");
  const regra = regras.find((r) => r.id === regraId);
  const valor = regra ? calcular(regra, parseMoeda(base) ?? 0) : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5"><Calculator className="size-4" /> Simulador</CardTitle>
        <CardDescription>Teste uma regra com um valor de base (venda, comissão da loja ou lucro).</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select value={regraId} onChange={(e) => setRegraId(e.target.value)} aria-label="Regra">
          {regras.length === 0 && <option value="">Nenhuma regra ativa</option>}
          {regras.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </Select>
        <InputMoeda aria-label="Valor base" onValorChange={setBase} placeholder="Valor base" />
        <div className="flex items-center rounded-lg border bg-muted/40 px-3">
          <span className="text-sm text-muted-foreground">Comissão:&nbsp;</span>
          <span className="numero font-semibold">{formatarMoeda(valor)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function RegraDaConsignacao({ consignacaoId, regraId, regras, podeEditar }: { consignacaoId: string; regraId: string | null; regras: Opcao[]; podeEditar: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <Select
      aria-label="Regra da consignação"
      className="sm:w-64"
      defaultValue={regraId ?? ""}
      disabled={!podeEditar || pendente}
      onChange={(e) =>
        iniciar(async () => {
          const fd = new FormData();
          fd.set("consignacao_id", consignacaoId);
          fd.set("regra_id", e.target.value);
          const r = await definirRegraConsignacao({ ok: false }, fd);
          if (r.ok) toast.success(r.mensagem!);
          else toast.error(r.erro!);
          router.refresh();
        })
      }
    >
      <option value="">Automática (regra do consignante ou padrão)</option>
      {regras.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
    </Select>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Car, AlertTriangle, CheckCircle2 } from "lucide-react";
import { salvarVenda } from "./acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputData, InputMoeda, InputPlaca } from "@/components/form/inputs";
import { FipeBusca, type ResultadoFipe } from "@/components/estoque/fipe-busca";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { FORMA_VENDA, BANCOS_FINANCIAMENTO } from "@/lib/vendas/rotulos";
import { RECEBIMENTO_CONSIGNADO } from "@/lib/estoque/rotulos";
import { COMBUSTIVEIS, CAMBIOS } from "@/lib/format/veiculo";
import { formatarMoeda, formatarNumeroMoeda, parseMoeda } from "@/lib/format/moeda";
import { hojeISO } from "@/lib/format/data";
import { cn } from "@/lib/utils";

export type VeiculoOpcao = { id: string; nome: string; tipo: "proprio" | "consignado"; preco_anunciado: number | null; preco_negociavel: number | null };
type Opcao = { id: string; nome: string };
type Pagamento = { forma: string; valor: string; banco_financiamento: string; parcelas: string; data_prevista: string; recebido: boolean; conta_id: string };
type Troca = {
  placa: string; marca: string; modelo: string; versao: string; motor: string; ano_fabricacao: string; ano_modelo: string; cor: string; km: string;
  combustivel: string; cambio: string; codigo_fipe: string; valor_fipe: number | null; valor_avaliacao: string; observacoes: string; chave: number;
};

const pagamentoVazio = (): Pagamento => ({ forma: "pix", valor: "", banco_financiamento: "", parcelas: "", data_prevista: "", recebido: false, conta_id: "" });
const trocaVazia = (): Troca => ({
  placa: "", marca: "", modelo: "", versao: "", motor: "", ano_fabricacao: "", ano_modelo: "", cor: "", km: "",
  combustivel: "", cambio: "", codigo_fipe: "", valor_fipe: null, valor_avaliacao: "", observacoes: "", chave: Math.random(),
});

export function FormVenda({
  veiculos,
  clientes,
  parceiros,
  vendedores,
  contas,
  gestor,
  config,
  valores,
}: {
  veiculos: VeiculoOpcao[];
  clientes: Opcao[];
  parceiros: Opcao[];
  vendedores: Opcao[];
  contas: Opcao[];
  gestor: boolean;
  config: { garantia_dias: number; garantia_cobertura: string | null };
  valores?: {
    id?: string;
    veiculo_id?: string;
    cliente_id?: string;
    vendedor_id?: string;
    parceiro_id?: string | null;
    data_venda?: string;
    valor_venda?: number;
    valor_entrada?: number;
    garantia_dias?: number | null;
    garantia_cobertura?: string | null;
    recebimento_consignado?: string | null;
    observacoes?: string | null;
    pagamentos?: Partial<Pagamento>[];
    trocas?: Partial<Troca>[];
  };
}) {
  const router = useRouter();
  const [veiculoId, setVeiculoId] = useState(valores?.veiculo_id ?? "");
  const veiculo = veiculos.find((v) => v.id === veiculoId);
  const [valorVenda, setValorVenda] = useState(valores?.valor_venda ? formatarNumeroMoeda(valores.valor_venda) : veiculo?.preco_anunciado ? formatarNumeroMoeda(veiculo.preco_anunciado) : "");
  const [chaveValor, setChaveValor] = useState(0);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(
    valores?.pagamentos?.length ? valores.pagamentos.map((p) => ({ ...pagamentoVazio(), ...p })) : [pagamentoVazio()],
  );
  const [trocas, setTrocas] = useState<Troca[]>((valores?.trocas ?? []).map((t) => ({ ...trocaVazia(), ...t })));
  const [estado, despachar, pendente] = useAcao(salvarVenda, { onSucesso: (e) => e.dados?.id && router.push(`/vendas/${e.dados.id}`) });
  const e = estado.erros ?? {};

  const nValor = parseMoeda(valorVenda) ?? 0;
  const totalPag = pagamentos.reduce((s, p) => s + (parseMoeda(p.valor) ?? 0), 0);
  const totalTroca = trocas.reduce((s, t) => s + (parseMoeda(t.valor_avaliacao) ?? 0), 0);
  const falta = Math.round((nValor - totalPag - totalTroca) * 100) / 100;
  const abaixo = veiculo && nValor > 0 && nValor < (veiculo.preco_negociavel ?? veiculo.preco_anunciado ?? 0);
  const entradaSugerida = pagamentos.filter((p) => p.forma !== "financiamento").reduce((s, p) => s + (parseMoeda(p.valor) ?? 0), 0) + totalTroca;

  const pagamentosJson = useMemo(
    () => JSON.stringify(pagamentos.map((p) => ({ ...p, valor: parseMoeda(p.valor), parcelas: p.parcelas || null }))),
    [pagamentos],
  );
  const trocasJson = useMemo(
    () =>
      JSON.stringify(
        trocas.map((t) => {
          const { chave, ...resto } = t;
          void chave;
          return { ...resto, valor_avaliacao: parseMoeda(t.valor_avaliacao) };
        }),
      ),
    [trocas],
  );

  function atualizarPag(i: number, campo: keyof Pagamento, valor: string | boolean) {
    setPagamentos((lista) => lista.map((p, k) => (k === i ? { ...p, [campo]: valor } : p)));
  }
  function atualizarTroca(i: number, campo: keyof Troca, valor: string | number | null) {
    setTrocas((lista) => lista.map((t, k) => (k === i ? { ...t, [campo]: valor } : t)));
  }
  function aplicarFipe(i: number, r: ResultadoFipe) {
    const partes = r.modelo.split(/\s+/);
    setTrocas((lista) =>
      lista.map((t, k) =>
        k === i
          ? {
              ...t,
              marca: r.marcaNormalizada,
              modelo: partes[0],
              versao: partes.slice(1).join(" "),
              ano_modelo: String(r.anoModelo),
              combustivel: r.combustivelNormalizado ?? t.combustivel,
              codigo_fipe: r.codigoFipe,
              valor_fipe: r.valor,
              chave: Math.random(),
            }
          : t,
      ),
    );
  }

  return (
    <form onSubmit={despachar} className="flex flex-col gap-4">
      {valores?.id && <input type="hidden" name="id" value={valores.id} />}
      <input type="hidden" name="pagamentos_json" value={pagamentosJson} />
      <input type="hidden" name="trocas_json" value={trocasJson} />
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}

      <Card>
        <CardHeader><CardTitle>Carro e cliente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="veiculo_id" rotulo="Carro" erro={e.veiculo_id} obrigatorio className="sm:col-span-2">
            <Select
              name="veiculo_id"
              value={veiculoId}
              onChange={(ev) => {
                setVeiculoId(ev.target.value);
                const v = veiculos.find((x) => x.id === ev.target.value);
                if (v?.preco_anunciado && !valores?.valor_venda) {
                  setValorVenda(formatarNumeroMoeda(v.preco_anunciado));
                  setChaveValor((c) => c + 1);
                }
              }}
            >
              <option value="" disabled>Escolha o carro…</option>
              {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome} — {formatarMoeda(v.preco_anunciado)}</option>)}
            </Select>
          </Campo>
          {veiculo && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-sm sm:col-span-2">
              <span><Car className="mr-1 inline size-4" />{veiculo.tipo === "consignado" ? "Consignado" : "Próprio"}</span>
              <span>Anunciado: <strong>{formatarMoeda(veiculo.preco_anunciado)}</strong></span>
              <span>Negociável até: <strong>{formatarMoeda(veiculo.preco_negociavel)}</strong></span>
            </div>
          )}
          <Campo id="cliente_id" rotulo="Cliente" erro={e.cliente_id} obrigatorio
            dica={<Link href="/clientes/novo" target="_blank" className="text-primary hover:underline">Cadastrar novo cliente</Link>}>
            <Select name="cliente_id" defaultValue={valores?.cliente_id ?? ""}>
              <option value="" disabled>Escolha o cliente…</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>
          {gestor ? (
            <Campo id="vendedor_id" rotulo="Vendedor" erro={e.vendedor_id}>
              <Select name="vendedor_id" defaultValue={valores?.vendedor_id ?? ""}>
                <option value="">Eu mesmo</option>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </Select>
            </Campo>
          ) : null}
          <Campo id="parceiro_id" rotulo="Indicação (parceiro)" erro={e.parceiro_id} dica="Gera comissão de indicação">
            <Select name="parceiro_id" defaultValue={valores?.parceiro_id ?? ""}>
              <option value="">Sem indicação</option>
              {parceiros.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </Campo>
          <Campo id="data_venda" rotulo="Data da venda" erro={e.data_venda}>
            <InputData name="data_venda" defaultValue={valores?.data_venda ?? hojeISO()} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Valores</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="valor_venda" rotulo="Valor da venda" erro={e.valor_venda} obrigatorio>
            <InputMoeda key={chaveValor} name="valor_venda" defaultValue={valorVenda} onValorChange={setValorVenda} />
          </Campo>
          <Campo id="valor_entrada" rotulo="Entrada" erro={e.valor_entrada} dica={`Sugestão: ${formatarMoeda(entradaSugerida)} (tudo que não é financiado)`}>
            <InputMoeda name="valor_entrada" defaultValue={valores?.valor_entrada ?? null} />
          </Campo>
          {abaixo && (
            <Alerta variante="aviso" className="sm:col-span-2">
              <span className="flex items-center gap-1.5"><AlertTriangle className="size-4" /> Valor abaixo do negociável: o gerente vai avaliar na aprovação.</span>
            </Alerta>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formas de pagamento</CardTitle>
          <CardDescription>Pode combinar: entrada no Pix + financiamento + troca.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pagamentos.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <Campo id={`pg-forma-${i}`} rotulo="Forma">
                <Select value={p.forma} onChange={(ev) => atualizarPag(i, "forma", ev.target.value)}>
                  {Object.entries(FORMA_VENDA).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
                </Select>
              </Campo>
              <Campo id={`pg-valor-${i}`} rotulo="Valor">
                <InputMoeda defaultValue={p.valor} onValorChange={(v) => atualizarPag(i, "valor", v)} />
              </Campo>
              {p.forma === "financiamento" && (
                <Campo id={`pg-banco-${i}`} rotulo="Banco">
                  <Select value={p.banco_financiamento} onChange={(ev) => atualizarPag(i, "banco_financiamento", ev.target.value)}>
                    <option value="" disabled>Escolha…</option>
                    {BANCOS_FINANCIAMENTO.map((b) => <option key={b} value={b}>{b}</option>)}
                  </Select>
                </Campo>
              )}
              {(p.forma === "financiamento" || p.forma === "cartao_credito") && (
                <Campo id={`pg-parc-${i}`} rotulo="Parcelas">
                  <Input inputMode="numeric" value={p.parcelas} onChange={(ev) => atualizarPag(i, "parcelas", ev.target.value.replace(/\D/g, ""))} placeholder="48" />
                </Campo>
              )}
              <Campo id={`pg-data-${i}`} rotulo="Previsão de recebimento">
                <InputData defaultValue={p.data_prevista} onValorChange={(v) => atualizarPag(i, "data_prevista", v)} />
              </Campo>
              {gestor && (
                <div className="col-span-2 flex flex-col gap-2">
                  <Label className="font-normal">
                    <Checkbox checked={p.recebido} onCheckedChange={(c) => atualizarPag(i, "recebido", c === true)} /> Já recebido
                  </Label>
                  {p.recebido && (
                    <Select value={p.conta_id} onChange={(ev) => atualizarPag(i, "conta_id", ev.target.value)} aria-label="Conta do recebimento">
                      <option value="">Conta em que entrou…</option>
                      {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </Select>
                  )}
                </div>
              )}
              {pagamentos.length > 1 && (
                <Button type="button" variant="ghost" size="sm" className="col-span-2 justify-self-end text-destructive" onClick={() => setPagamentos((l) => l.filter((_, k) => k !== i))}>
                  <Trash2 /> Remover forma
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setPagamentos((l) => [...l, pagamentoVazio()])}><Plus /> Adicionar forma de pagamento</Button>
          {e.pagamentos && <p className="text-sm text-destructive">{e.pagamentos[0]}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Carro na troca</CardTitle>
          <CardDescription>Ao fechar a venda, ele entra no estoque como carro próprio, em preparação.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {trocas.map((t, i) => (
            <div key={t.chave} className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div className="col-span-2 flex items-center justify-between">
                <p className="text-sm font-medium">Troca {i + 1}</p>
                <FipeBusca rotulo="FIPE" onSelecionar={(r) => aplicarFipe(i, r)} />
              </div>
              <Campo id={`tr-placa-${i}`} rotulo="Placa">
                <InputPlaca defaultValue={t.placa} onValorChange={(v) => atualizarTroca(i, "placa", v)} />
              </Campo>
              <Campo id={`tr-km-${i}`} rotulo="Km">
                <Input inputMode="numeric" defaultValue={t.km} onChange={(ev) => atualizarTroca(i, "km", ev.target.value)} />
              </Campo>
              <Campo id={`tr-marca-${i}`} rotulo="Marca">
                <Input defaultValue={t.marca} onChange={(ev) => atualizarTroca(i, "marca", ev.target.value)} />
              </Campo>
              <Campo id={`tr-modelo-${i}`} rotulo="Modelo">
                <Input defaultValue={t.modelo} onChange={(ev) => atualizarTroca(i, "modelo", ev.target.value)} />
              </Campo>
              <Campo id={`tr-versao-${i}`} rotulo="Versão" className="col-span-2">
                <Input defaultValue={t.versao} onChange={(ev) => atualizarTroca(i, "versao", ev.target.value)} />
              </Campo>
              <Campo id={`tr-anofab-${i}`} rotulo="Ano fab.">
                <Input inputMode="numeric" maxLength={4} defaultValue={t.ano_fabricacao} onChange={(ev) => atualizarTroca(i, "ano_fabricacao", ev.target.value)} />
              </Campo>
              <Campo id={`tr-anomod-${i}`} rotulo="Ano modelo">
                <Input inputMode="numeric" maxLength={4} defaultValue={t.ano_modelo} onChange={(ev) => atualizarTroca(i, "ano_modelo", ev.target.value)} />
              </Campo>
              <Campo id={`tr-cor-${i}`} rotulo="Cor">
                <Input defaultValue={t.cor} onChange={(ev) => atualizarTroca(i, "cor", ev.target.value)} />
              </Campo>
              <Campo id={`tr-comb-${i}`} rotulo="Combustível">
                <Select defaultValue={t.combustivel} onChange={(ev) => atualizarTroca(i, "combustivel", ev.target.value)}>
                  <option value="">—</option>
                  {Object.entries(COMBUSTIVEIS).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
                </Select>
              </Campo>
              <Campo id={`tr-cambio-${i}`} rotulo="Câmbio">
                <Select defaultValue={t.cambio} onChange={(ev) => atualizarTroca(i, "cambio", ev.target.value)}>
                  <option value="">—</option>
                  {Object.entries(CAMBIOS).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
                </Select>
              </Campo>
              <Campo id={`tr-aval-${i}`} rotulo="Valor da avaliação" obrigatorio dica={t.valor_fipe ? `FIPE: ${formatarMoeda(t.valor_fipe)}` : undefined}>
                <InputMoeda defaultValue={t.valor_avaliacao} onValorChange={(v) => atualizarTroca(i, "valor_avaliacao", v)} />
              </Campo>
              <Campo id={`tr-obs-${i}`} rotulo="Observações (estado, pendências)" className="col-span-2">
                <Input defaultValue={t.observacoes} onChange={(ev) => atualizarTroca(i, "observacoes", ev.target.value)} />
              </Campo>
              <Button type="button" variant="ghost" size="sm" className="col-span-2 justify-self-end text-destructive" onClick={() => setTrocas((l) => l.filter((_, k) => k !== i))}>
                <Trash2 /> Remover troca
              </Button>
            </div>
          ))}
          {trocas.length < 3 && <Button type="button" variant="outline" onClick={() => setTrocas((l) => [...l, trocaVazia()])}><Plus /> Adicionar carro na troca</Button>}
          {e.trocas && <p className="text-sm text-destructive">{e.trocas[0]}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Garantia e observações</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="garantia_dias" rotulo="Garantia (dias)" erro={e.garantia_dias}>
            <Input name="garantia_dias" type="number" inputMode="numeric" defaultValue={valores?.garantia_dias ?? config.garantia_dias} />
          </Campo>
          {gestor && veiculo?.tipo === "consignado" && (
            <Campo id="recebimento_consignado" rotulo="Recebimento (consignado)" erro={e.recebimento_consignado}>
              <Select name="recebimento_consignado" defaultValue={valores?.recebimento_consignado ?? ""}>
                <option value="">Padrão do contrato/loja</option>
                {Object.entries(RECEBIMENTO_CONSIGNADO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </Select>
            </Campo>
          )}
          <Campo id="garantia_cobertura" rotulo="Cobertura da garantia" className="sm:col-span-2">
            <Textarea name="garantia_cobertura" defaultValue={valores?.garantia_cobertura ?? config.garantia_cobertura ?? ""} rows={2} placeholder="Ex.: motor e câmbio" />
          </Campo>
          <Campo id="observacoes" rotulo="Observações" className="sm:col-span-2">
            <Textarea name="observacoes" defaultValue={valores?.observacoes ?? ""} rows={2} />
          </Campo>
        </CardContent>
      </Card>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-2 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <div className="flex items-center justify-between text-sm">
          <span>Pagamentos + troca: <strong className="numero">{formatarMoeda(totalPag + totalTroca)}</strong></span>
          {falta === 0 && nValor > 0 ? (
            <span className="flex items-center gap-1 font-medium text-success"><CheckCircle2 className="size-4" /> Fechado</span>
          ) : (
            <span className={cn("numero font-medium", falta !== 0 && "text-destructive")}>{falta > 0 ? `Faltam ${formatarMoeda(falta)}` : `Sobram ${formatarMoeda(-falta)}`}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={pendente}>
            {pendente && <Loader2 className="animate-spin" />} {gestor ? "Salvar e revisar" : "Enviar para aprovação"}
          </Button>
        </div>
      </div>
    </form>
  );
}

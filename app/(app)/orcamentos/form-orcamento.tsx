"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Search, ShieldCheck, ShieldAlert, Calculator, UserPlus } from "lucide-react";
import { salvarOrcamento, avaliarDesconto, consultarTroca } from "@/lib/orcamentos/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { Campo } from "@/components/form/campo";
import { InputData, InputMoeda, InputPlaca, InputTelefone } from "@/components/form/inputs";
import { SeloConsulta } from "@/components/consulta/selo";
import { FORMA_VENDA, BANCOS_FINANCIAMENTO } from "@/lib/vendas/rotulos";
import { formatarMoeda, formatarNumeroMoeda, parseMoeda } from "@/lib/format/moeda";
import { simular, AVISO_SIMULACAO, type TaxaPrazo } from "@/lib/orcamentos/simulacao";
import { validarTextoConsulta } from "@/lib/ia/validador";
import { cn } from "@/lib/utils";

type Carro = { id: string; marca: string | null; modelo: string | null; versao: string | null; ano_modelo: number | null; placa: string | null; preco_anunciado: number | null; preco_negociavel: number | null; status: string | null };
type Cliente = { id: string; nome: string; whatsapp: string | null; telefone: string | null };
type Pag = { forma: string; valor: string; banco_financiamento: string; parcelas: string };
type Tro = {
  consulta_id: string | null; placa: string; marca: string; modelo: string; versao: string | null; ano_fabricacao: string; ano_modelo: string;
  cor: string; km: string; valor_fipe: number | null; valor_avaliacao: string; selo: "verde" | "amarelo" | "vermelho" | null;
};

export type ValoresOrcamento = {
  id?: string;
  veiculo_id?: string;
  cliente_id?: string;
  valor_final?: number | null;
  valor_entrada?: number | null;
  validade?: string | null;
  observacoes?: string | null;
  desconto_motivo?: string | null;
  simulacao_prazo?: number | null;
  pagamentos?: { forma: string; valor: number; banco_financiamento: string | null; parcelas: number | null }[];
  trocas?: {
    consulta_id?: string | null; placa?: string | null; marca?: string; modelo?: string; versao?: string | null; cor?: string | null;
    ano_fabricacao?: number | string | null; ano_modelo?: number | string | null; km?: number | string | null;
    valor_fipe?: number | null; valor_avaliacao?: number | string | null; selo?: "verde" | "amarelo" | "vermelho" | null;
  }[];
};

const n = (v: string) => parseMoeda(v) ?? 0;
const nomeCarro = (c: Carro) => [c.marca, c.modelo, c.versao, c.ano_modelo].filter(Boolean).join(" ");
const trocaVazia = (): Tro => ({ consulta_id: null, placa: "", marca: "", modelo: "", versao: null, ano_fabricacao: "", ano_modelo: "", cor: "", km: "", valor_fipe: null, valor_avaliacao: "", selo: null });

export function FormOrcamento({ carros, clientes, taxas, podeConsultar, valores }: {
  carros: Carro[]; clientes: Cliente[]; taxas: TaxaPrazo[]; podeConsultar: boolean; valores: ValoresOrcamento;
}) {
  const router = useRouter();
  const [veiculoId, setVeiculoId] = useState(valores.veiculo_id ?? "");
  const carro = carros.find((c) => c.id === veiculoId);
  const [clienteNovo, setClienteNovo] = useState(!valores.cliente_id && clientes.length === 0);
  const [valorFinal, setValorFinal] = useState(valores.valor_final ? formatarNumeroMoeda(valores.valor_final) : carro?.preco_anunciado ? formatarNumeroMoeda(carro.preco_anunciado) : "");
  const [entrada, setEntrada] = useState(valores.valor_entrada ? formatarNumeroMoeda(valores.valor_entrada) : "");
  const [pagamentos, setPagamentos] = useState<Pag[]>(
    (valores.pagamentos ?? []).map((p) => ({ forma: p.forma, valor: formatarNumeroMoeda(p.valor), banco_financiamento: p.banco_financiamento ?? "", parcelas: p.parcelas ? String(p.parcelas) : "" })),
  );
  const [trocas, setTrocas] = useState<Tro[]>(
    (valores.trocas ?? []).map((t) => ({
      ...trocaVazia(),
      consulta_id: t.consulta_id ?? null, versao: t.versao ?? null, valor_fipe: t.valor_fipe ?? null, selo: t.selo ?? null,
      placa: t.placa ?? "", marca: t.marca ?? "", modelo: t.modelo ?? "", cor: t.cor ?? "",
      ano_modelo: t.ano_modelo ? String(t.ano_modelo) : "", ano_fabricacao: t.ano_fabricacao ? String(t.ano_fabricacao) : "", km: t.km ? String(t.km) : "",
      valor_avaliacao: t.valor_avaliacao ? formatarNumeroMoeda(Number(t.valor_avaliacao)) : "",
    })),
  );
  const [prazo, setPrazo] = useState(valores.simulacao_prazo ? String(valores.simulacao_prazo) : taxas[0] ? String(taxas[taxas.length - 1].prazo) : "");
  const [obs, setObs] = useState(valores.observacoes ?? "");
  const [resposta, setResposta] = useState<{ chave: string; r: "dentro" | "fora" | null } | null>(null);
  const [consultando, iniciarConsulta] = useTransition();

  const [estado, aoEnviar, pendente] = useAcao(salvarOrcamento, {
    onSucesso: (r) => router.push(`/orcamentos/${r.dados?.id ?? valores.id}`),
  });
  const e = estado.erros ?? {};

  const preco = carro?.preco_anunciado ?? 0;
  const vf = n(valorFinal);
  const desconto = Math.max(preco - vf, 0);
  const somaPag = pagamentos.reduce((s, p) => s + n(p.valor), 0);
  const somaTrocas = trocas.reduce((s, t) => s + n(t.valor_avaliacao), 0);
  const falta = Math.round((vf - somaPag - somaTrocas) * 100) / 100;
  const financiado = pagamentos.filter((p) => p.forma === "financiamento").reduce((s, p) => s + n(p.valor), 0);
  const opcao = taxas.find((t) => String(t.prazo) === prazo);
  const sim = financiado > 0 && opcao ? simular(financiado, opcao) : null;
  const proibidas = validarTextoConsulta(obs);

  // Indicador "dentro/fora do limite" (o servidor decide; o vendedor não vê mínimo nem custo).
  const precisaAvaliar = Boolean(veiculoId) && vf > 0 && vf < preco;
  const chave = `${veiculoId}:${vf}`;
  const avaliacao = precisaAvaliar && resposta?.chave === chave ? resposta.r : null;
  useEffect(() => {
    if (!precisaAvaliar) return;
    const t = setTimeout(() => avaliarDesconto(veiculoId, vf).then((r) => setResposta({ chave: `${veiculoId}:${vf}`, r })), 350);
    return () => clearTimeout(t);
  }, [precisaAvaliar, veiculoId, vf]);

  function trocarCarro(id: string) {
    setVeiculoId(id);
    const c = carros.find((x) => x.id === id);
    if (c?.preco_anunciado) setValorFinal(formatarNumeroMoeda(c.preco_anunciado));
  }

  function consultar(i: number) {
    const placa = trocas[i].placa;
    iniciarConsulta(async () => {
      const r = await consultarTroca(placa);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      const d = r.dados;
      if (d.status !== "encontrado") toast.warning("Placa não encontrada na base do provedor: preencha os dados à mão.");
      setTrocas((ts) => ts.map((t, j) => j === i ? {
        ...t, consulta_id: d.consulta_id, placa: d.placa, selo: d.selo,
        marca: d.marca || t.marca, modelo: d.modelo || t.modelo, versao: d.versao, cor: d.cor ?? t.cor,
        ano_fabricacao: d.ano_fabricacao ? String(d.ano_fabricacao) : t.ano_fabricacao, ano_modelo: d.ano_modelo ? String(d.ano_modelo) : t.ano_modelo,
        valor_fipe: d.valor_fipe,
      } : t));
      if (d.selo === "vermelho") toast.error("Carro de troca com registro impeditivo. Veja a consulta antes de aceitar.");
    });
  }

  const pagamentosJson = useMemo(() => JSON.stringify(pagamentos.map((p) => ({
    forma: p.forma, valor: n(p.valor), banco_financiamento: p.banco_financiamento || null, parcelas: p.parcelas ? Number(p.parcelas) : null,
  }))), [pagamentos]);
  const trocasJson = useMemo(() => JSON.stringify(trocas.map((t) => ({
    consulta_id: t.consulta_id, placa: t.placa, marca: t.marca, modelo: t.modelo, versao: t.versao, cor: t.cor || null,
    ano_fabricacao: t.ano_fabricacao || null, ano_modelo: t.ano_modelo || null, km: t.km || null, valor_fipe: t.valor_fipe,
    valor_avaliacao: n(t.valor_avaliacao), selo: t.selo,
  }))), [trocas]);

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-4">
      {valores.id && <input type="hidden" name="id" value={valores.id} />}
      <input type="hidden" name="pagamentos" value={pagamentosJson} />
      <input type="hidden" name="trocas" value={trocasJson} />

      <Card>
        <CardHeader><CardTitle>Carro e cliente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <Campo id="veiculo_id" rotulo="Carro" erro={e.veiculo_id} obrigatorio>
            <Select id="veiculo_id" name="veiculo_id" value={veiculoId} onChange={(ev) => trocarCarro(ev.target.value)}>
              <option value="">Escolha o carro…</option>
              {carros.map((c) => <option key={c.id} value={c.id}>{nomeCarro(c)}{c.preco_anunciado ? ` · ${formatarMoeda(c.preco_anunciado)}` : ""}{c.status === "reservado" ? " (reservado)" : ""}</option>)}
            </Select>
          </Campo>
          {!clienteNovo ? (
            <Campo id="cliente_id" rotulo="Cliente" erro={e.cliente_id} obrigatorio>
              <div className="flex gap-2">
                <Select id="cliente_id" name="cliente_id" defaultValue={valores.cliente_id ?? ""} className="flex-1">
                  <option value="">Escolha o cliente…</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setClienteNovo(true)} aria-label="Cliente novo"><UserPlus /></Button>
              </div>
            </Campo>
          ) : (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-2">
              <Campo id="novo_cliente_nome" rotulo="Nome do cliente novo" erro={e.cliente_id} obrigatorio>
                <Input id="novo_cliente_nome" name="novo_cliente_nome" autoComplete="off" />
              </Campo>
              <Campo id="novo_cliente_telefone" rotulo="WhatsApp" obrigatorio>
                <InputTelefone id="novo_cliente_telefone" name="novo_cliente_telefone" />
              </Campo>
              {clientes.length > 0 && <button type="button" className="text-left text-xs text-primary hover:underline sm:col-span-2" onClick={() => setClienteNovo(false)}>Escolher um cliente já cadastrado</button>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Valores</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Preço anunciado: <strong className="numero text-foreground">{formatarMoeda(preco || null)}</strong></span>
            {carro?.preco_negociavel ? <span className="text-muted-foreground">Valor negociável: <strong className="numero text-foreground">{formatarMoeda(carro.preco_negociavel)}</strong></span> : null}
          </div>
          <Campo id="valor_final" rotulo="Valor do orçamento" erro={e.valor_final} obrigatorio>
            <InputMoeda id="valor_final" name="valor_final" defaultValue={valorFinal} key={veiculoId} onValorChange={setValorFinal} />
          </Campo>
          <Campo id="valor_entrada" rotulo="Entrada">
            <InputMoeda id="valor_entrada" name="valor_entrada" defaultValue={entrada} onValorChange={setEntrada} />
          </Campo>
          {desconto > 0 && (
            <div className="sm:col-span-2" aria-live="polite">
              <p className="text-sm">Desconto: <strong className="numero">{formatarMoeda(desconto)}</strong>{preco ? ` (${((desconto / preco) * 100).toFixed(1).replace(".", ",")}%)` : ""}</p>
              {avaliacao === "dentro" && <p className="flex items-center gap-1.5 text-sm text-success"><ShieldCheck className="size-4" /> Dentro do seu limite</p>}
              {avaliacao === "fora" && (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-warning-foreground dark:text-warning"><ShieldAlert className="size-4" /> Fora do seu limite: precisa de aprovação do gerente ou do dono</p>
                  <Campo id="desconto_motivo" rotulo="Motivo do desconto" erro={e.desconto_motivo} obrigatorio>
                    <Textarea id="desconto_motivo" name="desconto_motivo" rows={2} defaultValue={valores.desconto_motivo ?? ""} placeholder="Ex.: cliente fecha hoje à vista" />
                  </Campo>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Formas de pagamento</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => setPagamentos((p) => [...p, { forma: "pix", valor: falta > 0 ? formatarNumeroMoeda(falta) : "", banco_financiamento: "", parcelas: "" }])}><Plus /> Forma</Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pagamentos.length === 0 && <p className="text-sm text-muted-foreground">À vista, Pix, financiamento, cartão… (a troca vai logo abaixo)</p>}
          {pagamentos.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-4">
              <Select aria-label="Forma" value={p.forma} onChange={(ev) => setPagamentos((ps) => ps.map((x, j) => j === i ? { ...x, forma: ev.target.value } : x))}>
                {Object.entries(FORMA_VENDA).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </Select>
              <InputMoeda aria-label="Valor" defaultValue={p.valor} onValorChange={(v) => setPagamentos((ps) => ps.map((x, j) => j === i ? { ...x, valor: v } : x))} />
              {p.forma === "financiamento" && (
                <>
                  <Select aria-label="Banco" value={p.banco_financiamento} onChange={(ev) => setPagamentos((ps) => ps.map((x, j) => j === i ? { ...x, banco_financiamento: ev.target.value } : x))}>
                    <option value="">Banco…</option>
                    {BANCOS_FINANCIAMENTO.map((b) => <option key={b} value={b}>{b}</option>)}
                  </Select>
                  <Input aria-label="Parcelas" type="number" min={1} max={120} inputMode="numeric" placeholder="Parcelas" value={p.parcelas}
                    onChange={(ev) => setPagamentos((ps) => ps.map((x, j) => j === i ? { ...x, parcelas: ev.target.value } : x))} />
                </>
              )}
              <Button type="button" variant="ghost" size="sm" className="col-span-2 justify-self-end sm:col-span-4" onClick={() => setPagamentos((ps) => ps.filter((_, j) => j !== i))}><Trash2 /> Remover</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Carro na troca</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => setTrocas((t) => [...t, trocaVazia()])}><Plus /> Troca</Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {trocas.length === 0 && <p className="text-sm text-muted-foreground">Sem carro na troca.</p>}
          {trocas.map((t, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-end gap-2">
                <Campo id={`troca-placa-${i}`} rotulo="Placa do carro de troca" className="flex-1">
                  <InputPlaca id={`troca-placa-${i}`} defaultValue={t.placa} onValorChange={(v) => setTrocas((ts) => ts.map((x, j) => j === i ? { ...x, placa: v.replace(/[^A-Z0-9]/gi, "").toUpperCase(), consulta_id: null, selo: null } : x))} />
                </Campo>
                {podeConsultar && (
                  <Button type="button" variant="outline" onClick={() => consultar(i)} disabled={consultando || t.placa.length < 7}>
                    {consultando ? <Loader2 className="animate-spin" /> : <Search />} Consultar
                  </Button>
                )}
              </div>
              {t.consulta_id && <SeloConsulta selo={t.selo} />}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Input aria-label="Marca da troca" placeholder="Marca" value={t.marca} onChange={(ev) => setTrocas((ts) => ts.map((x, j) => j === i ? { ...x, marca: ev.target.value } : x))} />
                <Input aria-label="Modelo da troca" placeholder="Modelo" value={t.modelo} onChange={(ev) => setTrocas((ts) => ts.map((x, j) => j === i ? { ...x, modelo: ev.target.value } : x))} />
                <Input aria-label="Ano da troca" placeholder="Ano modelo" inputMode="numeric" value={t.ano_modelo} onChange={(ev) => setTrocas((ts) => ts.map((x, j) => j === i ? { ...x, ano_modelo: ev.target.value } : x))} />
                <Input aria-label="Km da troca" placeholder="Km" inputMode="numeric" value={t.km} onChange={(ev) => setTrocas((ts) => ts.map((x, j) => j === i ? { ...x, km: ev.target.value } : x))} />
              </div>
              <Campo id={`troca-valor-${i}`} rotulo={`Valor avaliado${t.valor_fipe ? ` (FIPE ${formatarMoeda(t.valor_fipe)})` : ""}`} obrigatorio>
                <InputMoeda id={`troca-valor-${i}`} defaultValue={t.valor_avaliacao} onValorChange={(v) => setTrocas((ts) => ts.map((x, j) => j === i ? { ...x, valor_avaliacao: v } : x))} />
              </Campo>
              <Button type="button" variant="ghost" size="sm" className="self-end" onClick={() => setTrocas((ts) => ts.filter((_, j) => j !== i))}><Trash2 /> Remover troca</Button>
            </div>
          ))}
          <p className={cn("text-sm", Math.abs(falta) < 0.01 ? "text-success" : "text-muted-foreground")} aria-live="polite">
            Pagamentos + trocas: <strong className="numero">{formatarMoeda(somaPag + somaTrocas)}</strong> de {formatarMoeda(vf || null)}
            {Math.abs(falta) >= 0.01 && vf > 0 ? ` · ${falta > 0 ? `faltam ${formatarMoeda(falta)}` : `passou ${formatarMoeda(-falta)}`}` : ""}
          </p>
        </CardContent>
      </Card>

      {financiado > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Calculator className="size-4" /> Simulação de financiamento</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {taxas.length === 0 ? (
              <p className="text-sm text-muted-foreground">As taxas da simulação ainda não foram configuradas pelo dono (Configurações → Orçamentos).</p>
            ) : (
              <>
                <Campo id="simulacao_prazo" rotulo="Prazo">
                  <Select id="simulacao_prazo" name="simulacao_prazo" value={prazo} onChange={(ev) => setPrazo(ev.target.value)}>
                    {taxas.map((t) => <option key={t.prazo} value={t.prazo}>{t.prazo}x ({String(t.taxa_mensal).replace(".", ",")}% a.m.)</option>)}
                  </Select>
                </Campo>
                {sim && <p className="text-sm">Valor financiado {formatarMoeda(sim.valor_financiado)} em <strong className="numero">{sim.prazo}x de {formatarMoeda(sim.parcela)}</strong></p>}
                <Alerta variante="aviso">{AVISO_SIMULACAO}</Alerta>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Validade e observações</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <Campo id="validade" rotulo="Válido até" erro={e.validade} dica="Obrigatória para enviar ao cliente">
            <InputData id="validade" name="validade" defaultValue={valores.validade ?? null} />
          </Campo>
          <Campo id="observacoes" rotulo="Observações" erro={e.observacoes}>
            <Textarea id="observacoes" name="observacoes" rows={3} value={obs} onChange={(ev) => setObs(ev.target.value)} />
          </Campo>
          {proibidas.length > 0 && <p role="alert" className="text-xs text-destructive">Não use: {proibidas.map((p) => `"${p}"`).join(", ")}. A consulta de placa e o laudo não garantem o carro.</p>}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Os alertas do carro (consulta da placa, histórico, repinturas, laudo) entram no orçamento automaticamente e não podem ser removidos.</p>
      <Button type="submit" size="lg" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Salvar orçamento</Button>
    </form>
  );
}

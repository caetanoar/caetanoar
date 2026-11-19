"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { salvarVeiculo } from "./acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputMoeda, InputPlaca, InputData } from "@/components/form/inputs";
import { FipeBusca, type ResultadoFipe } from "@/components/estoque/fipe-busca";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { COMBUSTIVEIS, CAMBIOS } from "@/lib/format/veiculo";
import { RESULTADO_LAUDO, RECEBIMENTO_CONSIGNADO } from "@/lib/estoque/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { hojeISO } from "@/lib/format/data";
import { cn } from "@/lib/utils";

type Valores = Record<string, string | number | boolean | null | undefined>;
type Opcao = { id: string; nome: string };

function SegTipo({ valor, onChange, bloqueado }: { valor: string; onChange: (v: string) => void; bloqueado: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo do carro">
      {[
        { v: "proprio", t: "Próprio", d: "Carro da loja" },
        { v: "consignado", t: "Consignado", d: "Carro de terceiro, por comissão" },
      ].map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={valor === o.v}
          disabled={bloqueado && valor !== o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-xl border p-3 text-left transition-colors disabled:opacity-40",
            valor === o.v ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-secondary",
          )}
        >
          <span className="block font-medium">{o.t}</span>
          <span className="block text-xs text-muted-foreground">{o.d}</span>
        </button>
      ))}
    </div>
  );
}

/** Extrai versão, motor e câmbio do nome do modelo da FIPE (o usuário pode ajustar). */
function interpretarModeloFipe(modeloFipe: string) {
  const partes = modeloFipe.trim().split(/\s+/);
  const modelo = partes[0] ?? "";
  const resto = partes.slice(1).join(" ");
  const motorNum = /\b(\d\.\d)\b/.exec(resto)?.[1];
  const sufixoMotor = /\b(TSI|TGDI|Turbo|TB|TFSI|THP|GTDI|EcoBoost|Firefly|GSE)\b/i.exec(resto)?.[1];
  const cambio = /\bAut\.?|Automático|CVT\b/i.test(resto) ? (/CVT/i.test(resto) ? "cvt" : "automatico") : /\bMec\.?\b/i.test(resto) ? "manual" : "";
  return { modelo, versao: resto, motor: motorNum ? [motorNum, sufixoMotor].filter(Boolean).join(" ") : "", cambio };
}

export function FormVeiculo({
  valores = {},
  fornecedores,
  consignantes,
  eDono,
}: {
  valores?: Valores;
  fornecedores: Opcao[];
  consignantes: Opcao[];
  eDono?: boolean;
}) {
  const router = useRouter();
  const editando = Boolean(valores.id);
  const [tipo, setTipo] = useState(String(valores.tipo ?? "proprio"));
  const [laudo, setLaudo] = useState(valores.laudo_cautelar ? "true" : "false");
  const [fipe, setFipe] = useState({
    marca: String(valores.marca ?? ""),
    modelo: String(valores.modelo ?? ""),
    versao: String(valores.versao ?? ""),
    motor: String(valores.motor ?? ""),
    ano_modelo: valores.ano_modelo ? String(valores.ano_modelo) : "",
    combustivel: String(valores.combustivel ?? ""),
    cambio: String(valores.cambio ?? ""),
    codigo_fipe: String(valores.codigo_fipe ?? ""),
    valor_fipe: valores.valor_fipe as number | null | undefined,
    fipe_referencia: String(valores.fipe_referencia ?? ""),
    chave: 0,
  });
  const [estado, despachar, pendente] = useAcao(salvarVeiculo, {
    onSucesso: (e) => e.dados?.id && router.push(`/estoque/${e.dados.id}`),
  });
  const e = estado.erros ?? {};
  const v = (k: string) => (valores[k] === null || valores[k] === undefined ? "" : String(valores[k]));

  function aplicarFipe(r: ResultadoFipe) {
    const m = interpretarModeloFipe(r.modelo);
    setFipe((f) => ({
      marca: r.marcaNormalizada,
      modelo: m.modelo,
      versao: m.versao,
      motor: m.motor || f.motor,
      ano_modelo: String(r.anoModelo),
      combustivel: r.combustivelNormalizado ?? f.combustivel,
      cambio: m.cambio || f.cambio,
      codigo_fipe: r.codigoFipe,
      valor_fipe: r.valor,
      fipe_referencia: r.mesReferencia,
      chave: f.chave + 1,
    }));
  }

  const campoFipe = (k: keyof typeof fipe) => ({
    value: String(fipe[k] ?? ""),
    onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFipe((f) => ({ ...f, [k]: ev.target.value })),
  });

  return (
    <form onSubmit={despachar} className="flex flex-col gap-4">
      {editando && <input type="hidden" name="id" value={v("id")} />}
      <input type="hidden" name="tipo" value={tipo} />
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}

      <Card>
        <CardHeader><CardTitle>Tipo</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <SegTipo valor={tipo} onChange={setTipo} bloqueado={editando} />
          <div className="grid gap-4 sm:grid-cols-2">
            {tipo === "proprio" ? (
              <Campo id="origem" rotulo="Origem" erro={e.origem}>
                <Select name="origem" defaultValue={v("origem") || "compra"}>
                  <option value="compra">Compra (locadora, lojista, particular)</option>
                  <option value="troca">Troca (recebido em venda)</option>
                </Select>
              </Campo>
            ) : (
              <input type="hidden" name="origem" value="consignacao" />
            )}
            {!editando ? (
              <Campo id="status" rotulo="Situação inicial" erro={e.status}>
                <Select name="status" defaultValue={tipo === "proprio" ? "em_preparacao" : "disponivel"} key={tipo}>
                  {tipo === "proprio" && <option value="em_preparacao">Em preparação</option>}
                  <option value="disponivel">Disponível para venda</option>
                </Select>
              </Campo>
            ) : (
              <input type="hidden" name="status" value={v("status")} />
            )}
            <Campo id="data_entrada" rotulo="Data de entrada" erro={e.data_entrada}>
              <InputData name="data_entrada" defaultValue={v("data_entrada") || hojeISO()} />
            </Campo>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Veículo</CardTitle>
          <FipeBusca onSelecionar={aplicarFipe} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Campo id="marca" rotulo="Marca" erro={e.marca} obrigatorio>
            <Input name="marca" {...campoFipe("marca")} autoComplete="off" />
          </Campo>
          <Campo id="modelo" rotulo="Modelo" erro={e.modelo} obrigatorio>
            <Input name="modelo" {...campoFipe("modelo")} autoComplete="off" />
          </Campo>
          <Campo id="versao" rotulo="Versão" erro={e.versao} className="col-span-2">
            <Input name="versao" {...campoFipe("versao")} placeholder="Ex.: 200 TSI Comfortline" />
          </Campo>
          <Campo id="motor" rotulo="Motor" erro={e.motor}>
            <Input name="motor" {...campoFipe("motor")} placeholder="Ex.: 1.0 TSI" />
          </Campo>
          <Campo id="cor" rotulo="Cor" erro={e.cor}>
            <Input name="cor" defaultValue={v("cor")} />
          </Campo>
          <Campo id="ano_fabricacao" rotulo="Ano fabricação" erro={e.ano_fabricacao}>
            <Input name="ano_fabricacao" inputMode="numeric" maxLength={4} defaultValue={v("ano_fabricacao")} />
          </Campo>
          <Campo id="ano_modelo" rotulo="Ano modelo" erro={e.ano_modelo}>
            <Input name="ano_modelo" inputMode="numeric" maxLength={4} {...campoFipe("ano_modelo")} />
          </Campo>
          <Campo id="km" rotulo="Km" erro={e.km}>
            <Input name="km" inputMode="numeric" defaultValue={v("km")} placeholder="Ex.: 40000" />
          </Campo>
          <Campo id="portas" rotulo="Portas" erro={e.portas}>
            <Input name="portas" inputMode="numeric" maxLength={1} defaultValue={v("portas")} />
          </Campo>
          <Campo id="combustivel" rotulo="Combustível" erro={e.combustivel}>
            <Select name="combustivel" {...campoFipe("combustivel")}>
              <option value="">Não informado</option>
              {Object.entries(COMBUSTIVEIS).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </Campo>
          <Campo id="cambio" rotulo="Câmbio" erro={e.cambio}>
            <Select name="cambio" {...campoFipe("cambio")}>
              <option value="">Não informado</option>
              {Object.entries(CAMBIOS).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documentação</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Campo id="placa" rotulo="Placa" erro={e.placa}>
            <InputPlaca name="placa" defaultValue={v("placa")} />
          </Campo>
          <Campo id="chassi" rotulo="Chassi" erro={e.chassi}>
            <Input name="chassi" defaultValue={v("chassi")} maxLength={17} autoCapitalize="characters" className="uppercase" />
          </Campo>
          <Campo id="renavam" rotulo="RENAVAM" erro={e.renavam}>
            <Input name="renavam" defaultValue={v("renavam")} inputMode="numeric" maxLength={11} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preços</CardTitle>
          <CardDescription>O vendedor vê o anunciado e o negociável. O preço mínimo fica só com dono e gerente.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Campo id="preco_anunciado" rotulo="Preço anunciado" erro={e.preco_anunciado}>
            <InputMoeda name="preco_anunciado" defaultValue={valores.preco_anunciado as number | null} />
          </Campo>
          <Campo id="preco_negociavel" rotulo="Valor negociável" erro={e.preco_negociavel} dica="Até onde o vendedor pode baixar">
            <InputMoeda name="preco_negociavel" defaultValue={valores.preco_negociavel as number | null} />
          </Campo>
          <Campo id="preco_minimo" rotulo={<span className="flex items-center gap-1"><Lock className="size-3" /> Preço mínimo</span>} erro={e.preco_minimo} dica="Sigiloso">
            <InputMoeda name="preco_minimo" defaultValue={valores.preco_minimo as number | null} />
          </Campo>
          <div className="rounded-lg border bg-muted/40 p-3 sm:col-span-3">
            <p className="text-xs text-muted-foreground">Valor FIPE {fipe.fipe_referencia && `· ${fipe.fipe_referencia}`}</p>
            <p className="numero font-semibold">{formatarMoeda(fipe.valor_fipe ?? null)}</p>
            {fipe.codigo_fipe && <p className="text-xs text-muted-foreground">Código {fipe.codigo_fipe}</p>}
            <input type="hidden" name="codigo_fipe" value={fipe.codigo_fipe} />
            <input type="hidden" name="valor_fipe" value={fipe.valor_fipe ?? ""} />
            <input type="hidden" name="fipe_referencia" value={fipe.fipe_referencia} />
          </div>
        </CardContent>
      </Card>

      {tipo === "proprio" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Lock className="size-4" /> Compra</CardTitle>
            <CardDescription>Sigiloso: só dono e gerente veem.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Campo id="valor_compra" rotulo="Valor de compra" erro={e.valor_compra}>
              <InputMoeda name="valor_compra" defaultValue={valores.valor_compra as number | null} />
            </Campo>
            <Campo id="data_compra" rotulo="Data da compra" erro={e.data_compra}>
              <InputData name="data_compra" defaultValue={v("data_compra")} />
            </Campo>
            <Campo id="fornecedor_id" rotulo="Fornecedor" erro={e.fornecedor_id} className="sm:col-span-2"
              dica={<Link href="/fornecedores/novo" className="text-primary hover:underline" target="_blank">Cadastrar novo fornecedor</Link>}>
              <Select name="fornecedor_id" defaultValue={v("fornecedor_id")}>
                <option value="">Não informado</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </Select>
            </Campo>
            <Campo id="observacoes_internas" rotulo="Observações internas" erro={e.observacoes_internas} className="sm:col-span-2">
              <Textarea name="observacoes_internas" defaultValue={v("observacoes_internas")} rows={2} />
            </Campo>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Lock className="size-4" /> Consignação</CardTitle>
            <CardDescription>Sigiloso: só dono e gerente veem. O contrato em PDF é anexado na tela do carro.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Campo id="consignante_id" rotulo="Consignante (dono do carro)" erro={e.consignante_id} obrigatorio className="sm:col-span-2"
              dica={<Link href="/consignantes/novo" className="text-primary hover:underline" target="_blank">Cadastrar novo consignante</Link>}>
              <Select name="consignante_id" defaultValue={v("consignante_id")}>
                <option value="">Escolha…</option>
                {consignantes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </Campo>
            <Campo id="valor_minimo_dono" rotulo="Valor mínimo aceito pelo dono" erro={e.valor_minimo_dono}>
              <InputMoeda name="valor_minimo_dono" defaultValue={valores.valor_minimo_dono as number | null} />
            </Campo>
            <Campo id="recebimento_padrao" rotulo="Recebimento na venda" erro={e.recebimento_padrao} dica="Pode mudar na hora da venda">
              <Select name="recebimento_padrao" defaultValue={v("recebimento_padrao")}>
                <option value="">Padrão da loja</option>
                {Object.entries(RECEBIMENTO_CONSIGNADO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </Select>
            </Campo>
            <Campo id="consignacao_inicio" rotulo="Início do contrato" erro={e.consignacao_inicio}>
              <InputData name="consignacao_inicio" defaultValue={v("consignacao_inicio") || hojeISO()} />
            </Campo>
            <Campo id="consignacao_fim" rotulo="Fim do contrato (prazo)" erro={e.consignacao_fim}>
              <InputData name="consignacao_fim" defaultValue={v("consignacao_fim")} />
            </Campo>
            <Campo id="consignacao_observacoes" rotulo="Observações do contrato" erro={e.consignacao_observacoes} className="sm:col-span-2">
              <Textarea name="consignacao_observacoes" defaultValue={v("consignacao_observacoes")} rows={2} />
            </Campo>
            {eDono && <p className="text-xs text-muted-foreground sm:col-span-2">A regra de comissão da consignação é escolhida em Regras de comissão.</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Laudo e descrição</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="laudo_cautelar" rotulo="Laudo cautelar" erro={e.laudo_cautelar}>
            <Select name="laudo_cautelar" value={laudo} onChange={(ev) => setLaudo(ev.target.value)}>
              <option value="false">Não tem laudo</option>
              <option value="true">Tem laudo cautelar</option>
            </Select>
          </Campo>
          {laudo === "true" ? (
            <Campo id="laudo_resultado" rotulo="Resultado do laudo" erro={e.laudo_resultado}>
              <Select name="laudo_resultado" defaultValue={v("laudo_resultado")}>
                <option value="">Não informado</option>
                {Object.entries(RESULTADO_LAUDO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </Select>
            </Campo>
          ) : (
            <input type="hidden" name="laudo_resultado" value="" />
          )}
          <Campo id="descricao" rotulo="Descrição para anúncio" erro={e.descricao} className="sm:col-span-2"
            dica="Só o que é verdade e comprovado. A IA usa este texto e os itens confirmados.">
            <Textarea name="descricao" defaultValue={v("descricao")} rows={3} />
          </Campo>
          <Campo id="observacoes" rotulo="Observações para a equipe" erro={e.observacoes} className="sm:col-span-2" dica="Vendedores também veem">
            <Textarea name="observacoes" defaultValue={v("observacoes")} rows={2} />
          </Campo>
        </CardContent>
      </Card>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex gap-2 rounded-xl border bg-card/95 p-2 shadow-lg backdrop-blur sm:justify-end lg:bottom-4">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={pendente} className="flex-1 sm:flex-none">
          {pendente && <Loader2 className="animate-spin" />} {editando ? "Salvar alterações" : "Cadastrar veículo"}
        </Button>
      </div>
    </form>
  );
}

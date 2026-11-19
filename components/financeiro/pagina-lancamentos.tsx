import Link from "next/link";
import { Plus, ListOrdered } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { InputData } from "@/components/form/inputs";
import { ListaLancamentos } from "./lista-lancamentos";
import { STATUS_LANCAMENTO } from "@/lib/financeiro/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { hojeISO, inicioDoMes, fimDoMes } from "@/lib/format/data";
import type { Database } from "@/lib/supabase/database.types";

export type FiltrosLancamentos = {
  de?: string;
  ate?: string;
  tipo?: string;
  status?: string;
  conta?: string;
  categoria?: string;
  veiculo?: string;
  vencidos?: string;
};

type Status = Database["public"]["Enums"]["status_lancamento"];

/** Lista de lançamentos com filtros (usada em Lançamentos, A pagar e A receber). */
export async function PaginaLancamentos({
  titulo,
  f,
  fixo,
}: {
  titulo: string;
  f: FiltrosLancamentos;
  fixo?: { tipo: "receita" | "despesa"; pendentes: true };
}) {
  const supabase = await criarClienteServidor();
  const pendentes = !!fixo;
  const de = f.de ?? (pendentes ? undefined : inicioDoMes());
  const ate = f.ate ?? (pendentes ? undefined : fimDoMes());
  const campoData = pendentes || f.status !== "pago" ? "data_vencimento" : "data_pagamento";

  let q = supabase.from("v_lancamentos").select("*").order(campoData, { ascending: pendentes }).limit(500);
  if (fixo) q = q.eq("tipo", fixo.tipo).eq("status", "pendente");
  else {
    if (f.tipo === "receita" || f.tipo === "despesa") q = q.eq("tipo", f.tipo);
    else if (f.tipo === "transferencia") q = q.in("tipo", ["transferencia_entrada", "transferencia_saida"]);
    if (f.status && f.status in STATUS_LANCAMENTO) q = q.eq("status", f.status as Status);
    else q = q.neq("status", "cancelado");
  }
  if (de) q = q.gte(campoData, de);
  if (ate) q = q.lte(campoData, ate);
  if (f.conta) q = q.eq("conta_id", f.conta);
  if (f.categoria) q = q.eq("categoria_id", f.categoria);
  if (f.veiculo) q = q.eq("veiculo_id", f.veiculo);
  if (f.vencidos) q = q.eq("vencido", true);

  const [{ data }, { data: contas }, { data: categorias }] = await Promise.all([
    q,
    supabase.from("contas_financeiras").select("id, nome").eq("ativa", true).order("nome"),
    supabase.from("categorias_financeiras").select("id, nome, tipo").eq("ativa", true).order("nome"),
  ]);
  const itens = data ?? [];
  const entradas = itens.filter((l) => l.tipo === "receita" || l.tipo === "transferencia_entrada").reduce((s, l) => s + Number(l.valor), 0);
  const saidas = itens.filter((l) => l.tipo === "despesa" || l.tipo === "transferencia_saida").reduce((s, l) => s + Number(l.valor), 0);
  const vencidos = itens.filter((l) => l.vencido).reduce((s, l) => s + Number(l.valor), 0);

  return (
    <>
      <Cabecalho
        titulo={titulo}
        subtitulo={`${itens.length} lançamento(s)`}
        voltar="/financeiro"
        acoes={<Button asChild size="sm"><Link href={`/financeiro/lancamentos/novo${fixo ? `?tipo=${fixo.tipo}` : ""}`}><Plus /> Lançar</Link></Button>}
      />
      <Conteudo className="flex flex-col gap-3">
        <form className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <InputData name="de" defaultValue={de} aria-label="De" placeholder="De dd/mm/aaaa" />
          <InputData name="ate" defaultValue={ate} aria-label="Até" placeholder="Até dd/mm/aaaa" />
          {!fixo && (
            <>
              <Select name="tipo" defaultValue={f.tipo ?? ""} aria-label="Tipo">
                <option value="">Receitas e despesas</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
                <option value="transferencia">Transferências</option>
              </Select>
              <Select name="status" defaultValue={f.status ?? ""} aria-label="Situação">
                <option value="">Pendentes e pagos</option>
                <option value="pendente">Pendentes</option>
                <option value="pago">Pagos</option>
                <option value="cancelado">Cancelados</option>
              </Select>
            </>
          )}
          <Select name="conta" defaultValue={f.conta ?? ""} aria-label="Conta">
            <option value="">Todas as contas</option>
            {(contas ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select name="categoria" defaultValue={f.categoria ?? ""} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {(categorias ?? []).filter((c) => !fixo || c.tipo === fixo.tipo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Button type="submit" variant="outline" className="col-span-2 md:col-span-6 md:justify-self-end">Filtrar</Button>
        </form>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border bg-card p-2">
            <p className="text-[11px] text-muted-foreground">Entradas</p>
            <p className="numero text-sm font-semibold text-success">{formatarMoeda(entradas)}</p>
          </div>
          <div className="rounded-lg border bg-card p-2">
            <p className="text-[11px] text-muted-foreground">Saídas</p>
            <p className="numero text-sm font-semibold">{formatarMoeda(saidas)}</p>
          </div>
          <div className="rounded-lg border bg-card p-2">
            <p className="text-[11px] text-muted-foreground">{fixo ? "Vencido" : "Resultado"}</p>
            <p className={`numero text-sm font-semibold ${fixo && vencidos > 0 ? "text-destructive" : ""}`}>{formatarMoeda(fixo ? vencidos : entradas - saidas)}</p>
          </div>
        </div>

        {itens.length === 0 ? (
          <Vazio icone={ListOrdered} titulo="Nenhum lançamento no filtro" />
        ) : (
          <ListaLancamentos itens={itens} contas={contas ?? []} />
        )}
        {!fixo && <p className="text-xs text-muted-foreground">Período considerado pelo {campoData === "data_pagamento" ? "pagamento" : "vencimento"}. Hoje: {hojeISO().split("-").reverse().join("/")}.</p>}
      </Conteudo>
    </>
  );
}

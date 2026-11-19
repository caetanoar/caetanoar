import Link from "next/link";
import { Plus, Handshake, ChevronRight } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Chips } from "@/components/cadastros/busca";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { InputData } from "@/components/form/inputs";
import { STATUS_VENDA } from "@/lib/vendas/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, inicioDoMes, fimDoMes } from "@/lib/format/data";
import type { Database } from "@/lib/supabase/database.types";

type StatusVenda = Database["public"]["Enums"]["status_venda"];

export default async function Vendas({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; vendedor?: string; tipo?: string; status?: string }>;
}) {
  const usuario = await exigirPermissao("vendas");
  const gestor = usuario.papel !== "vendedor";
  const f = await searchParams;
  const de = f.de ?? inicioDoMes();
  const ate = f.ate ?? fimDoMes();
  const supabase = await criarClienteServidor();

  let q = supabase.from("v_vendas").select("*").gte("data_venda", de).lte("data_venda", ate).order("data_venda", { ascending: false }).order("criado_em", { ascending: false });
  if (f.vendedor) q = q.eq("vendedor_id", f.vendedor);
  if (f.tipo === "proprio" || f.tipo === "consignado") q = q.eq("tipo_veiculo", f.tipo);
  if (f.status && f.status in STATUS_VENDA) q = q.eq("status", f.status as StatusVenda);

  const [{ data }, { data: pendentes }, { data: vendedores }] = await Promise.all([
    q,
    supabase.from("v_vendas").select("id, numero, veiculo_nome, cliente_nome, valor_venda, vendedor_nome").eq("status", "aguardando_aprovacao").order("criado_em"),
    gestor ? supabase.rpc("listar_vendedores") : Promise.resolve({ data: [] }),
  ]);
  const vendas = data ?? [];
  const fechadas = vendas.filter((v) => v.status === "fechada");
  const total = fechadas.reduce((s, v) => s + Number(v.valor_venda), 0);
  let lucro: number | null = null;
  if (gestor && fechadas.length) {
    const { data: l } = await supabase.from("v_lucro_vendas_calc").select("lucro").in("venda_id", fechadas.map((v) => v.id!));
    lucro = (l ?? []).reduce((s, x) => s + Number(x.lucro), 0);
  }

  return (
    <>
      <Cabecalho
        titulo={gestor ? "Vendas" : "Minhas vendas"}
        acoes={<Button asChild size="sm"><Link href="/vendas/nova"><Plus /> Registrar</Link></Button>}
      />
      <Conteudo className="flex flex-col gap-3">
        {(pendentes ?? []).length > 0 && (
          <Card className="border-warning/50 bg-warning/10 p-3">
            <p className="mb-2 text-sm font-medium">{gestor ? "Aguardando sua aprovação" : "Aguardando aprovação do gerente"}</p>
            <ul className="flex flex-col gap-1.5">
              {(pendentes ?? []).map((p) => (
                <li key={p.id}>
                  <Link href={`/vendas/${p.id}`} className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{p.numero} · {p.veiculo_nome} · {p.cliente_nome}{gestor && ` · ${p.vendedor_nome}`}</span>
                    <span className="numero font-semibold">{formatarMoeda(p.valor_venda)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <form className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <InputData name="de" defaultValue={de} aria-label="De" />
          <InputData name="ate" defaultValue={ate} aria-label="Até" />
          {gestor && (
            <Select name="vendedor" defaultValue={f.vendedor ?? ""} aria-label="Vendedor">
              <option value="">Todos os vendedores</option>
              {(vendedores ?? []).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </Select>
          )}
          <Select name="status" defaultValue={f.status ?? ""} aria-label="Situação">
            <option value="">Todas as situações</option>
            {Object.entries(STATUS_VENDA).map(([k, s]) => <option key={k} value={k}>{s.rotulo}</option>)}
          </Select>
          <input type="hidden" name="tipo" value={f.tipo ?? ""} />
          <Button type="submit" variant="outline">Filtrar</Button>
        </form>
        <Chips parametro="tipo" todos="Todos os carros" opcoes={[{ valor: "proprio", rotulo: "Próprios" }, { valor: "consignado", rotulo: "Consignados" }]} />

        <div className={`grid gap-2 text-center ${lucro !== null ? "grid-cols-3" : "grid-cols-2"}`}>
          <div className="rounded-lg border bg-card p-2">
            <p className="text-[11px] text-muted-foreground">Vendas fechadas</p>
            <p className="text-lg font-semibold">{fechadas.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-2">
            <p className="text-[11px] text-muted-foreground">Valor vendido</p>
            <p className="numero text-sm font-semibold">{formatarMoeda(total)}</p>
          </div>
          {lucro !== null && (
            <div className="rounded-lg border bg-card p-2">
              <p className="text-[11px] text-muted-foreground">Lucro</p>
              <p className="numero text-sm font-semibold text-success">{formatarMoeda(lucro)}</p>
            </div>
          )}
        </div>

        {vendas.length === 0 ? (
          <Vazio icone={Handshake} titulo="Nenhuma venda no período" />
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {vendas.map((v) => {
              const st = STATUS_VENDA[v.status!];
              return (
                <Link key={v.id} href={`/vendas/${v.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.veiculo_nome}</p>
                    <p className="truncate text-sm text-muted-foreground">{v.cliente_nome} · {formatarData(v.data_venda)}{gestor && v.vendedor_nome ? ` · ${v.vendedor_nome}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{v.numero} · {v.formas}{v.qtd_trocas ? " · com troca" : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="numero text-sm font-semibold">{formatarMoeda(v.valor_venda)}</span>
                    <Badge variant={st.variante}>{st.rotulo}</Badge>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

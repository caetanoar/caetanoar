import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { TIPO_CUSTO } from "@/lib/estoque/rotulos";

/** Veículos comprados e serviços prestados por este fornecedor. */
export async function HistoricoFornecedor({ id }: { id: string }) {
  const supabase = await criarClienteServidor();
  const [{ data: compras }, { data: servicos }] = await Promise.all([
    supabase.from("v_veiculos_gestao").select("id, marca, modelo, placa, valor_compra, data_compra, data_entrada, status").eq("fornecedor_id", id).order("data_entrada", { ascending: false }),
    supabase.from("custos_veiculo").select("id, tipo, descricao, valor, data, veiculo_id, veiculos(marca, modelo)").eq("fornecedor_id", id).order("data", { ascending: false }).limit(100),
  ]);
  const totalCompras = (compras ?? []).reduce((s, c) => s + Number(c.valor_compra ?? 0), 0);
  const totalServicos = (servicos ?? []).reduce((s, c) => s + Number(c.valor), 0);
  if (!compras?.length && !servicos?.length) return <p className="text-sm text-muted-foreground">Nenhuma compra ou serviço registrado ainda.</p>;
  return (
    <div className="flex flex-col gap-4">
      {(compras ?? []).length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Veículos comprados ({compras!.length}) · {formatarMoeda(totalCompras)}</p>
          <ul className="flex flex-col gap-1.5">
            {compras!.map((c) => (
              <li key={c.id}>
                <Link href={`/estoque/${c.id}`} className="flex justify-between rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
                  <span>{c.marca} {c.modelo} {c.placa ?? ""} · {formatarData(c.data_compra ?? c.data_entrada)}</span>
                  <span className="numero">{formatarMoeda(c.valor_compra)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(servicos ?? []).length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Serviços ({servicos!.length}) · {formatarMoeda(totalServicos)}</p>
          <ul className="flex flex-col gap-1.5">
            {servicos!.map((s) => (
              <li key={s.id}>
                <Link href={`/estoque/${s.veiculo_id}?aba=custos`} className="flex justify-between rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
                  <span className="min-w-0 truncate">{TIPO_CUSTO[s.tipo]}{s.descricao && ` — ${s.descricao}`} · {(s.veiculos as { marca: string; modelo: string } | null)?.modelo} · {formatarData(s.data)}</span>
                  <span className="numero">{formatarMoeda(s.valor)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

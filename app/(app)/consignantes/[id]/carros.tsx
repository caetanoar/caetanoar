import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";

/** Carros deixados por este consignante, com situação da consignação. */
export async function CarrosDoConsignante({ id }: { id: string }) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("consignacoes")
    .select("id, status, data_inicio, data_fim, valor_minimo_dono, veiculos(id, marca, modelo, versao, ano_modelo, preco_anunciado)")
    .eq("consignante_id", id)
    .order("criado_em", { ascending: false });
  if (!data?.length) return <p className="text-sm text-muted-foreground">Nenhum carro consignado ainda.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {data.map((c) => {
        const v = c.veiculos as { id: string; marca: string; modelo: string; versao: string | null; ano_modelo: number | null; preco_anunciado: number | null } | null;
        return (
          <li key={c.id}>
            <Link href={`/estoque/${v?.id}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
              <span className="min-w-0">
                <span className="block truncate font-medium">{v?.marca} {v?.modelo} {v?.versao ?? ""} {v?.ano_modelo ?? ""}</span>
                <span className="block text-xs text-muted-foreground">
                  Desde {formatarData(c.data_inicio)}{c.data_fim && ` até ${formatarData(c.data_fim)}`} · mínimo {formatarMoeda(c.valor_minimo_dono)}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="numero">{formatarMoeda(v?.preco_anunciado)}</span>
                <Badge variant={c.status === "vigente" ? "success" : "muted"}>{c.status === "vigente" ? "Em estoque" : c.status === "vendido" ? "Vendido" : "Devolvido"}</Badge>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

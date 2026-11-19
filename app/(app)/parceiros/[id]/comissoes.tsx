import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { STATUS_COMISSAO } from "@/lib/vendas/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";

/** Comissões de indicação deste parceiro. */
export async function ComissoesDoParceiro({ id }: { id: string }) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("comissoes").select("id, valor, status, data_prevista, venda_id, vendas(numero, data_venda)").eq("parceiro_id", id).order("criado_em", { ascending: false });
  if (!data?.length) return <p className="text-sm text-muted-foreground">Nenhuma comissão registrada ainda.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {data.map((c) => (
        <li key={c.id}>
          <Link href={`/vendas/${c.venda_id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
            <span>Venda {(c.vendas as { numero: string } | null)?.numero} · {formatarData((c.vendas as { data_venda: string } | null)?.data_venda)}</span>
            <span className="flex items-center gap-2"><span className="numero">{formatarMoeda(c.valor)}</span><Badge variant={STATUS_COMISSAO[c.status].variante}>{STATUS_COMISSAO[c.status].rotulo}</Badge></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import { FileCheck2, ClipboardCheck } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { vendasParaDocumentar } from "@/lib/documentacao/consultas";
import { formatarPlaca } from "@/lib/format/veiculo";
import { formatarData } from "@/lib/format/data";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AbasLink } from "@/components/app/abas";

export const metadata = { title: "Documentação" };

export default async function Documentacao({ searchParams }: PageProps<"/documentacao">) {
  await exigirPermissao("documentacao");
  const { ver } = (await searchParams) as { ver?: string };
  const todas = await vendasParaDocumentar();
  const concluidas = ver === "concluidas";
  const lista = todas
    .filter((v) => (concluidas ? v.total > 0 && v.feitos === v.total : v.total === 0 || v.feitos < v.total))
    .sort((a, b) => b.atrasados - a.atrasados || (a.proximoPrazo ?? "9999").localeCompare(b.proximoPrazo ?? "9999"));
  const atrasadas = todas.filter((v) => v.atrasados > 0).length;
  return (
    <>
      <Cabecalho titulo="Documentação" subtitulo={atrasadas ? `${atrasadas} venda(s) com prazo vencido` : "Transferência das vendas fechadas"} />
      <Conteudo className="flex max-w-3xl flex-col gap-3">
        <AbasLink base="/documentacao" parametro="ver" atual={concluidas ? "concluidas" : "pendentes"} abas={[{ id: "pendentes", rotulo: "Pendentes" }, { id: "concluidas", rotulo: "Concluídas" }]} />
        {lista.length === 0 ? (
          <Vazio icone={FileCheck2} titulo={concluidas ? "Nenhuma documentação concluída" : "Nada pendente"}>
            Quando uma venda fecha, o checklist de transferência aparece aqui.
          </Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {lista.map((v) => (
              <Link key={v.id} href={`/documentacao/${v.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{v.veiculo_nome}{v.veiculo_placa ? ` · ${formatarPlaca(v.veiculo_placa)}` : ""}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.numero} · {v.cliente_nome} · vendido em {formatarData(v.data_venda)}
                    {v.proximoPrazo ? ` · próximo prazo ${formatarData(v.proximoPrazo)}` : ""}
                  </p>
                </div>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={v.total && v.feitos === v.total ? "success" : "warning"}><ClipboardCheck /> {v.feitos}/{v.total}</Badge>
                  {v.atrasados > 0 && <Badge variant="destructive">{v.atrasados} atrasado(s)</Badge>}
                </span>
              </Link>
            ))}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

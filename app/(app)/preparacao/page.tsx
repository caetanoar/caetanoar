import Link from "next/link";
import { Wrench, Camera, ClipboardCheck } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { carrosEmPreparacao } from "@/lib/preparacao/consultas";
import { nomeVeiculo } from "@/lib/estoque/rotulos";
import { formatarPlaca } from "@/lib/format/veiculo";
import { diasEntre } from "@/lib/format/data";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Preparação" };

export default async function Preparacao() {
  await exigirPermissao("preparacao");
  const carros = await carrosEmPreparacao();
  return (
    <>
      <Cabecalho titulo="Preparação" subtitulo={`${carros.length} carro(s) em preparação`} />
      <Conteudo className="flex max-w-3xl flex-col gap-3">
        {carros.length === 0 ? (
          <Vazio icone={Wrench} titulo="Nenhum carro em preparação">Quando um carro entra em preparação, ele aparece aqui com o checklist.</Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {carros.map((c) => {
              const dias = c.data_entrada ? diasEntre(c.data_entrada) : null;
              const completo = c.total > 0 && c.feitos === c.total;
              return (
                <Link key={c.id} href={`/preparacao/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{nomeVeiculo({ marca: c.marca!, modelo: c.modelo!, versao: c.versao })} {c.ano_modelo ?? ""}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {c.placa && <span>{formatarPlaca(c.placa)}</span>}
                      {dias !== null && <span>{dias} dia(s) na preparação</span>}
                      <span className="inline-flex items-center gap-1"><Camera className="size-3" /> {c.fotos}</span>
                    </p>
                  </div>
                  <Badge variant={completo ? "success" : c.total ? "warning" : "muted"} className="shrink-0">
                    <ClipboardCheck /> {c.total ? `${c.feitos}/${c.total}` : "sem checklist"}
                  </Badge>
                </Link>
              );
            })}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

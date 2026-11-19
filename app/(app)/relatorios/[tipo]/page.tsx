import { notFound } from "next/navigation";
import { FileSpreadsheet, FileDown, Info } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { gerarRelatorio, TIPOS_RELATORIO, type TipoRelatorio } from "@/lib/relatorios/definicoes";
import { atalhosPeriodo, formatarCelula, lerPeriodo } from "@/lib/relatorios/formato";
import { formatarData } from "@/lib/format/data";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Kpi } from "@/components/indicadores/kpi";
import { Button } from "@/components/ui/button";
import { FiltroPeriodo } from "@/components/relatorios/filtro-periodo";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/relatorios/[tipo]">) {
  const { tipo } = await params;
  return { title: TIPOS_RELATORIO[tipo as TipoRelatorio]?.titulo ?? "Relatório" };
}

export default async function RelatorioPagina({ params, searchParams }: PageProps<"/relatorios/[tipo]">) {
  await exigirPermissao("relatorios");
  const { tipo } = await params;
  if (!(tipo in TIPOS_RELATORIO)) notFound();
  const periodo = lerPeriodo(await searchParams);
  const rel = await gerarRelatorio(tipo as TipoRelatorio, periodo.de, periodo.ate);
  const base = `/relatorios/${tipo}`;
  const exportar = (formato: "csv" | "pdf") => `${base}/exportar?formato=${formato}&de=${periodo.de}&ate=${periodo.ate}`;

  return (
    <>
      <Cabecalho titulo={rel.titulo} subtitulo={`${formatarData(periodo.de)} a ${formatarData(periodo.ate)}`} voltar="/relatorios" />
      <Conteudo className="flex flex-col gap-4">
        <FiltroPeriodo base={base} de={periodo.de} ate={periodo.ate} atalhos={atalhosPeriodo()} />

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <a href={exportar("csv")} download><FileSpreadsheet /> Baixar CSV</a>
          </Button>
          <Button asChild variant="outline">
            <a href={exportar("pdf")} download><FileDown /> Baixar PDF</a>
          </Button>
        </div>

        <section aria-label="Resumo" className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {rel.resumo.map((r) => (
            <Kpi key={r.rotulo} rotulo={r.rotulo} valor={formatarCelula(r.tipo ?? "texto", r.valor)} />
          ))}
        </section>

        {rel.observacao && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" /> {rel.observacao}</p>
        )}

        {rel.linhas.length === 0 ? (
          <Vazio titulo="Nenhum registro no período">Escolha outro período acima.</Vazio>
        ) : (
          <section aria-label="Detalhamento" className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{rel.linhas.length} registro(s) · arraste a tabela para o lado para ver todas as colunas</p>
            <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-max border-separate border-spacing-0 rounded-lg border text-sm">
                <thead>
                  <tr>
                    {rel.colunas.map((c, i) => (
                      <th
                        key={c.chave}
                        scope="col"
                        className={cn(
                          "border-b bg-secondary px-3 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground",
                          c.tipo === "texto" ? "text-left" : "text-right",
                          i === 0 && "sticky left-0 z-10 rounded-tl-lg",
                        )}
                      >
                        {c.rotulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rel.linhas.map((l, li) => (
                    <tr key={li} className="even:bg-secondary/30">
                      {rel.colunas.map((c, i) => (
                        <td
                          key={c.chave}
                          className={cn(
                            "border-b px-3 py-2 whitespace-nowrap",
                            c.tipo === "texto" ? "text-left" : "numero text-right",
                            c.chave === "chave" && "font-mono text-xs",
                            i === 0 && "sticky left-0 bg-card font-medium",
                          )}
                        >
                          {formatarCelula(c.tipo, l[c.chave])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </Conteudo>
    </>
  );
}

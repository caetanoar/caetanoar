import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Coins, Car } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarVeiculoPublico, urlFoto } from "@/lib/estoque/consultas";
import { custosDaPreparacao } from "@/lib/preparacao/consultas";
import { nomeVeiculo, STATUS_VEICULO, TIPO_CUSTO } from "@/lib/estoque/rotulos";
import { formatarPlaca, formatarAno, formatarKm } from "@/lib/format/veiculo";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alerta } from "@/components/ui/misc";
import { ChecklistCard, TarefasDaEntidade } from "@/components/tarefas/blocos";
import { FotosPreparacao } from "@/components/preparacao/fotos";
import { FormCustoPreparacao } from "@/components/preparacao/form-custo";

export async function generateMetadata() {
  return { title: "Preparação do carro" };
}

export default async function PreparacaoCarro({ params }: PageProps<"/preparacao/[carro]">) {
  const usuario = await exigirPermissao("preparacao");
  const { carro: id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await carregarVeiculoPublico(id);
  if (!v) notFound();
  const supabase = await criarClienteServidor();
  const [{ data: fotos }, custos] = await Promise.all([
    supabase.from("arquivos").select("id, path").eq("entidade", "veiculo").eq("entidade_id", id).eq("categoria", "foto").order("ordem"),
    custosDaPreparacao(id),
  ]);
  const emPreparacao = v.status === "em_preparacao";
  const preparador = usuario.papel === "preparador";
  const total = custos.reduce((s, c) => s + Number(c.valor), 0);
  const st = STATUS_VEICULO[v.status!];

  return (
    <>
      <Cabecalho
        titulo={`${nomeVeiculo({ marca: v.marca!, modelo: v.modelo!, versao: v.versao })}`}
        subtitulo={[formatarAno(v.ano_fabricacao, v.ano_modelo), v.placa ? formatarPlaca(v.placa) : null, v.cor].filter(Boolean).join(" · ")}
        voltar="/preparacao"
      />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={st.variante}>{st.rotulo}</Badge>
          {v.km !== null && <span className="text-xs text-muted-foreground">{formatarKm(v.km)}</span>}
          {pode(usuario.papel, "estoque") && <Link href={`/estoque/${id}`} className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"><Car className="size-3.5" /> Ficha do carro</Link>}
        </div>
        {!emPreparacao && <Alerta variante="info">Este carro não está mais em preparação: o checklist, as fotos e os custos ficam só para consulta.</Alerta>}

        <ChecklistCard tipo="preparacao" veiculoId={id} podeMarcar={emPreparacao} voltar={`/preparacao/${id}`} />

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Camera className="size-4" /> Fotos</CardTitle></CardHeader>
          <CardContent>
            <FotosPreparacao veiculoId={id} fotos={(fotos ?? []).map((f) => ({ id: f.id, url: urlFoto(f.path)! }))} podeEnviar={emPreparacao} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Coins className="size-4" /> {preparador ? "Custos que eu lancei" : "Custos de preparação"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {custos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum custo lançado.</p>
            ) : (
              <ul className="divide-y rounded-lg border text-sm">
                {custos.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{TIPO_CUSTO[c.tipo]}{c.descricao ? ` · ${c.descricao}` : ""}</span>
                      <span className="block text-xs text-muted-foreground">{formatarData(c.data)}{!preparador && c.lancado_por ? ` · lançado por ${c.lancado_por}` : ""}</span>
                    </span>
                    <span className="numero shrink-0 font-medium">{formatarMoeda(Number(c.valor))}</span>
                  </li>
                ))}
                <li className="flex justify-between px-3 py-2 font-semibold"><span>Total</span><span className="numero">{formatarMoeda(total)}</span></li>
              </ul>
            )}
            {emPreparacao && <FormCustoPreparacao veiculoId={id} tipos={TIPO_CUSTO} />}
            {preparador && <p className="text-xs text-muted-foreground">O custo vai para o financeiro como conta a pagar pendente. Você não vê valores de compra nem outros custos do carro.</p>}
          </CardContent>
        </Card>

        <TarefasDaEntidade entidade="veiculo" entidadeId={id} usuario={{ id: usuario.id, papel: usuario.papel }} voltar={`/preparacao/${id}`} />
      </Conteudo>
    </>
  );
}

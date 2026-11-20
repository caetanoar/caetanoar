import Link from "next/link";
import { notFound } from "next/navigation";
import { Car, PlusCircle, Receipt, Repeat } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { carroDaPlaca, historicoPlaca, ultimaConsulta, usoMes } from "@/lib/consulta-veicular/consultas";
import { STATUS_VEICULO, TIPO_VEICULO, nomeVeiculo } from "@/lib/estoque/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarDataHora } from "@/lib/format/data";
import { formatarAno, formatarKm, formatarPlaca, normalizarPlaca, validarPlaca } from "@/lib/format/veiculo";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alerta } from "@/components/ui/misc";
import { ResultadoConsulta } from "@/components/consulta/resultado";
import { BotaoConsulta } from "@/components/consulta/botoes";
import { SeloConsulta } from "@/components/consulta/selo";

export async function generateMetadata({ params }: PageProps<"/placa/[placa]">) {
  const { placa } = await params;
  return { title: `Placa ${formatarPlaca(normalizarPlaca(placa))}` };
}

export default async function ResultadoPlaca({ params, searchParams }: PageProps<"/placa/[placa]">) {
  const usuario = await exigirPermissao("placa");
  const placa = normalizarPlaca((await params).placa);
  if (!validarPlaca(placa)) notFound();
  const { erro } = (await searchParams) as { erro?: string };
  const [carro, consulta, historico, uso] = await Promise.all([carroDaPlaca(placa), ultimaConsulta(placa), historicoPlaca(placa, 6), usoMes()]);
  const podeConsultar = pode(usuario.papel, "placa.consultar");
  const custo = Number(uso.custo_unitario ?? 0) > 0 ? formatarMoeda(Number(uso.custo_unitario)) : null;
  const gestao = pode(usuario.papel, "estoque.gerenciar");
  const naLoja = carro && carro.status !== "vendido" && carro.status !== "devolvido";
  const orcar = pode(usuario.papel, "orcamentos");

  return (
    <>
      <Cabecalho titulo={<span className="numero tracking-wider">{formatarPlaca(placa)}</span>} subtitulo={naLoja ? "Carro do estoque da Caetano Auto" : "Consulta de placa"} voltar="/placa" />
      <Conteudo className="flex max-w-2xl flex-col gap-4">
        {erro && <Alerta variante="erro">{erro}</Alerta>}

        {carro && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Car className="size-6" /></span>
              <div className="min-w-0 flex-1">
                <Link href={`/estoque/${carro.id}`} className="font-semibold text-primary hover:underline">
                  {nomeVeiculo({ marca: carro.marca!, modelo: carro.modelo!, versao: carro.versao })} {formatarAno(carro.ano_fabricacao, carro.ano_modelo)}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {TIPO_VEICULO[carro.tipo!]} · {STATUS_VEICULO[carro.status!].rotulo}{carro.km !== null ? ` · ${formatarKm(carro.km)}` : ""}
                  {carro.preco_anunciado ? ` · ${formatarMoeda(carro.preco_anunciado)}` : ""}
                </p>
              </div>
              <Badge variant={STATUS_VEICULO[carro.status!].variante}>{STATUS_VEICULO[carro.status!].rotulo}</Badge>
            </CardContent>
          </Card>
        )}
        {!carro && <p className="text-sm text-muted-foreground">Esta placa não está no estoque da Caetano Auto.</p>}

        <Card>
          <CardHeader><CardTitle>Consulta na base do provedor</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            {consulta ? <ResultadoConsulta c={consulta} temLaudo={carro?.laudo_cautelar ?? false} /> : <p className="text-sm text-muted-foreground">Nenhuma consulta feita para esta placa.</p>}
            {podeConsultar && <BotaoConsulta placa={placa} atualizar={!!consulta} custo={custo} />}
            {!podeConsultar && !consulta && <p className="text-xs text-muted-foreground">Peça a consulta a vendas, administrativo ou gestão.</p>}
          </CardContent>
        </Card>

        {orcar && naLoja && carro.status !== "reservado" && (
          <Button asChild><Link href={`/orcamentos/novo?veiculo=${carro.id}`}><Receipt /> Criar orçamento com este carro</Link></Button>
        )}
        {orcar && consulta?.status === "encontrado" && !naLoja && (
          <Button asChild variant="outline"><Link href={`/orcamentos/novo?troca=${consulta.id}`}><Repeat /> Usar como carro de troca num orçamento</Link></Button>
        )}
        {consulta?.status === "encontrado" && !naLoja && gestao && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button asChild variant="outline"><Link href={`/estoque/novo?tipo=proprio&consulta=${consulta.id}`}><PlusCircle /> Cadastrar como próprio</Link></Button>
            <Button asChild variant="outline"><Link href={`/estoque/novo?tipo=consignado&consulta=${consulta.id}`}><PlusCircle /> Cadastrar como consignado</Link></Button>
          </div>
        )}
        {historico.length > 1 && (
          <Card>
            <CardHeader><CardTitle>Consultas anteriores</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {historico.slice(1).map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{formatarDataHora(h.consultado_em)} · {h.provedor}{h.usuario ? ` · ${h.usuario}` : ""}{h.status === "erro" ? " · falhou" : ""}</span>
                  <SeloConsulta selo={h.status === "encontrado" ? h.selo : null} compacto />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </Conteudo>
    </>
  );
}

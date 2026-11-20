import Link from "next/link";
import { notFound } from "next/navigation";
import { Car, UserRound, Paperclip, Handshake } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarAnexos } from "@/lib/arquivos/consultas";
import { nomeVeiculo } from "@/lib/estoque/rotulos";
import { formatarPlaca, formatarAno, formatarKm } from "@/lib/format/veiculo";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { formatarTelefone } from "@/lib/format/telefone";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Anexos } from "@/components/arquivos/anexos";
import { CpfProtegido } from "@/components/clientes/ficha";
import { ChecklistCard, TarefasDaEntidade } from "@/components/tarefas/blocos";

export const metadata = { title: "Documentação da venda" };

/** Transferência de uma venda fechada: dados para a ATPV-e, checklist e anexos. */
export default async function DocumentacaoVenda({ params }: PageProps<"/documentacao/[venda]">) {
  const usuario = await exigirPermissao("documentacao");
  const { venda: id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await criarClienteServidor();
  const { data: vd } = await supabase.from("vendas").select("id, numero, data_venda, valor_venda, status, veiculo_id, cliente_id").eq("id", id).maybeSingle();
  if (!vd || vd.status !== "fechada") notFound();
  const [{ data: v }, { data: c }, { data: p }, anexos] = await Promise.all([
    supabase.from("veiculos").select("marca, modelo, versao, ano_fabricacao, ano_modelo, cor, placa, chassi, renavam, km").eq("id", vd.veiculo_id).single(),
    supabase.from("clientes").select("nome, telefone, whatsapp, email").eq("id", vd.cliente_id).single(),
    supabase.from("clientes_dados_pessoais").select("cpf_mascarado, cep, logradouro, numero, complemento, bairro, cidade, uf").eq("cliente_id", vd.cliente_id).maybeSingle(),
    carregarAnexos("venda", id),
  ]);
  if (!v || !c) notFound();
  const endereco = p?.logradouro
    ? `${p.logradouro}${p.numero ? `, ${p.numero}` : ""}${p.complemento ? ` - ${p.complemento}` : ""}${p.bairro ? ` - ${p.bairro}` : ""}${p.cidade ? ` - ${p.cidade}/${p.uf ?? ""}` : ""}${p.cep ? ` - CEP ${p.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : ""}`
    : null;

  return (
    <>
      <Cabecalho titulo={`Documentação ${vd.numero}`} subtitulo={`${nomeVeiculo({ marca: v.marca, modelo: v.modelo, versao: v.versao })} · ${c.nome}`} voltar="/documentacao" />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        <ChecklistCard tipo="documentacao" vendaId={id} podeMarcar voltar={`/documentacao/${id}`} titulo="Checklist de transferência" />

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Car className="size-4" /> Veículo</CardTitle></CardHeader>
          <CardContent>
            <ListaDados
              itens={[
                { rotulo: "Veículo", valor: `${nomeVeiculo({ marca: v.marca, modelo: v.modelo, versao: v.versao })} ${formatarAno(v.ano_fabricacao, v.ano_modelo)}` },
                { rotulo: "Placa", valor: v.placa ? formatarPlaca(v.placa) : null },
                { rotulo: "Chassi", valor: v.chassi },
                { rotulo: "Renavam", valor: v.renavam },
                { rotulo: "Cor", valor: v.cor },
                { rotulo: "Km na venda", valor: v.km !== null ? formatarKm(v.km) : null },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><UserRound className="size-4" /> Comprador</CardTitle></CardHeader>
          <CardContent>
            <ListaDados
              itens={[
                { rotulo: "Nome", valor: c.nome },
                { rotulo: "CPF", valor: <CpfProtegido clienteId={vd.cliente_id} mascarado={p?.cpf_mascarado ?? null} podeRevelar={pode(usuario.papel, "clientes.revelar")} /> },
                { rotulo: "Telefone", valor: c.whatsapp || c.telefone ? formatarTelefone((c.whatsapp || c.telefone)!) : null },
                { rotulo: "E-mail", valor: c.email },
                { rotulo: "Endereço", valor: endereco, largo: true },
              ]}
            />
            <p className="mt-3 text-xs text-muted-foreground">Revelar o CPF fica registrado (LGPD). Use só para a transferência.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Handshake className="size-4" /> Venda</CardTitle></CardHeader>
          <CardContent>
            <ListaDados itens={[
              { rotulo: "Data", valor: formatarData(vd.data_venda) },
              { rotulo: "Valor", valor: formatarMoeda(Number(vd.valor_venda)) },
              ...(pode(usuario.papel, "vendas") ? [{ rotulo: "Venda", valor: <Link href={`/vendas/${id}`} className="text-primary hover:underline">{vd.numero}</Link> }] : []),
            ]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Paperclip className="size-4" /> Documentos (CRLV, ATPV-e, vistoria, comprovantes)</CardTitle></CardHeader>
          <CardContent>
            <Anexos entidade="venda" entidadeId={id} anexos={anexos} podeEnviar revalidar={`/documentacao/${id}`} />
          </CardContent>
        </Card>

        <TarefasDaEntidade entidade="venda" entidadeId={id} usuario={{ id: usuario.id, papel: usuario.papel }} voltar={`/documentacao/${id}`} />
      </Conteudo>
    </>
  );
}

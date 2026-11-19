import { notFound, redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { opcoesVenda } from "@/lib/vendas/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { formatarNumeroMoeda } from "@/lib/format/moeda";
import { FormVenda } from "../../form-venda";

export default async function EditarVenda({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPermissao("vendas");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const [{ data: venda }, { data: pagamentos }, { data: trocas }] = await Promise.all([
    supabase.from("vendas").select("*").eq("id", id).maybeSingle(),
    supabase.from("vendas_pagamentos").select("*").eq("venda_id", id).order("criado_em"),
    supabase.from("vendas_trocas").select("*").eq("venda_id", id).order("criado_em"),
  ]);
  if (!venda) notFound();
  if (venda.status === "fechada" || venda.status === "cancelada") redirect(`/vendas/${id}`);
  const opcoes = await opcoesVenda(usuario, venda.veiculo_id);
  const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return (
    <>
      <Cabecalho titulo={`Editar venda ${venda.numero}`} voltar={`/vendas/${id}`} />
      <Conteudo className="max-w-3xl">
        <FormVenda
          {...opcoes}
          valores={{
            ...venda,
            pagamentos: (pagamentos ?? []).map((p) => ({
              forma: p.forma, valor: formatarNumeroMoeda(p.valor), banco_financiamento: txt(p.banco_financiamento), parcelas: txt(p.parcelas),
              data_prevista: txt(p.data_prevista), recebido: p.recebido, conta_id: txt(p.conta_id),
            })),
            trocas: (trocas ?? []).map((t) => ({
              placa: txt(t.placa), marca: t.marca, modelo: t.modelo, versao: txt(t.versao), motor: txt(t.motor), ano_fabricacao: txt(t.ano_fabricacao),
              ano_modelo: txt(t.ano_modelo), cor: txt(t.cor), km: txt(t.km), combustivel: txt(t.combustivel), cambio: txt(t.cambio),
              codigo_fipe: txt(t.codigo_fipe), valor_fipe: t.valor_fipe, valor_avaliacao: formatarNumeroMoeda(t.valor_avaliacao), observacoes: txt(t.observacoes),
            })),
          }}
        />
      </Conteudo>
    </>
  );
}

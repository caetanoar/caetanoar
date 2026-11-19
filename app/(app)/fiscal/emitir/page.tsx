import { notFound, redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { situacaoProvedor } from "@/lib/integracoes/fiscal";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Alerta } from "@/components/ui/misc";
import { FormEmissao } from "./form-emissao";

export default async function EmitirNota({ searchParams }: { searchParams: Promise<{ venda?: string }> }) {
  await exigirPermissao("fiscal");
  const { venda: vendaId } = await searchParams;
  if (!vendaId) redirect("/fiscal");
  const supabase = await criarClienteServidor();
  const [{ data: venda }, { data: cfg }] = await Promise.all([
    supabase.from("v_vendas").select("*").eq("id", vendaId).maybeSingle(),
    supabase.from("configuracoes_fiscais").select("*").single(),
  ]);
  if (!venda) notFound();
  const provedor = situacaoProvedor();
  const faltas = [
    !cfg?.cnpj && "CNPJ", !cfg?.inscricao_estadual && "inscrição estadual", !cfg?.razao_social && "razão social",
    !cfg?.regime_tributario && "regime tributário", !cfg?.logradouro && "endereço", !cfg?.ncm_veiculos && "NCM de veículos",
  ].filter(Boolean);
  const cfop = venda.tipo_veiculo === "consignado" ? cfg?.cfop_venda_consignado : cfg?.cfop_venda_proprio;
  return (
    <>
      <Cabecalho titulo="Emitir NF-e de venda" subtitulo={`${venda.numero} · ${venda.veiculo_nome}`} voltar="/fiscal" />
      <Conteudo className="flex max-w-2xl flex-col gap-3">
        {provedor.simulado && <Alerta variante="aviso" titulo="Modo simulado">A nota gerada é só para testar o fluxo e não tem valor fiscal.</Alerta>}
        {faltas.length > 0 && (
          <Alerta variante={provedor.simulado ? "info" : "erro"} titulo="Configuração fiscal incompleta">
            Falta: {faltas.join(", ")}. Preencha em Configurações › Fiscal (com o contador).
          </Alerta>
        )}
        <FormEmissao
          vendaId={venda.id!}
          padrao={{
            natureza: cfg?.natureza_venda ?? "Venda de veículo usado",
            cfop: cfop ?? "",
            ncm: cfg?.ncm_veiculos ?? "",
            csosn: cfg?.csosn_cst_padrao ?? "",
            informacoes: cfg?.informacoes_complementares ?? "",
          }}
          resumo={{ cliente: venda.cliente_nome ?? "", valor: Number(venda.valor_venda), tipo: venda.tipo_veiculo ?? "proprio" }}
        />
      </Conteudo>
    </>
  );
}

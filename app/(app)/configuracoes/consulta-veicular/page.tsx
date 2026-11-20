import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { provedorConsulta } from "@/lib/integracoes/consulta-veicular";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormConsultaVeicular } from "./form";

export const metadata = { title: "Consulta veicular" };

export default async function ConfigConsulta() {
  await exigirPermissao("configuracoes");
  const supabase = await criarClienteServidor();
  const { data: cfg } = await supabase
    .from("configuracoes")
    .select("consulta_custo_unitario, consulta_limite_mensal_qtd, consulta_limite_mensal_valor, consulta_cache_dias, consulta_validade_venda_dias")
    .single();
  const p = provedorConsulta();
  return (
    <>
      <Cabecalho titulo="Consulta veicular" subtitulo={`Provedor: ${p.nome}${p.simulado ? " (simulado)" : ""}`} voltar="/configuracoes" />
      <Conteudo className="max-w-2xl">
        <FormConsultaVeicular cfg={cfg!} />
      </Conteudo>
    </>
  );
}

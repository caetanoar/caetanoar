import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormLoja } from "./form-loja";

export default async function ConfigLoja() {
  await exigirPermissao("configuracoes");
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("configuracoes").select("*").single();
  return (
    <>
      <Cabecalho titulo="Dados da loja" voltar="/configuracoes" />
      <Conteudo className="max-w-2xl">{data && <FormLoja config={data} />}</Conteudo>
    </>
  );
}

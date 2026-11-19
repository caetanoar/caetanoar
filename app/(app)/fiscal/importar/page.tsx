import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ImportarXml } from "./importar-xml";

export default async function PaginaImportar() {
  await exigirPermissao("fiscal");
  const supabase = await criarClienteServidor();
  const { data: categorias } = await supabase.from("categorias_financeiras").select("id, nome").eq("tipo", "despesa").eq("ativa", true).neq("natureza", "transferencia").order("nome");
  return (
    <>
      <Cabecalho titulo="Importar XML de NF-e" voltar="/fiscal" />
      <Conteudo className="max-w-3xl"><ImportarXml categorias={categorias ?? []} /></Conteudo>
    </>
  );
}

import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormFornecedor } from "../../form-fornecedor";

export default async function EditarFornecedor({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("fornecedores");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("fornecedores").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <Cabecalho titulo="Editar fornecedor" subtitulo={data.nome} voltar={`/fornecedores/${id}`} />
      <Conteudo className="max-w-3xl"><FormFornecedor valores={data} /></Conteudo>
    </>
  );
}

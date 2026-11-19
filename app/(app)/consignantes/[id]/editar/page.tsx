import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormConsignante } from "../../form-consignante";

export default async function EditarConsignante({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("consignantes");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("consignantes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <Cabecalho titulo="Editar consignante" subtitulo={data.nome} voltar={`/consignantes/${id}`} />
      <Conteudo className="max-w-3xl"><FormConsignante valores={data} /></Conteudo>
    </>
  );
}

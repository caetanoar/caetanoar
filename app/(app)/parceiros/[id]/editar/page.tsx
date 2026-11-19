import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormParceiro } from "../../form-parceiro";

export default async function EditarParceiro({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("parceiros");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("parceiros").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <Cabecalho titulo="Editar parceiro" subtitulo={data.nome} voltar={`/parceiros/${id}`} />
      <Conteudo className="max-w-3xl"><FormParceiro valores={data} /></Conteudo>
    </>
  );
}

import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { opcoesCliente } from "@/lib/clientes/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormCliente } from "../../form-cliente";

export default async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPermissao("clientes");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const [{ data: c }, { data: p }, opcoes] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("clientes_dados_pessoais")
      .select("cpf_mascarado, data_nascimento, cep, logradouro, numero, complemento, bairro, cidade, uf")
      .eq("cliente_id", id)
      .maybeSingle(),
    opcoesCliente(),
  ]);
  if (!c) notFound();
  const valores = {
    ...c,
    data_nascimento: p?.data_nascimento,
    cep: p?.cep,
    logradouro: p?.logradouro,
    numero: p?.numero,
    complemento: p?.complemento,
    bairro: p?.bairro,
    cidade_endereco: p?.cidade,
    uf_endereco: p?.uf,
  };
  return (
    <>
      <Cabecalho titulo="Editar cliente" subtitulo={c.nome} voltar={`/clientes/${id}`} />
      <Conteudo className="max-w-3xl">
        <FormCliente valores={valores} {...opcoes} podeAtribuir={usuario.papel !== "vendedor"} cpfMascarado={p?.cpf_mascarado} />
      </Conteudo>
    </>
  );
}

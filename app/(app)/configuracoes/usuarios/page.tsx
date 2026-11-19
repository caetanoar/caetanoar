import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaUsuarios, ConvidarUsuario } from "./usuarios-cliente";

export default async function ConfigUsuarios() {
  const eu = await exigirPermissao("configuracoes");
  const supabase = await criarClienteServidor();
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nome, email, papel, ativo, telefone, criado_em")
    .order("ativo", { ascending: false })
    .order("nome");
  return (
    <>
      <Cabecalho titulo="Usuários" voltar="/configuracoes" acoes={<ConvidarUsuario />} />
      <Conteudo className="max-w-3xl">
        <ListaUsuarios usuarios={usuarios ?? []} meuId={eu.id} />
      </Conteudo>
    </>
  );
}

import { exigirPermissao } from "@/lib/auth/sessao";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormParceiro } from "../form-parceiro";

export default async function NovoParceiro() {
  await exigirPermissao("parceiros");
  return (
    <>
      <Cabecalho titulo="Novo parceiro" voltar="/parceiros" />
      <Conteudo className="max-w-3xl"><FormParceiro /></Conteudo>
    </>
  );
}

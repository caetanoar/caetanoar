import { exigirPermissao } from "@/lib/auth/sessao";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormConsignante } from "../form-consignante";

export default async function NovoConsignante() {
  await exigirPermissao("consignantes");
  return (
    <>
      <Cabecalho titulo="Novo consignante" voltar="/consignantes" />
      <Conteudo className="max-w-3xl"><FormConsignante /></Conteudo>
    </>
  );
}

import { exigirPermissao } from "@/lib/auth/sessao";
import { PaginaLancamentos, type FiltrosLancamentos } from "@/components/financeiro/pagina-lancamentos";

export default async function AReceber({ searchParams }: { searchParams: Promise<FiltrosLancamentos> }) {
  await exigirPermissao("financeiro");
  return <PaginaLancamentos titulo="Contas a receber" f={await searchParams} fixo={{ tipo: "receita", pendentes: true }} />;
}

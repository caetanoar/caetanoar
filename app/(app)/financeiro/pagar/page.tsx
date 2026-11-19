import { exigirPermissao } from "@/lib/auth/sessao";
import { PaginaLancamentos, type FiltrosLancamentos } from "@/components/financeiro/pagina-lancamentos";

export default async function APagar({ searchParams }: { searchParams: Promise<FiltrosLancamentos> }) {
  await exigirPermissao("financeiro");
  return <PaginaLancamentos titulo="Contas a pagar" f={await searchParams} fixo={{ tipo: "despesa", pendentes: true }} />;
}

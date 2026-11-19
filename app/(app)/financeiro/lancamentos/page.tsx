import { exigirPermissao } from "@/lib/auth/sessao";
import { PaginaLancamentos, type FiltrosLancamentos } from "@/components/financeiro/pagina-lancamentos";

export default async function Lancamentos({ searchParams }: { searchParams: Promise<FiltrosLancamentos> }) {
  await exigirPermissao("financeiro");
  return <PaginaLancamentos titulo="Lançamentos" f={await searchParams} />;
}

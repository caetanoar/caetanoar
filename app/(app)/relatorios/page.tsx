import Link from "next/link";
import { Users, Wallet, Car, Handshake, FileText, Trophy, ChevronRight } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { TIPOS_RELATORIO, type TipoRelatorio } from "@/lib/relatorios/definicoes";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";

export const metadata = { title: "Relatórios" };

const ICONES: Record<TipoRelatorio, React.ComponentType<{ className?: string }>> = {
  vendas: Handshake,
  carros: Car,
  clientes: Users,
  financeiro: Wallet,
  fiscal: FileText,
  vendedores: Trophy,
};

export default async function Relatorios() {
  await exigirPermissao("relatorios");
  return (
    <>
      <Cabecalho titulo="Relatórios" subtitulo="Filtre por período e baixe em CSV (Excel) ou PDF" />
      <Conteudo>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {(Object.keys(TIPOS_RELATORIO) as TipoRelatorio[]).map((t) => {
            const Icone = ICONES[t];
            return (
              <li key={t}>
                <Link href={`/relatorios/${t}`} className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-secondary">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icone className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{TIPOS_RELATORIO[t].titulo}</span>
                    <span className="block text-sm text-muted-foreground">{TIPOS_RELATORIO[t].descricao}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Conteudo>
    </>
  );
}

import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { consultasRecentes } from "@/lib/consulta-veicular/consultas";
import { formatarDataHora } from "@/lib/format/data";
import { formatarPlaca } from "@/lib/format/veiculo";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { CampoPlaca } from "@/components/consulta/campo-placa";
import { SeloConsulta } from "@/components/consulta/selo";

export const metadata = { title: "Consulta por placa" };

export default async function Placa({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const usuario = await exigirPermissao("placa");
  const { erro } = await searchParams;
  const gestao = pode(usuario.papel, "consultas.painel");
  const recentes = await consultasRecentes(15, gestao ? undefined : usuario.id);
  return (
    <>
      <Cabecalho titulo="Consulta por placa" subtitulo="Primeiro no estoque; se não estiver lá, na base do provedor" />
      <Conteudo className="flex max-w-2xl flex-col gap-4">
        {erro === "placa" && <Alerta variante="erro">Placa inválida. Use ABC1234 ou ABC1D23.</Alerta>}
        <CampoPlaca />
        {!pode(usuario.papel, "placa.consultar") && (
          <p className="text-xs text-muted-foreground">Seu perfil busca no estoque e vê consultas já feitas; consultas externas (pagas) são feitas por vendas, administrativo e gestão.</p>
        )}
        <h2 className="mt-2 text-sm font-semibold text-muted-foreground">{gestao ? "Consultas recentes da equipe" : "Minhas consultas recentes"}</h2>
        {recentes.length === 0 ? (
          <Vazio icone={ScanSearch} titulo="Nenhuma consulta ainda" />
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {recentes.map((c) => (
              <Link key={c.id} href={`/placa/${c.placa}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                <span className="numero w-24 font-semibold">{formatarPlaca(c.placa)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {[c.dados.marca, c.dados.modelo].filter(Boolean).join(" ") || (c.status === "erro" ? "Falha na consulta" : "Não encontrada")} · {formatarDataHora(c.consultado_em)}
                  {gestao && c.usuario ? ` · ${c.usuario}` : ""}
                </span>
                <SeloConsulta selo={c.status === "encontrado" ? c.selo : null} compacto />
              </Link>
            ))}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

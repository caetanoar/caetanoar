import Link from "next/link";
import { Settings2 } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { consultasRecentes, usoMes } from "@/lib/consulta-veicular/consultas";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarDataHora, inicioDoMes, hojeISO, nomeDoMes } from "@/lib/format/data";
import { formatarPlaca } from "@/lib/format/veiculo";
import { provedorConsulta } from "@/lib/integracoes/consulta-veicular";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kpi, MedidorMeta } from "@/components/indicadores/kpi";
import { Alerta } from "@/components/ui/misc";
import { SeloConsulta } from "@/components/consulta/selo";

export const metadata = { title: "Consultas de placa" };

export default async function PainelConsultas() {
  const usuario = await exigirPermissao("consultas.painel");
  const supabase = await criarClienteServidor();
  const mes = inicioDoMes(hojeISO());
  const [uso, porUsuario, log] = await Promise.all([
    usoMes(),
    supabase.from("v_consultas_uso").select("usuario_nome, qtd, erros, custo").eq("mes", mes).order("qtd", { ascending: false }).then((r) => r.data ?? []),
    consultasRecentes(30),
  ]);
  const provedor = provedorConsulta();

  return (
    <>
      <Cabecalho
        titulo="Consultas de placa"
        subtitulo={`Uso de ${nomeDoMes(mes)}`}
        acoes={pode(usuario.papel, "configuracoes") ? <Link href="/configuracoes/consulta-veicular" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><Settings2 className="size-4" /> Limites</Link> : undefined}
      />
      <Conteudo className="flex flex-col gap-4">
        {provedor.simulado && <Alerta variante="info">Provedor simulado: as consultas não custam nada e os dados são fictícios. Para usar um provedor real é preciso contratar e configurar a chave.</Alerta>}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Kpi rotulo="Consultas no mês" valor={String(uso.qtd)} />
          <Kpi rotulo="Gasto no mês" valor={formatarMoeda(Number(uso.valor))} />
          <Kpi rotulo="Limite de consultas" valor={uso.limite_qtd ? String(uso.limite_qtd) : "Sem limite"} />
          <Kpi rotulo="Custo por consulta" valor={formatarMoeda(Number(uso.custo_unitario ?? 0))} apoio={provedor.nome} />
        </div>
        {(uso.limite_qtd || uso.limite_valor) && (
          <Card>
            <CardContent className="grid gap-4 p-4 md:grid-cols-2">
              {uso.limite_qtd && <MedidorMeta rotulo="Consultas usadas" realizado={uso.qtd} meta={uso.limite_qtd} formatar={(n) => String(n)} />}
              {uso.limite_valor && <MedidorMeta rotulo="Gasto" realizado={Number(uso.valor)} meta={Number(uso.limite_valor)} formatar={formatarMoeda} />}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>Por usuário</CardTitle></CardHeader>
          <CardContent>
            {porUsuario.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma consulta neste mês.</p> : (
              <ul className="divide-y">
                {porUsuario.map((u) => (
                  <li key={u.usuario_nome} className="flex items-center justify-between py-2 text-sm">
                    <span>{u.usuario_nome}</span>
                    <span className="numero text-muted-foreground">{u.qtd} consulta(s){u.erros ? ` · ${u.erros} falha(s)` : ""} · {formatarMoeda(Number(u.custo))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Registro das consultas</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {log.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                  <Link href={`/placa/${c.placa}`} className="numero w-24 font-semibold text-primary hover:underline">{formatarPlaca(c.placa)}</Link>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{formatarDataHora(c.consultado_em)} · {c.usuario} · {c.provedor} · {formatarMoeda(c.custo)}</span>
                  <SeloConsulta selo={c.status === "encontrado" ? c.selo : null} compacto />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Conteudo>
    </>
  );
}

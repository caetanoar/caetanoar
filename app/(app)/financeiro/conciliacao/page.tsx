import Link from "next/link";
import { Landmark } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { agregadorBancario } from "@/lib/integracoes/bancos";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { AbasLink } from "@/components/app/abas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { ImportarExtrato, LinhaTransacao, BotaoAuto, BotaoDesfazer, SincronizarOpenFinance } from "./conciliacao-cliente";

type Aba = "pendente" | "conciliada" | "ignorada";

export default async function Conciliacao({ searchParams }: { searchParams: Promise<{ conta?: string; aba?: string }> }) {
  await exigirPermissao("financeiro");
  const f = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: contas } = await supabase.from("contas_financeiras").select("id, nome, tipo").eq("ativa", true).neq("tipo", "caixa").order("nome");
  const contaId = f.conta ?? contas?.[0]?.id;
  const aba: Aba = f.aba === "conciliada" || f.aba === "ignorada" ? f.aba : "pendente";
  const agregador = agregadorBancario();

  if (!contas?.length) {
    return (
      <>
        <Cabecalho titulo="Conciliação bancária" voltar="/financeiro" />
        <Conteudo><Vazio icone={Landmark} titulo="Cadastre uma conta bancária"><Link href="/financeiro/contas" className="text-primary hover:underline">Cadastrar conta</Link></Vazio></Conteudo>
      </>
    );
  }

  const [{ data: transacoes }, { data: categorias }, { data: importacoes }, { data: contagem }, { data: conexoes }] = await Promise.all([
    supabase.from("v_extrato").select("*").eq("conta_id", contaId!).eq("status", aba).order("data", { ascending: aba === "pendente" }).limit(100),
    supabase.from("categorias_financeiras").select("id, nome, tipo").eq("ativa", true).neq("natureza", "transferencia").order("nome"),
    supabase.from("extratos_importacoes").select("id, origem, nome_arquivo, periodo_inicio, periodo_fim, qtd_transacoes, qtd_novas, criado_em").eq("conta_id", contaId!).order("criado_em", { ascending: false }).limit(5),
    supabase.from("extratos_transacoes").select("status").eq("conta_id", contaId!),
    supabase.from("open_finance_conexoes").select("id, nome, ultimo_sync").eq("conta_id", contaId!),
  ]);
  const qtd = (s: string) => (contagem ?? []).filter((c) => c.status === s).length;
  const sugestoes = aba === "pendente"
    ? await Promise.all((transacoes ?? []).slice(0, 50).map(async (t) => [t.id!, (await supabase.rpc("sugestoes_conciliacao", { p_transacao: t.id! })).data ?? []] as const))
    : [];
  const mapa = new Map(sugestoes);

  return (
    <>
      <Cabecalho titulo="Conciliação bancária" subtitulo="Extrato × lançamentos" voltar="/financeiro" />
      <Conteudo className="flex flex-col gap-4">
        <form className="flex gap-2">
          <Select name="conta" defaultValue={contaId} aria-label="Conta bancária">
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Button type="submit" variant="outline">Trocar</Button>
        </form>

        <ImportarExtrato contaId={contaId!} />

        <AbasLink
          abas={[
            { id: "pendente", rotulo: `Pendentes (${qtd("pendente")})` },
            { id: "conciliada", rotulo: `Conciliadas (${qtd("conciliada")})` },
            { id: "ignorada", rotulo: `Ignoradas (${qtd("ignorada")})` },
          ]}
          atual={aba}
          base={`/financeiro/conciliacao?conta=${contaId}`}
        />

        {aba === "pendente" && qtd("pendente") > 0 && <BotaoAuto contaId={contaId!} />}

        {(transacoes ?? []).length === 0 ? (
          <Vazio icone={Landmark} titulo={aba === "pendente" ? "Nada pendente" : "Nenhuma transação"}>
            {aba === "pendente" ? "Importe o extrato (OFX ou CSV) do banco para conciliar." : null}
          </Vazio>
        ) : (
          <div className="flex flex-col gap-2">
            {(transacoes ?? []).map((t) =>
              aba === "pendente" ? (
                <LinhaTransacao
                  key={t.id}
                  transacao={{ id: t.id!, data: t.data!, valor: Number(t.valor), descricao: t.descricao ?? "" }}
                  sugestoes={(mapa.get(t.id!) ?? []).map((s) => ({ id: s.lancamento_id, descricao: s.descricao, data: s.data, status: s.status, pontuacao: s.pontuacao }))}
                  categorias={(categorias ?? []).filter((c) => c.tipo === (Number(t.valor) > 0 ? "receita" : "despesa"))}
                />
              ) : (
                <Card key={t.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.descricao}</p>
                      <p className="text-xs text-muted-foreground">{formatarData(t.data)}{t.lancamento_descricao && ` · ${t.lancamento_descricao}`}</p>
                    </div>
                    <span className={`numero text-sm font-semibold ${Number(t.valor) > 0 ? "text-success" : ""}`}>{formatarMoeda(t.valor)}</span>
                    <BotaoDesfazer transacaoId={t.id!} />
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Últimas importações</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {(importacoes ?? []).length === 0 && <p className="text-muted-foreground">Nenhuma importação ainda.</p>}
              {(importacoes ?? []).map((i) => (
                <div key={i.id} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">{i.nome_arquivo ?? i.origem.toUpperCase()} · {formatarData(i.periodo_inicio)} a {formatarData(i.periodo_fim)}</span>
                  <span className="shrink-0 text-muted-foreground">{i.qtd_novas}/{i.qtd_transacoes} novas · {formatarDataHora(i.criado_em)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Open Finance <Badge variant={agregador.configurado ? "success" : "muted"}>{agregador.configurado ? agregador.nome : "não configurado"}</Badge></CardTitle>
              <CardDescription>
                {agregador.configurado
                  ? "Sincronize as transações direto do banco, sem baixar arquivo."
                  : "Integração pronta para um agregador (ex.: Pluggy). Para ligar: contratar o serviço e definir OPEN_FINANCE_PROVIDER, PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET."}
              </CardDescription>
            </CardHeader>
            {agregador.configurado && (
              <CardContent className="flex flex-col gap-2">
                {(conexoes ?? []).map((c) => <SincronizarOpenFinance key={c.id} conexao={{ id: c.id, nome: c.nome, ultimo: c.ultimo_sync }} />)}
                {(conexoes ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum banco conectado a esta conta.</p>}
              </CardContent>
            )}
          </Card>
        </div>
      </Conteudo>
    </>
  );
}

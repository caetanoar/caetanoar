import { Percent } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alerta } from "@/components/ui/misc";
import { BotaoExcluir } from "@/components/cadastros/botao-excluir";
import { TIPO_COMISSAO, BASE_COMISSAO } from "@/lib/vendas/rotulos";
import { formatarMoeda, formatarPercentual } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { FormRegra, Simulador, RegraDaConsignacao } from "./regras-cliente";
import { excluirRegra } from "./acoes";

export default async function RegrasComissao() {
  const usuario = await exigirPermissao("comissoes");
  const dono = usuario.papel === "dono";
  const supabase = await criarClienteServidor();
  const [{ data: regras }, { data: consignantes }, { data: vendedores }, { data: parceiros }, { data: consignacoes }] = await Promise.all([
    supabase.from("regras_comissao").select("*, consignantes(nome), usuarios:vendedor_id(nome), parceiros(nome)").order("tipo").order("prioridade", { ascending: false }),
    supabase.from("consignantes").select("id, nome").eq("ativo", true).order("nome"),
    supabase.rpc("listar_vendedores"),
    supabase.from("parceiros").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("v_veiculos_gestao").select("id, marca, modelo, consignacao_id, consignante_nome, regra_comissao_id").eq("tipo", "consignado").in("status", ["disponivel", "reservado"]),
  ]);
  const opcoes = { consignantes: consignantes ?? [], vendedores: (vendedores ?? []).map((v) => ({ id: v.id, nome: v.nome })), parceiros: parceiros ?? [] };
  const tipos = ["loja_consignado", "vendedor", "parceiro"] as const;

  return (
    <>
      <Cabecalho titulo="Regras de comissão" subtitulo={dono ? "Valores editáveis a qualquer momento" : "Somente leitura (o dono altera)"} voltar="/configuracoes" acoes={dono && <FormRegra {...opcoes} />} />
      <Conteudo className="flex max-w-4xl flex-col gap-4">
        <Alerta variante="info" titulo="Como as regras funcionam">
          Na venda, vale a regra ativa mais específica (por consignante, vendedor ou parceiro) e, em empate, a de maior prioridade.
          Cada comissão guarda uma cópia da regra usada, então mudar uma regra não altera vendas já fechadas.
          Sem regra aplicável, o gerente informa o valor na hora de fechar a venda.
        </Alerta>
        {tipos.map((tipo) => {
          const lista = (regras ?? []).filter((r) => r.tipo === tipo);
          return (
            <Card key={tipo}>
              <CardHeader><CardTitle>{TIPO_COMISSAO[tipo]}</CardTitle></CardHeader>
              <CardContent className="p-0">
                {lista.length === 0 ? (
                  <div className="px-4 pb-4"><Vazio icone={Percent} titulo="Nenhuma regra cadastrada">{dono ? "Toque em “Nova regra” para definir os valores." : "Aguardando definição do dono."}</Vazio></div>
                ) : (
                  <ul className="divide-y">
                    {lista.map((r) => {
                      const escopo = (r.consignantes as { nome: string } | null)?.nome ?? (r.usuarios as { nome: string } | null)?.nome ?? (r.parceiros as { nome: string } | null)?.nome;
                      return (
                        <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-1.5 font-medium">
                              {r.nome}
                              {!r.ativa && <Badge variant="muted">Inativa</Badge>}
                              {escopo ? <Badge variant="info">{escopo}</Badge> : <Badge variant="outline">Padrão</Badge>}
                              {r.aplica_a !== "todos" && tipo !== "loja_consignado" && <Badge variant="secondary">{r.aplica_a === "proprio" ? "carros próprios" : "consignados"}</Badge>}
                            </p>
                            <p className="text-sm">
                              {r.modo === "fixo" ? formatarMoeda(r.valor_fixo) : `${formatarPercentual(r.percentual)} sobre ${BASE_COMISSAO[r.base].toLowerCase()}`}
                              {r.piso !== null && ` · piso ${formatarMoeda(r.piso)}`}
                              {r.teto !== null && ` · teto ${formatarMoeda(r.teto)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Desde {formatarData(r.vigente_desde)}{r.vigente_ate && ` até ${formatarData(r.vigente_ate)}`}{r.prioridade ? ` · prioridade ${r.prioridade}` : ""}
                            </p>
                          </div>
                          {dono && <FormRegra regra={r} {...opcoes} />}
                          {dono && <BotaoExcluir id={r.id} acao={excluirRegra} rotulo="" titulo="Excluir regra?" descricao="As comissões já calculadas guardam a regra usada." />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle>Regra por consignação</CardTitle>
            <CardDescription>Opcional: fixe uma regra específica para um carro consignado (ex.: acordo diferente com o dono).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {(consignacoes ?? []).filter((c) => c.consignacao_id).map((c) => (
                <li key={c.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.marca} {c.modelo}</p>
                    <p className="text-xs text-muted-foreground">{c.consignante_nome}</p>
                  </div>
                  <RegraDaConsignacao
                    consignacaoId={c.consignacao_id!}
                    regraId={c.regra_comissao_id}
                    regras={(regras ?? []).filter((r) => r.tipo === "loja_consignado" && r.ativa).map((r) => ({ id: r.id, nome: r.nome }))}
                    podeEditar={dono}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Simulador regras={(regras ?? []).filter((r) => r.ativa)} />
      </Conteudo>
    </>
  );
}

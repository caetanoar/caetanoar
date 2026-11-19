import { ArrowLeftRight } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card } from "@/components/ui/card";
import { BotaoExcluir } from "@/components/cadastros/botao-excluir";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { NovaTransferencia } from "./nova-transferencia";
import { excluirTransferencia } from "../acoes";

export default async function Transferencias() {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const [{ data }, { data: contas }] = await Promise.all([
    supabase.from("transferencias").select("id, valor, data, descricao, origem:contas_financeiras!transferencias_conta_origem_id_fkey(nome), destino:contas_financeiras!transferencias_conta_destino_id_fkey(nome)").order("data", { ascending: false }).limit(200),
    supabase.from("contas_financeiras").select("id, nome").eq("ativa", true).order("nome"),
  ]);
  return (
    <>
      <Cabecalho titulo="Transferências" voltar="/financeiro" acoes={<NovaTransferencia contas={contas ?? []} />} />
      <Conteudo className="max-w-3xl">
        {(data ?? []).length === 0 ? (
          <Vazio icone={ArrowLeftRight} titulo="Nenhuma transferência" />
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {(data ?? []).map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{(t.origem as { nome: string } | null)?.nome} → {(t.destino as { nome: string } | null)?.nome}</p>
                  <p className="text-xs text-muted-foreground">{formatarData(t.data)}{t.descricao && ` · ${t.descricao}`}</p>
                </div>
                <span className="numero font-semibold">{formatarMoeda(t.valor)}</span>
                <BotaoExcluir id={t.id} acao={excluirTransferencia} rotulo="" titulo="Excluir transferência?" descricao="Os dois lançamentos (saída e entrada) também são removidos." />
              </div>
            ))}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

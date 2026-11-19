import { Wallet } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIPO_CONTA } from "@/lib/financeiro/rotulos";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { FormConta } from "./form-conta";

export default async function Contas() {
  await exigirPermissao("financeiro");
  const supabase = await criarClienteServidor();
  const [{ data: contas }, { data: saldos }] = await Promise.all([
    supabase.from("contas_financeiras").select("*").order("ativa", { ascending: false }).order("nome"),
    supabase.from("v_saldos_contas").select("id, saldo_atual"),
  ]);
  const saldo = new Map((saldos ?? []).map((s) => [s.id, s.saldo_atual]));
  return (
    <>
      <Cabecalho titulo="Contas" subtitulo="Caixa, bancos e carteiras digitais" voltar="/financeiro" acoes={<FormConta />} />
      <Conteudo className="max-w-3xl">
        {(contas ?? []).length === 0 ? (
          <Vazio icone={Wallet} titulo="Nenhuma conta cadastrada">Cadastre o caixa da loja e cada conta bancária com o saldo de hoje.</Vazio>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {(contas ?? []).map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">{c.nome} {!c.ativa && <Badge variant="muted">Inativa</Badge>}</p>
                  <p className="text-xs text-muted-foreground">
                    {[TIPO_CONTA[c.tipo], c.banco, c.agencia && `ag. ${c.agencia}`, c.conta && `c/c ${c.conta}`].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo inicial {formatarMoeda(c.saldo_inicial)} em {formatarData(c.data_saldo_inicial)}</p>
                </div>
                <span className="numero font-semibold">{formatarMoeda(saldo.get(c.id) ?? null)}</span>
                <FormConta conta={c} />
              </div>
            ))}
          </Card>
        )}
      </Conteudo>
    </>
  );
}

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ESCOPOS } from "@/lib/api/chaves";
import { EVENTOS_WEBHOOK } from "@/lib/webhooks/eventos";
import { situacaoIA } from "@/lib/ia/claude";
import { situacaoProvedor } from "@/lib/integracoes/fiscal";
import { agregadorBancario } from "@/lib/integracoes/bancos";
import { NovaChave, ListaChaves, NovoWebhook, ListaWebhooks, ListaEntregas, Situacao } from "./componentes";

export const metadata = { title: "Integrações" };

export default async function Integracoes() {
  await exigirPermissao("configuracoes");
  const supabase = await criarClienteServidor();
  const [{ data: chaves }, { data: webhooks }, { data: entregas }] = await Promise.all([
    supabase.from("api_chaves").select("id, nome, prefixo, escopos, ultimo_uso_em, expira_em, revogada_em, criado_em").order("criado_em", { ascending: false }),
    supabase.from("webhooks").select("id, nome, url, eventos, ativo, falhas_consecutivas, ultimo_envio_em, ultimo_status").order("criado_em"),
    supabase.from("webhook_entregas").select("id, evento_tipo, status, tentativas, ultimo_status_http, ultimo_erro, criado_em, webhooks(nome)").order("criado_em", { ascending: false }).limit(20),
  ]);

  const ia = situacaoIA();
  const fiscal = situacaoProvedor();
  const banco = agregadorBancario();
  const fipe = process.env.FIPE_PROVIDER || "brasilapi";

  return (
    <>
      <Cabecalho titulo="Integrações" subtitulo="API, webhooks e serviços externos" voltar="/configuracoes" />
      <Conteudo className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle>Serviços</CardTitle><CardDescription>Ligados por variáveis de ambiente no servidor. Nenhuma chave aparece aqui.</CardDescription></CardHeader>
          <CardContent>
            <Situacao
              itens={[
                { nome: "IA (Claude)", ok: ia.ativa, detalhe: ia.ativa ? `Ligada · ${ia.modelo} · até ${ia.limiteDiario} gerações por usuário/dia` : "Modo simulado (defina ANTHROPIC_API_KEY para ligar)" },
                { nome: "NF-e", ok: fiscal.configurado && !fiscal.simulado, detalhe: fiscal.simulado ? "Simulador (sem valor fiscal)" : `${fiscal.nome} · ${fiscal.ambiente}${fiscal.configurado ? "" : " · sem credenciais"}` },
                { nome: "Open Finance", ok: banco.configurado, detalhe: banco.configurado ? banco.nome : "Desligado: use a importação de OFX/CSV" },
                { nome: "Tabela FIPE", ok: true, detalhe: `Consulta automática (${fipe})` },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Chaves de API</CardTitle>
              <CardDescription>Para o site e outros sistemas lerem o estoque ou enviarem leads.</CardDescription>
            </div>
            <NovaChave escopos={{ ...ESCOPOS }} />
          </CardHeader>
          <CardContent>
            <ListaChaves chaves={chaves ?? []} />
            <Link href="/api/v1/openapi.json" target="_blank" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Documentação da API (OpenAPI) <ExternalLink className="size-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Avisos automáticos assinados (HMAC) com reenvio em caso de falha.</CardDescription>
            </div>
            <NovoWebhook eventos={EVENTOS_WEBHOOK} />
          </CardHeader>
          <CardContent><ListaWebhooks webhooks={webhooks ?? []} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Últimas notificações</CardTitle></CardHeader>
          <CardContent>
            <ListaEntregas entregas={(entregas ?? []).map((e) => ({ ...e, webhook: (e.webhooks as { nome: string } | null)?.nome ?? null }))} />
          </CardContent>
        </Card>
      </Conteudo>
    </>
  );
}

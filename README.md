# Caetano Auto — CRM

CRM da Caetano Auto (seminovos, Divinópolis/MG): estoque próprio e consignado, clientes, vendas com troca,
garantias, financeiro, comissões, fiscal (NF-e), relatórios, IA para anúncios e integrações.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · componentes no padrão shadcn/ui (Radix) ·
Supabase (Postgres, Auth, Storage, RLS) · hospedagem gratuita na Netlify (ver `docs/DEPLOY.md`).

## Rodando localmente

Pré-requisitos: Node 22, pnpm, Docker.

```bash
pnpm install
cp .env.example .env.local      # preencha com as chaves que o `supabase start` mostrar
pnpm db:start                   # sobe o Supabase local (Postgres, Auth, Storage)
pnpm db:reset                   # aplica as migrations e o seed de desenvolvimento
pnpm dev                        # http://localhost:3000
```

Usuários de desenvolvimento (senha `caetano123`):

| Perfil | E-mail |
|---|---|
| Dono | arthur@caetanoauto.local |
| Gerente | gerente@caetanoauto.local |
| Vendedor | vendedor1@caetanoauto.local, vendedor2@caetanoauto.local |
| Atendimento/pós-venda | atendimento@caetanoauto.local |
| Preparador | preparador@caetanoauto.local |
| Administrativo/despachante | administrativo@caetanoauto.local |

E-mails enviados localmente (convites, recuperação de senha) aparecem no Mailpit: http://127.0.0.1:54324

## Testes

```bash
pnpm test        # unitários (Vitest)
pnpm test:db     # RLS e regras do banco por perfil (pgTAP)
pnpm test:e2e    # fluxos no celular (Playwright)
pnpm typecheck && pnpm lint
```

## Módulos

Estoque próprio e consignado (FIPE automática, fotos pelo celular, documentos, laudo, custos, margem e dias em estoque) ·
consulta com "Chamar no WhatsApp" · clientes com funil e CPF protegido · fornecedores, consignantes e parceiros ·
vendas com troca (vendedor registra, gerente fecha; o fechamento gera comissões, garantia e financeiro) · garantias ·
financeiro (contas, a pagar/receber, transferências, conciliação OFX/CSV) · comissões · NF-e (importação de XML e
emissão por provedor) · metas, dashboard e painel do dono · relatórios com CSV e PDF · IA para anúncios e follow-up ·
API REST e webhooks.

**Área de trabalho** (celular): tarefas por perfil com prazos e checklists · consulta por placa (estoque primeiro,
depois o provedor; selos verde/amarelo/vermelho, cache, limite mensal e painel de uso) · orçamentos (troca consultada
pela placa, desconto com aprovação, simulação de financiamento, alertas fixos do carro, PDF, link público e WhatsApp,
lembretes de 2 e 5 dias, conversão em venda) · venda verificada (impeditivo só o dono libera, com justificativa;
demais alertas exigem a ciência do cliente e o Termo de Ciência assinado) · preparação (checklist, fotos e custos do
preparador) · documentação da transferência (checklist, dados para a ATPV-e e anexos).

## Consulta veicular

- O provedor fica atrás de um adapter (`lib/integracoes/consulta-veicular/`), escolhido por `CONSULTA_VEICULAR_PROVIDER`.
  Hoje só existe o **simulado** (`mock`, padrão), sempre marcado como "SIMULADO" na tela e no PDF. Cenário pelo último
  dígito da placa: 3 = nada encontrado, 5 = leilão e IPVA, 7 = roubo/furto, 9 = placa não encontrada.
- O adapter real só será escrito depois que o dono escolher e contratar o provedor; a chave vai em variável de ambiente.
- Textos de consulta nunca dizem "carro limpo", "garantido" ou "sem problemas": sem registros, a frase é
  "Nenhum registro encontrado na consulta de [data] ([provedor])" (um teste varre o código para garantir).
- A resposta bruta do provedor fica só com dono e gerente, sem nome/CPF do proprietário.

## API e webhooks

- Chaves criadas pelo dono em **Configurações → Integrações**, com escopos (`estoque:ler`, `leads:criar`, `vendas:ler`).
  O banco guarda só o hash (HMAC com `API_KEY_PEPPER`); a chave aparece uma única vez.
- Endpoints em `/api/v1` (`GET /veiculos`, `GET /veiculos/{id}`, `POST /leads`, `GET /vendas`); documentação em
  `/api/v1/openapi.json`. Nenhum campo sigiloso (custo, mínimo, placa, chassi, lucro, CPF) sai pela API.
- Webhooks assinados: cabeçalho `X-Caetano-Assinatura: t=<unix>,v1=<hex>` com HMAC-SHA256 de `${t}.${corpo}`.
  Disparo logo após o evento e reenvio com espera crescente pela rota `/api/cron/webhooks` (ver `docs/DEPLOY.md`).

## Estrutura

- `supabase/migrations/` — esquema versionado, RLS, funções e regras de negócio atômicas
- `supabase/tests/` — testes pgTAP de permissão por perfil
- `app/(auth)` — login, recuperação e criação de senha
- `app/(app)` — telas do CRM (navegação inferior por perfil no celular)
- `lib/` — formatação pt-BR, Supabase, permissões, integrações (FIPE, fiscal, bancos, IA)

## Segurança

- Permissões garantidas por **Row Level Security** no banco; a interface só esconde o que o perfil não acessa.
- Dados sigilosos (custo, lucro, preço mínimo, financeiro, fiscal, CPF) ficam em tabelas separadas, só para dono e gerente.
- Toda criação, alteração e exclusão é registrada na tabela `auditoria`.
- Nenhum segredo no código: tudo em variáveis de ambiente (ver `.env.example`).
- A IA nunca recebe CPF, telefone ou e-mail (só o primeiro nome do cliente); textos de anúncio passam por um validador
  que bloqueia "estado de novo", "sem problemas" e equivalentes quando o carro não tem laudo cautelar aprovado.
- Um teste pgTAP global (`0099_rls_global`) falha se alguma tabela nova ficar sem RLS, se o anônimo tiver acesso
  a qualquer tabela, ou se alguma view ignorar a RLS.

## Deploy

Ainda não publicado. Passo a passo e decisões pendentes em [`docs/DEPLOY.md`](docs/DEPLOY.md).

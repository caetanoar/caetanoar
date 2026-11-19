# Caetano Auto — CRM

CRM da Caetano Auto (seminovos, Divinópolis/MG): estoque próprio e consignado, clientes, vendas com troca,
garantias, financeiro, comissões, fiscal (NF-e), relatórios, IA para anúncios e integrações.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · componentes no padrão shadcn/ui (Radix) ·
Supabase (Postgres, Auth, Storage, RLS) · Vercel.

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

E-mails enviados localmente (convites, recuperação de senha) aparecem no Mailpit: http://127.0.0.1:54324

## Testes

```bash
pnpm test        # unitários (Vitest)
pnpm test:db     # RLS e regras do banco por perfil (pgTAP)
pnpm test:e2e    # fluxos no celular (Playwright)
pnpm typecheck && pnpm lint
```

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

# Checklist de publicação (produção)

> Nada disto foi executado. Cada passo que cria conta, contrata plano ou publica o sistema depende da autorização do dono.

## 1. Decisões e dados que dependem da loja

| Item | Por que importa | Situação |
|---|---|---|
| Planos Supabase e Vercel | Supabase grátis pausa após 7 dias sem uso (Pro: US$ 25/mês). Vercel Hobby **proíbe uso comercial** (Pro: US$ 20/mês). | Aguardando decisão |
| Projeto Supabase na nuvem | Sugestão: região São Paulo (sa-east-1). | Não criado |
| E-mail do Arthur | Primeiro acesso do dono (`OWNER_EMAIL`). | Pendente |
| SMTP próprio (ex.: Resend) | O e-mail padrão do Supabase tem limite baixo para convites e recuperação de senha. | Opcional |
| Valores de comissão | O sistema nasce sem regras; o dono cadastra em Configurações → Regras de comissão. | Pendente |
| Texto da cobertura da garantia | Prazo padrão de 90 dias já definido; falta o texto. | Pendente |
| Comissão de indicação no lucro? | A fórmula informada não inclui. | Pendente |
| Recebimento padrão do consignado | `loja_repassa` ou `direto_dono`, depois de falar com o contador. | Pendente |
| Fiscal | CNPJ e IE ativos, certificado A1 (.pfx + senha), provedor (Focus NFe, NFE.io ou outro), credenciamento de NF-e na SEFAZ-MG, CFOP/CST validados pelo contador; NFS-e de Divinópolis se a comissão for faturada como serviço. | Simulador ligado |
| Open Finance | Escolha do agregador (ex.: Pluggy) e credenciais; OFX/CSV já funcionam sem ele. | Desligado |
| IA real | `ANTHROPIC_API_KEY` (custo por uso, ~US$ 0,02 por legenda). Sem chave, modo simulado. | Simulado |
| Dados dos 4 consignados | Placa, chassi, RENAVAM, km (Ka, Uno, HB20S), câmbio, combustível do Uno, anos de fabricação, mínimos e prazos dos contratos, regra de comissão de cada consignação, contratos em PDF e fotos. | Marcados como pendências no próprio carro |

## 2. Banco (Supabase)

1. Criar o projeto e anotar URL, chave `anon` e `service_role` (esta só no servidor).
2. Aplicar as migrations: `npx supabase link --project-ref <ref>` e `npx supabase db push`.
   **Não** rode o `supabase/seed.sql` em produção (ele cria usuários de teste).
3. Authentication → URL Configuration: `Site URL` = domínio do app; adicionar `https://<domínio>/auth/confirm` em Redirect URLs.
4. Authentication → Email Templates: copiar `supabase/templates/convite.html` e `recuperacao.html`.
5. Authentication → desativar cadastro público (só convite) e manter senha mínima de 8 caracteres.
6. Reenvio de webhooks a cada minuto (pg_cron + pg_net, disponíveis no plano grátis):

   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
   select cron.schedule('reenviar-webhooks', '* * * * *', $$
     select net.http_get(
       url := 'https://<domínio>/api/cron/webhooks',
       headers := jsonb_build_object('Authorization', 'Bearer ' ||
         (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'))
     );
   $$);
   ```

## 3. App (Vercel)

1. Importar o repositório e definir as variáveis de `.env.example` (Production): Supabase, `NEXT_PUBLIC_SITE_URL`,
   `API_KEY_PEPPER` e `CRON_SECRET` (`openssl rand -hex 32`), `FIPE_PROVIDER`, e as opcionais de IA, fiscal e Open Finance.
2. Primeiro deploy e domínio (opcional, ex.: crm.caetanoauto.com.br).
3. Criar o dono: `OWNER_EMAIL=... OWNER_NOME="Arthur" NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SITE_URL=https://<domínio> pnpm criar-dono`.
4. O dono entra, confere Configurações → Dados da loja, cadastra as regras de comissão, as contas financeiras, as metas
   e convida gerente e vendedores.

## 4. Conferência após publicar

- [ ] Login, convite e recuperação de senha chegam por e-mail e abrem `/definir-senha`.
- [ ] Vendedor não vê custo, mínimo, margem, financeiro, fiscal nem relatórios (testar com uma conta real de vendedor).
- [ ] Upload de foto pelo celular e "Chamar no WhatsApp" com o número 5537991193815.
- [ ] Consulta FIPE responde (BrasilAPI).
- [ ] `/api/cron/webhooks` responde 401 sem o segredo.
- [ ] Backup: ativar Point-in-Time Recovery se o plano permitir.

# Checklist de publicação (produção)

> Publicação autorizada pelo dono em 20/11/2026. Situação:
>
> - [x] Supabase: projeto `caetano-auto-crm` criado no plano gratuito, região **us-east-2 (Ohio)**, a mesma do
>   servidor gratuito da Netlify (as telas ficam mais rápidas). Migrations 0001 a 0019 aplicadas, sem o `seed.sql`.
>   Conferido: todas as tabelas com RLS, nenhum acesso anônimo, views com `security_invoker`, funções sem login
>   fechadas (exceto o link público do orçamento).
> - [ ] Netlify: site importado do GitHub (branch `main`) com as variáveis de ambiente.
> - [ ] Supabase Auth: Site URL, Redirect URLs, cadastro público desligado, modelos de e-mail e SMTP do Gmail.
> - [ ] Reenvio de webhooks (pg_cron) com o domínio final.
> - [ ] Conta do dono e conferência final (seção 6).

## 1. Caminho escolhido: gratuito

O dono pediu para usar o que for gratuito. O que isso significa na prática:

| Peça | Serviço gratuito | Limites e cuidados |
|---|---|---|
| Banco, login e arquivos | **Supabase Free** | 500 MB de banco e 1 GB de arquivos (fotos são comprimidas no celular). O projeto **pausa após 7 dias sem uso**: o uso diário da loja evita isso; se pausar, reativa pelo painel. **Não tem backup automático**: usar o backup diário do GitHub (seção 5). |
| Hospedagem do app | **Netlify Free** | A Netlify permite uso comercial no plano gratuito e publica Next.js 16 sem configuração. O Vercel Hobby **não** serve: os termos limitam o plano gratuito a uso pessoal, não comercial. Conferir os termos da Netlify no dia da publicação. |
| E-mails (convite e recuperação de senha) | **Gmail da loja (SMTP com senha de app)** | Sem SMTP próprio, o Supabase só envia e-mail para membros da equipe do projeto. O Gmail envia algumas centenas de e-mails por dia, mais que suficiente. Alternativa: Brevo (plano gratuito). |
| Reenvio de webhooks | pg_cron + pg_net do Supabase | Incluídos no plano gratuito. |
| IA | Modo simulado | Sem custo. A IA real (API do Claude) é paga por uso e fica desligada. |
| Bancos | Importação de OFX/CSV | Open Finance (pago) desligado. |
| NF-e | Simulador | A loja ainda não tem CNPJ, inscrição estadual nem certificado. |

## 2. Decisões e dados

| Item | Situação |
|---|---|
| E-mail do dono | Informado (fica só na variável `OWNER_EMAIL`, fora do repositório) |
| Recebimento do consignado | **Comprador paga direto ao dono; a loja recebe a comissão separada** (padrão; dá para trocar em cada venda). Com carro na troca, a loja fica com o carro e lança o valor devido ao dono. |
| Garantia | 90 dias, texto padrão de cobertura definido (editável em Configurações → Dados da loja); termo em PDF para o cliente assinar em cada garantia |
| Valores de comissão | **Pendente**: o dono ainda vai decidir. Até lá, o gerente informa o valor na hora de fechar a venda. |
| Comissão de indicação no lucro | Pendente |
| Fiscal | Quando houver: CNPJ e IE, certificado A1, provedor (Focus NFe, NFE.io ou outro), credenciamento na SEFAZ-MG e CFOPs validados pelo contador; NFS-e de Divinópolis se a comissão for faturada como serviço |
| Dados dos 4 consignados | Preencher no próprio sistema (Estoque → carro → Editar); as pendências aparecem marcadas no carro |

## 3. Banco (Supabase)

1. Criar o projeto e anotar URL, chave `anon` e `service_role` (esta só no servidor).
2. Aplicar as migrations: `npx supabase link --project-ref <ref>` e `npx supabase db push`.
   **Não** rode o `supabase/seed.sql` em produção (ele cria usuários de teste).
3. Authentication → URL Configuration: `Site URL` = domínio do app; adicionar `https://<domínio>/auth/confirm` em Redirect URLs.
4. Authentication → Email Templates: copiar `supabase/templates/convite.html` e `recuperacao.html`.
5. Authentication → desativar cadastro público (só convite) e manter senha mínima de 8 caracteres.
6. Authentication → SMTP Settings (e-mails pelo Gmail da loja):
   - no Gmail: ativar a verificação em duas etapas e criar uma **senha de app** (Conta Google → Segurança → Senhas de app);
   - no Supabase: host `smtp.gmail.com`, porta `465`, usuário e remetente = o Gmail da loja, senha = a senha de app;
   - a senha de app fica só no painel do Supabase, nunca no código nem em mensagens.
7. Reenvio de webhooks a cada minuto (pg_cron + pg_net, disponíveis no plano grátis):

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

## 4. App (Netlify)

1. Na Netlify: "Add new site" → importar o repositório do GitHub, branch `main` (o `netlify.toml` já define o build)
   e definir as variáveis de `.env.example`: Supabase, `NEXT_PUBLIC_SITE_URL`, `API_KEY_PEPPER` e `CRON_SECRET`
   (`openssl rand -hex 32`), `FIPE_PROVIDER`, `CONSULTA_VEICULAR_PROVIDER=mock`, e as opcionais de IA, fiscal e Open Finance.
   As variáveis `NEXT_PUBLIC_*` entram no build: depois de mudá-las, faça um novo deploy.
   Não cadastre `FIPE_PROVIDER`, `CONSULTA_VEICULAR_PROVIDER`, `FISCAL_PROVIDER` nem `OPEN_FINANCE_PROVIDER` com os
   valores padrão ("brasilapi", "mock", "none"): o sistema já usa esses padrões, e a verificação de segredos da Netlify
   barra o build porque esses textos aparecem no código. A `SUPABASE_SERVICE_ROLE_KEY` é a chave **secret**
   (`sb_secret_...`), nunca a publishable.
2. Primeiro deploy e domínio (opcional, ex.: crm.caetanoauto.com.br).
3. Criar o dono: `OWNER_EMAIL=... OWNER_NOME="Arthur" NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SITE_URL=https://<domínio> pnpm criar-dono`.
4. O dono entra, confere Configurações → Dados da loja, cadastra as regras de comissão, as contas financeiras, as metas
   e convida gerente e vendedores.

## 5. Backup diário (GitHub Actions, gratuito)

O arquivo `.github/workflows/backup-banco.yml` exporta o banco todo dia às 03h17, criptografa (AES-256) e guarda por 30 dias
nos artefatos do GitHub. Ele só começa a rodar quando:
1. o código estiver na branch principal do repositório; e
2. os segredos forem cadastrados em GitHub → Settings → Secrets and variables → Actions:
   - `SUPABASE_DB_URL`: a connection string do banco (Supabase → Project Settings → Database, modo "Session pooler");
   - `BACKUP_PASSPHRASE`: uma senha longa, guardada em lugar seguro (sem ela o backup não abre).

Para abrir um backup: `gpg -d backup-AAAA-MM-DD.tar.gz.gpg | tar -xz`. As fotos e PDFs do Storage não entram nesse
backup; baixe-os pelo painel do Supabase de tempos em tempos.

## 6. Conferência após publicar

- [ ] Login, convite e recuperação de senha chegam por e-mail e abrem `/definir-senha`.
- [ ] Vendedor não vê custo, mínimo, margem, financeiro, fiscal nem relatórios (testar com uma conta real de vendedor).
- [ ] Upload de foto pelo celular e "Chamar no WhatsApp" com o número 5537991193815.
- [ ] Consulta FIPE responde (BrasilAPI).
- [ ] `/api/cron/webhooks` responde 401 sem o segredo.
- [ ] Backup: ativar Point-in-Time Recovery se o plano permitir.

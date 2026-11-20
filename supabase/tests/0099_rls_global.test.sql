-- Rede de segurança: vale para TODAS as tabelas, views e funções do schema public,
-- inclusive as que forem criadas no futuro.
begin;
\ir _helpers.psql
select plan(12);

select is(
  (select coalesce(string_agg(tablename, ', '), '') from pg_tables where schemaname = 'public' and not rowsecurity),
  '', 'toda tabela tem RLS ativa');

select is(
  (select coalesce(string_agg(distinct table_name, ', '), '') from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'),
  '', 'anônimo não tem permissão em nenhuma tabela ou view');

select is(
  (select coalesce(string_agg(c.relname, ', '), '') from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and not coalesce(c.reloptions @> array['security_invoker=true'], false)),
  '', 'toda view respeita a RLS de quem consulta (security_invoker)');

select is(
  (select coalesce(string_agg(p.proname, ', '), '') from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')),
  '', 'toda função security definer fixa o search_path');

select is(
  (select coalesce(string_agg(p.proname, ', '), '') from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname in ('webhooks_reservar', 'webhooks_registrar', 'api_registrar_lead')
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
  '', 'funções internas do servidor não são executáveis por usuários');

-- Vendedor: nenhuma linha nas tabelas sigilosas, mesmo com dados existentes
select pg_temp.criar_usuario('v_global@t.com', 'vendedor') as v \gset
select pg_temp.logar(:'v');
select is(
  (select (select count(*) from veiculos_sigilo) + (select count(*) from custos_veiculo) + (select count(*) from consignacoes)
        + (select count(*) from consignantes) + (select count(*) from fornecedores) + (select count(*) from parceiros)),
  0::bigint, 'vendedor não vê custo, mínimo, consignação, consignante, fornecedor nem parceiro');
select is(
  (select (select count(*) from lancamentos) + (select count(*) from contas_financeiras) + (select count(*) from transferencias)
        + (select count(*) from extratos_transacoes) + (select count(*) from comissoes) + (select count(*) from regras_comissao)),
  0::bigint, 'vendedor não vê financeiro nem comissões de terceiros');
select is(
  (select (select count(*) from notas_fiscais) + (select count(*) from configuracoes_fiscais) + (select count(*) from garantias)
        + (select count(*) from auditoria) + (select count(*) from api_chaves) + (select count(*) from webhooks) + (select count(*) from webhook_entregas)),
  0::bigint, 'vendedor não vê fiscal, garantias, auditoria nem integrações');
select is((select count(*) from clientes where vendedor_id is distinct from :'v'), 0::bigint, 'vendedor novo não vê clientes de outros');
select pg_temp.sair();

-- Perfis novos: nada de custo, compra, financeiro, fiscal, comissões, auditoria ou integrações
select pg_temp.criar_usuario('a_global@t.com', 'atendimento') as a \gset
select pg_temp.criar_usuario('p_global@t.com', 'preparador') as p \gset
select pg_temp.criar_usuario('d_global@t.com', 'administrativo') as d \gset


select pg_temp.logar(:'a');
select is((select (select count(*) from veiculos_sigilo) + (select count(*) from custos_veiculo) + (select count(*) from consignacoes) + (select count(*) from lancamentos)
  + (select count(*) from comissoes) + (select count(*) from notas_fiscais) + (select count(*) from auditoria) + (select count(*) from api_chaves) + (select count(*) from vendas)), 0::bigint,
  'atendimento não vê sigilo, financeiro, fiscal, comissões, auditoria, integrações nem vendas');
select pg_temp.sair();
select pg_temp.logar(:'p');
select is((select (select count(*) from veiculos_sigilo) + (select count(*) from consignacoes) + (select count(*) from lancamentos) + (select count(*) from clientes)
  + (select count(*) from comissoes) + (select count(*) from notas_fiscais) + (select count(*) from auditoria) + (select count(*) from vendas) + (select count(*) from garantias)), 0::bigint,
  'preparador não vê compra, consignação, financeiro, clientes, comissões, fiscal, auditoria, vendas nem garantias');
select pg_temp.sair();
select pg_temp.logar(:'d');
select is((select (select count(*) from veiculos_sigilo) + (select count(*) from custos_veiculo) + (select count(*) from consignacoes) + (select count(*) from lancamentos)
  + (select count(*) from comissoes) + (select count(*) from notas_fiscais) + (select count(*) from auditoria) + (select count(*) from garantias)
  + (select count(*) from vendas where status <> 'fechada')), 0::bigint,
  'administrativo não vê sigilo, financeiro, comissões, fiscal, auditoria, garantias nem vendas em aberto');
select pg_temp.sair();

select * from finish();
rollback;

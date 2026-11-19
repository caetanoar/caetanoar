begin;
\ir _helpers.psql
select plan(6);

delete from metas where mes = date_trunc('month', public.hoje())::date;
select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
select pg_temp.criar_usuario('v2@t.com', 'vendedor') as v2 \gset

select pg_temp.logar(:'dono');
insert into metas (mes, vendedor_id, meta_faturamento, meta_lucro, meta_qtd_vendas) values
  (date_trunc('month', public.hoje())::date, null, 500000, 60000, 8),
  (date_trunc('month', public.hoje())::date, :'v1', 200000, null, 3),
  (date_trunc('month', public.hoje())::date, :'v2', 150000, null, 2);
select throws_ok($$ insert into metas (mes, vendedor_id, meta_qtd_vendas) values (date_trunc('month', public.hoje())::date, null, 1) $$, '23505', null, 'uma meta da loja por mês');
select pg_temp.sair();

select pg_temp.logar(:'gerente');
update metas set meta_qtd_vendas = 99 where vendedor_id is null;
select is((select meta_qtd_vendas from metas where vendedor_id is null and mes = date_trunc('month', public.hoje())::date), 8, 'gerente não altera metas');
select is((select count(*)::int from metas where mes = date_trunc('month', public.hoje())::date), 3, 'gerente vê todas as metas');
select pg_temp.sair();

select pg_temp.logar(:'v1');
select is((select count(*)::int from metas), 1, 'vendedor vê só a própria meta');
select is((meu_dashboard(public.hoje()) ->> 'meta_qtd_vendas')::int, 3, 'meu dashboard traz a meta do vendedor');
select ok(not (meu_dashboard(public.hoje()) ? 'lucro'), 'dashboard do vendedor não traz lucro');
select pg_temp.sair();

select * from finish();
rollback;

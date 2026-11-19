begin;
\ir _helpers.psql
select plan(12);

select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('vend@t.com', 'vendedor') as vend \gset

select pg_temp.logar(:'gerente');
insert into contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial) values ('Banco conc teste', 'banco', 0, public.hoje() - 30) returning id as conta \gset
insert into lancamentos (tipo, descricao, categoria_id, valor, data_vencimento) values ('receita', 'Recebimento cliente', categoria_sistema('venda_veiculo'), 1500, public.hoje() - 1) returning id as receita \gset
insert into lancamentos (tipo, descricao, categoria_id, valor, data_vencimento) values ('despesa', 'Energia', (select id from categorias_financeiras where nome = 'Energia, água e internet'), 320.45, public.hoje()) returning id as energia \gset
insert into extratos_importacoes (conta_id, origem) values (:'conta', 'ofx') returning id as imp \gset
insert into extratos_transacoes (importacao_id, conta_id, data, valor, descricao, hash) values
  (:'imp', :'conta', public.hoje(), 1500, 'PIX RECEBIDO JOAO', 'h1'),
  (:'imp', :'conta', public.hoje(), -320.45, 'CEMIG', 'h2'),
  (:'imp', :'conta', public.hoje(), -12.90, 'TARIFA PACOTE', 'h3');
select id as t1 from extratos_transacoes where hash = 'h1' and conta_id = :'conta' \gset
select id as t3 from extratos_transacoes where hash = 'h3' and conta_id = :'conta' \gset

select throws_ok(format($$ insert into extratos_transacoes (conta_id, data, valor, hash) values (%L, public.hoje(), 1, 'h1') $$, :'conta'), '23505', null, 'transação repetida no extrato é ignorada (hash único)');
select is((select lancamento_id from sugestoes_conciliacao(:'t1') limit 1), :'receita'::uuid, 'sugere o lançamento de mesmo valor');
select lives_ok(format($$ select conciliar_transacao(%L, %L) $$, :'t1', :'receita'), 'concilia');
select is((select status::text || '/' || conciliado::text from lancamentos where id = :'receita'), 'pago/true', 'conciliar baixa o lançamento pendente');
select is((select data_pagamento from lancamentos where id = :'receita'), public.hoje(), 'data do pagamento = data do extrato');
select throws_ok(format($$ select conciliar_transacao(%L, %L) $$, :'t1', :'receita'), 'P0001', null, 'não concilia duas vezes');
select throws_ok(format($$ select conciliar_transacao(%L, %L) $$, :'t3', :'energia'), 'P0001', null, 'valores diferentes não conciliam');

select is(conciliar_automatico(:'conta'), 1, 'conciliação automática pega a energia (único candidato)');
select lancar_transacao(:'t3', (select id from categorias_financeiras where nome = 'Tarifas bancárias')) as tarifa \gset
select is((select valor from lancamentos where id = :'tarifa'), 12.90, 'tarifa sem lançamento vira despesa conciliada');
select is((select saldo_atual from v_saldos_contas where id = :'conta'), 1166.65, 'saldo bate com o extrato');
select lives_ok(format($$ select desfazer_conciliacao(%L) $$, :'t1'), 'desfaz a conciliação');
select pg_temp.sair();

select pg_temp.logar(:'vend');
select is((select count(*)::int from extratos_transacoes), 0, 'vendedor não vê extratos');
select pg_temp.sair();

select * from finish();
rollback;

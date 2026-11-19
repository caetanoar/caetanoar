begin;
\ir _helpers.psql
select plan(18);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('vend@t.com', 'vendedor') as vend \gset

select pg_temp.logar(:'gerente');
insert into contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial) values ('Caixa teste', 'caixa', 1000, public.hoje() - 10) returning id as caixa \gset
insert into contas_financeiras (nome, tipo, saldo_inicial, data_saldo_inicial) values ('Banco teste', 'banco', 5000, public.hoje() - 10) returning id as banco \gset

-- Despesa paga reduz o saldo
select criar_lancamento(jsonb_build_object('tipo','despesa','descricao','Aluguel teste','categoria_id', (select id from categorias_financeiras where nome = 'Aluguel'),
  'valor', 300, 'status','pago','data_pagamento', public.hoje(), 'conta_id', :'caixa', 'forma_pagamento','pix')) as aluguel \gset
select is((select saldo_atual from v_saldos_contas where id = :'caixa'), 700.00, 'despesa paga reduz o caixa');

-- Parcelamento em 3x com arredondamento
select criar_lancamento(jsonb_build_object('tipo','despesa','descricao','Equipamento','categoria_id', (select id from categorias_financeiras where nome = 'Outras despesas'),
  'valor', 100, 'data_vencimento', public.hoje()), 3) as parc \gset
select is((select count(*)::int from lancamentos where grupo_parcelas = (select grupo_parcelas from lancamentos where id = :'parc')), 3, 'gera 3 parcelas');
select is((select sum(valor) from lancamentos where grupo_parcelas = (select grupo_parcelas from lancamentos where id = :'parc')), 100.00, 'parcelas somam o total');

-- Baixa e estorno
select lives_ok(format($$ select baixar_lancamento(%L, public.hoje(), %L, 'pix') $$, :'parc', :'banco'), 'baixa uma parcela');
select is((select saldo_atual from v_saldos_contas where id = :'banco'), 4966.67, 'baixa reduz o saldo do banco');
select throws_ok(format($$ select baixar_lancamento(%L, public.hoje(), %L) $$, :'parc', :'banco'), 'P0001', null, 'não baixa duas vezes');
select lives_ok(format($$ select estornar_baixa(%L) $$, :'parc'), 'estorna a baixa');

-- Transferência
select transferir(:'banco', :'caixa', 1000, public.hoje(), 'Reforço de caixa') as transf \gset
select is((select saldo_atual from v_saldos_contas where id = :'caixa'), 1700.00, 'transferência entra no caixa');
select is((select saldo_atual from v_saldos_contas where id = :'banco'), 4000.00, 'e sai do banco');

-- Categoria incoerente
select throws_ok(format($$ insert into lancamentos (tipo, descricao, categoria_id, valor) values ('receita', 'X', (select id from categorias_financeiras where nome = 'Aluguel'), 10) $$), 'P0001', null, 'categoria precisa combinar com o tipo');
select throws_ok($$ delete from categorias_financeiras where sistema = 'venda_veiculo' $$, 'P0001', null, 'categoria do sistema protegida');

-- Integração com estoque: custo de preparação vira conta a pagar
insert into veiculos (tipo, origem, status, marca, modelo) values ('proprio', 'compra', 'em_preparacao', 'Fiat', 'Argo') returning id as argo \gset
insert into veiculos_sigilo (veiculo_id, valor_compra) values (:'argo', 50000);
select is((select valor from lancamentos where veiculo_id = :'argo' and categoria_id = categoria_sistema('compra_veiculo')), 50000.00, 'compra gera conta a pagar');
insert into custos_veiculo (veiculo_id, tipo, valor, descricao) values (:'argo', 'mecanica', 800, 'Freios') returning id as custo \gset
select is((select valor from lancamentos where custo_veiculo_id = :'custo'), 800.00, 'custo gera conta a pagar');
update custos_veiculo set valor = 950 where id = :'custo';
select is((select valor from lancamentos where custo_veiculo_id = :'custo'), 950.00, 'alterar custo atualiza o lançamento pendente');
select baixar_lancamento((select id from lancamentos where custo_veiculo_id = :'custo'), public.hoje(), :'caixa');
select throws_ok(format($$ delete from custos_veiculo where id = %L $$, :'custo'), 'P0001', null, 'custo pago não pode ser excluído');
select pg_temp.sair();

-- Vendedor não vê nada do financeiro
select pg_temp.logar(:'vend');
select is((select count(*)::int from lancamentos), 0, 'vendedor não vê lançamentos');
select is((select count(*)::int from v_saldos_contas), 0, 'vendedor não vê saldos');
select throws_ok($$ select transferir(gen_random_uuid(), gen_random_uuid(), 10) $$, '42501', null, 'vendedor não transfere');
select pg_temp.sair();

select * from finish();
rollback;

begin;
\ir _helpers.psql
select plan(12);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
select pg_temp.criar_usuario('v2@t.com', 'vendedor') as v2 \gset
select pg_temp.criar_usuario('inativo@t.com', 'vendedor', false) as inativo \gset
select id as ka from veiculos where modelo = 'Ka' and criado_por is null \gset

-- Vendedor 1: anúncio de um carro e resumo do próprio cliente
select pg_temp.logar(:'v1');
insert into clientes (nome, telefone, origem, vendedor_id) values ('Cliente IA', '37999990077', 'instagram', :'v1') returning id as cli \gset
select lives_ok(format($$ insert into ia_geracoes (tipo, veiculo_id, entrada, saida, modelo, simulado) values ('anuncio', %L, '{}', '{}', 'simulado', true) $$, :'ka'),
  'vendedor gera anúncio de carro do estoque');
select lives_ok(format($$ insert into ia_geracoes (tipo, cliente_id, entrada, saida, modelo, simulado) values ('cliente', %L, '{}', '{"resumo":"x"}', 'simulado', true) $$, :'cli'),
  'vendedor gera resumo do próprio cliente');
select throws_ok(format($$ insert into ia_geracoes (tipo, veiculo_id, entrada, saida, modelo, usuario_id) values ('anuncio', %L, '{}', '{}', 'x', %L) $$, :'ka', :'v2'),
  '42501', null, 'não grava geração em nome de outro usuário');
select is(public.ia_geracoes_hoje(), 2, 'contador diário do usuário');
select pg_temp.sair();

-- Vendedor 2: vê anúncios, mas não o resumo do cliente do colega
select pg_temp.logar(:'v2');
select is((select count(*)::int from ia_geracoes where tipo = 'anuncio' and veiculo_id = :'ka' and usuario_id = :'v1'), 1, 'outro vendedor vê os anúncios');
select is((select count(*)::int from ia_geracoes where tipo = 'cliente' and cliente_id = :'cli'), 0, 'outro vendedor não vê resumo de cliente alheio');
select throws_ok(format($$ insert into ia_geracoes (tipo, cliente_id, entrada, saida, modelo) values ('cliente', %L, '{}', '{}', 'x') $$, :'cli'),
  '42501', null, 'outro vendedor não gera resumo de cliente alheio');
select pg_temp.sair();

-- Gerente vê tudo, mas o histórico é imutável e só o dono apaga
select pg_temp.logar(:'gerente');
select is((select count(*)::int from ia_geracoes where cliente_id = :'cli'), 1, 'gerente vê o resumo do cliente');
update ia_geracoes set modelo = 'alterado' where cliente_id = :'cli';
delete from ia_geracoes where cliente_id = :'cli';
select is((select modelo from ia_geracoes where cliente_id = :'cli'), 'simulado', 'ninguém altera nem gerente apaga');
select pg_temp.sair();

select pg_temp.logar(:'dono');
delete from ia_geracoes where cliente_id = :'cli';
select is((select count(*)::int from ia_geracoes where cliente_id = :'cli'), 0, 'dono pode apagar');
select pg_temp.sair();

select pg_temp.logar(:'inativo');
select is((select count(*)::int from ia_geracoes), 0, 'usuário inativo não vê nada');
select pg_temp.sair();

select pg_temp.anonimo();
select throws_ok($$ select count(*) from ia_geracoes $$, '42501', null, 'anônimo sem acesso');
select pg_temp.sair();

select * from finish();
rollback;

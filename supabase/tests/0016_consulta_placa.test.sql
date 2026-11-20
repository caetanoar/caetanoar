begin;
\ir _helpers.psql
select plan(14);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
select pg_temp.criar_usuario('prep@t.com', 'preparador') as prep \gset
delete from veiculos where placa = 'TST1A23';
insert into veiculos (tipo, origem, status, marca, modelo, placa) values ('proprio', 'compra', 'disponivel', 'Fiat', 'Uno', 'TST1A23') returning id as carro \gset
update configuracoes set consulta_custo_unitario = 2.50, consulta_cache_dias = 7, consulta_limite_mensal_qtd = null, consulta_limite_mensal_valor = null;

select pg_temp.logar(:'v1');
select lives_ok($$ select registrar_consulta('{"placa": "tst-1a23", "provedor": "Simulado", "simulado": true, "status": "encontrado", "selo": "verde", "dados": {"marca": "Fiat"}, "verificacoes": {}}', '{"x": 1}') $$,
  'vendedor registra consulta');
select is((select veiculo_id from consultas_veiculares where placa = 'TST1A23' order by consultado_em desc limit 1), :'carro'::uuid, 'consulta ligada ao carro do estoque pela placa');
select is((select custo from consultas_veiculares where placa = 'TST1A23' order by consultado_em desc limit 1), 2.50, 'custo vem da configuração quando o provedor não informa');
select ok((select expira_em between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour' from consultas_veiculares where placa = 'TST1A23' limit 1), 'consulta vale pelos dias de cache');
select is((select count(*)::int from consultas_veiculares_brutos), 0, 'vendedor não vê a resposta bruta do provedor');
select throws_ok($$ insert into consultas_veiculares (placa, provedor, status, expira_em, usuario_id) values ('AAA1A11', 'x', 'encontrado', now(), auth.uid()) $$,
  '42501', null, 'ninguém grava consulta direto na tabela');
select is((select count(*)::int from v_consultas_uso), 0, 'vendedor não vê o painel de uso');
select pg_temp.sair();

select pg_temp.logar(:'prep');
select is((select count(*)::int from consultas_veiculares where placa = 'TST1A23'), 1, 'preparador vê consultas já feitas');
select throws_ok($$ select registrar_consulta('{"placa": "TST1A23", "provedor": "Simulado", "status": "encontrado"}') $$, '42501', null, 'preparador não faz consulta paga');
select pg_temp.sair();

select pg_temp.logar(:'gerente');
select is((select count(*)::int from consultas_veiculares_brutos b join consultas_veiculares c on c.id = b.consulta_id where c.placa = 'TST1A23'), 1, 'gerente vê a resposta bruta');
select ok((select qtd >= 1 from v_consultas_uso where mes = date_trunc('month', now() at time zone 'America/Sao_Paulo')::date limit 1), 'gerente vê o uso do mês');
select pg_temp.sair();

-- Limite mensal atingido: bloqueia novas consultas (falhas continuam registradas, sem custo)
update configuracoes set consulta_limite_mensal_qtd = (select count(*) from consultas_veiculares where status <> 'erro' and consultado_em >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
select pg_temp.logar(:'v1');
select isnt(consulta_disponivel(), null, 'limite do mês atingido avisa o motivo');
select throws_ok($$ select registrar_consulta('{"placa": "TST1A23", "provedor": "Simulado", "status": "encontrado"}') $$, '42501', null, 'limite mensal bloqueia nova consulta');
select lives_ok($$ select registrar_consulta('{"placa": "TST1A23", "provedor": "Simulado", "status": "erro", "erro": "timeout"}') $$, 'falha do provedor é registrada mesmo no limite');
select pg_temp.sair();

select * from finish();
rollback;

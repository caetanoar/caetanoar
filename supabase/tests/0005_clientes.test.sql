begin;
\ir _helpers.psql
select plan(21);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
select pg_temp.criar_usuario('v2@t.com', 'vendedor') as v2 \gset

-- Vendedor 1 cadastra o próprio cliente com CPF
select pg_temp.logar(:'v1');
insert into clientes (nome, telefone, origem, vendedor_id) values ('Maria Silva', '37999990001', 'instagram', :'v1') returning id as maria \gset
select lives_ok(format($$ insert into clientes_dados_pessoais (cliente_id, cpf) values (%L, '52998224725') $$, :'maria'), 'vendedor grava CPF do próprio cliente');
select throws_ok(format($$ insert into clientes (nome, vendedor_id) values ('Outro', %L) $$, :'v2'), '42501', null, 'vendedor não cria cliente para outro vendedor');
select is((select cpf_mascarado from clientes_dados_pessoais where cliente_id = :'maria'), '***.982.247-**', 'vê CPF mascarado');
select throws_ok($$ select cpf from clientes_dados_pessoais $$, '42501', null, 'leitura direta do CPF bloqueada');
select is(revelar_dado_pessoal(:'maria', 'cpf', 'contrato'), '52998224725', 'revela CPF pela função');
insert into clientes_contatos (cliente_id, canal, resumo, proximo_contato_em) values (:'maria', 'whatsapp', 'Pediu fotos do T-Cross', public.hoje() + 2);
select is((select proximo_contato_em from clientes where id = :'maria'), public.hoje() + 2, 'contato atualiza o próximo follow-up');
select throws_ok(format($$ update clientes set vendedor_id = %L where id = %L $$, :'v2', :'maria'), '42501', null, 'vendedor não passa o cliente para outro');
select throws_ok(format($$ update clientes set etapa = 'perdido' where id = %L $$, :'maria'), '23514', null, 'perdido exige motivo');
select pg_temp.sair();

select is((select count(*)::int from acessos_dados_pessoais where registro_id = :'maria' and usuario_id = :'v1'), 1, 'acesso ao CPF registrado (LGPD)');
select ok((select depois->>'cpf' = '***' from auditoria where tabela = 'clientes_dados_pessoais' and acao = 'INSERT' and registro_id = :'maria'), 'auditoria não guarda o CPF');

-- Vendedor 2 não vê o cliente do vendedor 1
select pg_temp.logar(:'v2');
select is((select count(*)::int from clientes where id = :'maria'), 0, 'vendedor não vê cliente de outro');
select is((select count(*)::int from clientes_contatos where cliente_id = :'maria'), 0, 'nem os contatos');
select is((select count(*)::int from clientes_dados_pessoais where cliente_id = :'maria'), 0, 'nem os dados pessoais');
select throws_ok(format($$ select revelar_dado_pessoal(%L, 'cpf') $$, :'maria'), '42501', null, 'não revela CPF de cliente alheio');
select is((select primeiro_nome from cliente_existe('(37) 99999-0001')), 'Maria', 'antiduplicidade avisa que o telefone já existe');
select is((select cliente_id from cliente_existe('37999990001')), null::uuid, 'sem expor o id do cliente alheio');
update clientes set nome = 'Hack' where id = :'maria';
select pg_temp.sair();
select is((select nome from clientes where id = :'maria'), 'Maria Silva', 'vendedor não altera cliente alheio');

-- Gerente vê tudo e reatribui
select pg_temp.logar(:'gerente');
select is((select count(*)::int from clientes where id = :'maria'), 1, 'gerente vê todos os clientes');
select lives_ok(format($$ update clientes set vendedor_id = %L where id = %L $$, :'v2', :'maria'), 'gerente reatribui');
select throws_ok(format($$ select anonimizar_cliente(%L) $$, :'maria'), '42501', null, 'só o dono anonimiza');
select pg_temp.sair();

select pg_temp.logar(:'dono');
select lives_ok(format($$ select anonimizar_cliente(%L) $$, :'maria'), 'dono anonimiza a pedido (LGPD)');
select pg_temp.sair();

select * from finish();
rollback;

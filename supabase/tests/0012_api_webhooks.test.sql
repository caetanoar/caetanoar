begin;
\ir _helpers.psql
select plan(19);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
select id as uno from veiculos where modelo = 'Uno' and criado_por is null \gset
delete from clientes where telefone = '37988887777' or whatsapp = '37988887777';

-- Chaves de API: só o dono, e o hash nunca é legível
select pg_temp.logar(:'dono');
insert into api_chaves (nome, prefixo, hash, escopos) values ('Site', 'ca_abc…', repeat('a', 64), array['estoque:ler', 'leads:criar']) returning id as chave \gset
select is((select nome from api_chaves where id = :'chave'), 'Site', 'dono cria e lista chaves');
select throws_ok($$ select hash from api_chaves $$, '42501', null, 'hash da chave não é legível');
select throws_ok($$ insert into api_chaves (nome, prefixo, hash, escopos) values ('X', 'x', repeat('b', 64), array['tudo']) $$, '23514', null, 'escopo desconhecido é recusado');
insert into webhooks (nome, url, eventos, segredo) values ('Site', 'https://exemplo.com.br/hook', array['veiculo.status_alterado', 'cliente.criado'], 'whsec_teste') returning id as hook \gset
select throws_ok($$ select segredo from webhooks $$, '42501', null, 'segredo do webhook não é legível');
select throws_ok($$ insert into webhooks (nome, url, eventos, segredo) values ('X', 'http://exemplo.com', array['venda.fechada'], 's') $$, '23514', null, 'webhook exige https');
select pg_temp.sair();

select pg_temp.logar(:'gerente');
select is((select count(*)::int from api_chaves), 0, 'gerente não vê chaves');
select is((select count(*)::int from webhooks), 0, 'gerente não vê webhooks');
select throws_ok(format($$ insert into api_chaves (nome, prefixo, hash, escopos) values ('G', 'g', %L, array['estoque:ler']) $$, repeat('c', 64)), '42501', null, 'gerente não cria chave');

-- Evento: mudar a situação do carro gera a entrega para o webhook inscrito
update veiculos set status = case when status = 'reservado' then 'disponivel'::status_veiculo else 'reservado'::status_veiculo end where id = :'uno';
select pg_temp.sair();
select is((select count(*)::int from webhook_entregas where webhook_id = :'hook' and evento_tipo = 'veiculo.status_alterado'), 1, 'mudança de situação vira notificação');
select ok((select payload ? 'preco_minimo' or payload ? 'valor_compra' from eventos_saida where tipo = 'veiculo.status_alterado' order by id desc limit 1) is false, 'evento não leva dados sigilosos');

select pg_temp.logar(:'v1');
select is((select count(*)::int from webhook_entregas), 0, 'vendedor não vê notificações');
select throws_ok($$ select * from webhooks_reservar(10) $$, '42501', null, 'só o servidor reserva entregas');
select throws_ok($$ select api_registrar_lead('x', '{}') $$, '42501', null, 'só o servidor registra lead da API');
select pg_temp.sair();

-- Servidor (chave de serviço): reserva, registra falha (reenvio) e sucesso
set local role service_role;
select is((select count(*)::int from webhooks_reservar(10) where webhook_id = :'hook'), 1, 'servidor reserva a entrega pendente');
select webhooks_registrar((select id from webhook_entregas where webhook_id = :'hook' limit 1), false, 500, 'HTTP 500');
select ok((select status = 'falhou' and tentativas = 1 and proxima_tentativa_em > now() from webhook_entregas where webhook_id = :'hook' limit 1), 'falha agenda nova tentativa');
select webhooks_registrar((select id from webhook_entregas where webhook_id = :'hook' limit 1), true, 200, null);
select ok((select status = 'entregue' and entregue_em is not null from webhook_entregas where webhook_id = :'hook' limit 1), 'sucesso marca como entregue');

-- Lead pela API: cria o cliente, depois só registra contato (sem duplicar); auditoria com o nome da chave
select is((api_registrar_lead('Site', '{"nome": "Lead API", "telefone": "+55 (37) 98888-7777", "mensagem": "Quero o Uno"}') ->> 'novo')::boolean, true, 'lead novo vira cliente');
select is((api_registrar_lead('Site', '{"nome": "Lead API", "telefone": "37988887777"}') ->> 'novo')::boolean, false, 'mesmo telefone não duplica o cliente');
reset role;
select is((select ator from auditoria where tabela = 'clientes' and acao = 'INSERT' order by criado_em desc limit 1), 'API: Site', 'auditoria registra a chave da API');

select * from finish();
rollback;

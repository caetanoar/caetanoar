begin;
\ir _helpers.psql
select plan(16);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('vend@t.com', 'vendedor') as vend \gset
select pg_temp.criar_usuario('inativo@t.com', 'vendedor', false) as inativo \gset

select is((select papel::text from usuarios where id = :'dono'), 'dono', 'perfil criado automaticamente com papel do app_metadata');

-- Vendedor: lê configurações, não altera
select pg_temp.logar(:'vend');
select is((select count(*)::int from configuracoes), 1, 'vendedor lê configurações');
update configuracoes set nome_loja = 'Hack';
select pg_temp.sair();
select is((select nome_loja from configuracoes), 'Caetano Auto', 'vendedor não altera configurações');

-- Gerente: não altera configurações nem papéis
select pg_temp.logar(:'gerente');
update configuracoes set garantia_dias_padrao = 30;
update usuarios set papel = 'dono' where id = :'gerente';
select is((select count(*)::int from auditoria), 0, 'gerente não lê auditoria');
select pg_temp.sair();
select is((select garantia_dias_padrao from configuracoes), 90, 'gerente não altera configurações');
select is((select papel::text from usuarios where id = :'gerente'), 'gerente', 'gerente não se promove a dono');

-- Dono: altera configurações e isso fica auditado
select pg_temp.logar(:'dono');
update configuracoes set alerta_garantia_dias = 20;
select is((select alerta_garantia_dias from configuracoes), 20, 'dono altera configurações');
select ok((select count(*) > 0 from auditoria where tabela = 'configuracoes' and acao = 'UPDATE'
           and usuario_id = :'dono' and 'alerta_garantia_dias' = any(campos_alterados)), 'alteração auditada com usuário e campo');
select is((select atualizado_por from configuracoes), :'dono'::uuid, 'carimbo atualizado_por');

-- Ninguém altera ou apaga a auditoria (nem o dono)
select throws_ok($$ update auditoria set ator = 'x' $$, '42501', null, 'dono não altera auditoria');
select throws_ok($$ delete from auditoria $$, '42501', null, 'dono não apaga auditoria');
select pg_temp.sair();

-- Inativo não vê nada
select pg_temp.logar(:'inativo');
select is((select count(*)::int from usuarios), 0, 'inativo não vê usuários');
select is((select count(*)::int from configuracoes), 0, 'inativo não vê configurações');
select pg_temp.sair();

-- Anônimo não acessa tabelas
select pg_temp.anonimo();
select throws_ok($$ select * from usuarios $$, '42501', null, 'anônimo sem acesso a usuários');
select pg_temp.sair();

-- Último dono ativo não pode ser rebaixado (os donos do seed + o de teste)
update usuarios set papel = 'gerente' where papel = 'dono' and id <> :'dono';
select throws_ok(format($$ update usuarios set papel = 'vendedor' where id = %L $$, :'dono'), 'P0001', null, 'protege o último dono');
select pg_temp.logar(:'dono');
select lives_ok($$ select atualizar_meu_perfil('Dono Novo', '37999990000') $$, 'atualiza o próprio perfil');
select pg_temp.sair();

select * from finish();
rollback;

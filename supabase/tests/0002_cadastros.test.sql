begin;
\ir _helpers.psql
select plan(12);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('vend@t.com', 'vendedor') as vend \gset

-- Gerente cadastra fornecedor, consignante e parceiro
select pg_temp.logar(:'gerente');
select lives_ok($$ insert into fornecedores (tipo, nome, documento) values ('locadora', 'Localiza', '16670085000155') $$, 'gerente cadastra fornecedor');
select lives_ok($$ insert into consignantes (nome, telefone) values ('Consignante Teste', '37999990000') $$, 'gerente cadastra consignante');
select lives_ok($$ insert into parceiros (nome) values ('João Indicações') $$, 'gerente cadastra parceiro');
select throws_ok($$ insert into fornecedores (tipo, nome, documento) values ('lojista', 'Outro', '16670085000155') $$, '23505', null, 'documento único');
select throws_ok($$ insert into fornecedores (tipo, nome, documento) values ('lojista', 'Ruim', '123') $$, '23514', null, 'documento precisa ter 11 ou 14 dígitos');
select is((select criado_por from fornecedores where nome = 'Localiza'), :'gerente'::uuid, 'carimbo criado_por');
select pg_temp.sair();

-- Vendedor não vê nem cadastra
select pg_temp.logar(:'vend');
select is((select count(*)::int from fornecedores), 0, 'vendedor não vê fornecedores');
select is((select count(*)::int from consignantes), 0, 'vendedor não vê consignantes');
select is((select count(*)::int from parceiros), 0, 'vendedor não vê parceiros');
select throws_ok($$ insert into consignantes (nome) values ('X') $$, '42501', null, 'vendedor não cadastra consignante');
select pg_temp.sair();

-- Dono vê tudo e a criação foi auditada
select pg_temp.logar(:'dono');
select is((select count(*)::int from consignantes where nome = 'Consignante Teste'), 1, 'dono vê consignantes');
select ok(exists(select 1 from auditoria where tabela = 'fornecedores' and acao = 'INSERT' and usuario_id = :'gerente'), 'criação auditada');
select pg_temp.sair();

select * from finish();
rollback;

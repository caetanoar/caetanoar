begin;
\ir _helpers.psql
select plan(7);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('vend@t.com', 'vendedor') as vend \gset

select pg_temp.logar(:'gerente');
select lives_ok($$ insert into notas_fiscais (direcao, origem, status, chave_acesso, valor_total) values ('entrada', 'xml_importado', 'importada', '31261116670085000155550010000012341000012345', 85000) $$, 'gerente registra nota');
select throws_ok($$ insert into notas_fiscais (direcao, origem, status, chave_acesso) values ('entrada', 'xml_importado', 'importada', '31261116670085000155550010000012341000012345') $$, '23505', null, 'chave de acesso única');
select throws_ok($$ insert into notas_fiscais (direcao, origem, status, chave_acesso) values ('entrada', 'manual', 'importada', '123') $$, '23514', null, 'chave com 44 dígitos');
update configuracoes_fiscais set cnpj = '11222333000181';
select is((select count(*)::int from configuracoes_fiscais where cnpj is not null), 0, 'gerente não altera configuração fiscal');
select pg_temp.sair();

select pg_temp.logar(:'dono');
update configuracoes_fiscais set cnpj = '11222333000181', regime_tributario = 'simples_nacional';
select is((select cnpj from configuracoes_fiscais), '11222333000181', 'dono altera configuração fiscal');
select pg_temp.sair();

select pg_temp.logar(:'vend');
select is((select count(*)::int from notas_fiscais), 0, 'vendedor não vê notas');
select is((select count(*)::int from configuracoes_fiscais), 0, 'vendedor não vê configuração fiscal');
select pg_temp.sair();

select * from finish();
rollback;

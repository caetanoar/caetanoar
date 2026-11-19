begin;
\ir _helpers.psql
select plan(24);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('vend@t.com', 'vendedor') as vend \gset

-- Dados iniciais: 4 consignados
select is((select count(*)::int from veiculos where tipo = 'consignado' and criado_por is null and modelo in ('T-Cross','Ka','Uno','HB20S')), 4, 'carga inicial tem 4 consignados');
delete from veiculos where placa = 'ABC1D23';
select count(*) + 1 as total_veiculos from veiculos \gset
select is((select count(*)::int from veiculo_historico where descricao ilike '%para-choques%'), 1, 'histórico do Ka cadastrado');

-- Gerente cria carro próprio com dados sigilosos (atômico)
select pg_temp.logar(:'gerente');
insert into fornecedores (tipo, nome) values ('locadora', 'Localiza') returning id as forn \gset
select salvar_veiculo(null,
  jsonb_build_object('tipo','proprio','origem','compra','status','em_preparacao','marca','Chevrolet','modelo','Onix','placa','ABC1D23','preco_anunciado',80000,'preco_negociavel',76000),
  jsonb_build_object('valor_compra',60000,'fornecedor_id', :'forn','preco_minimo',74000)) as onix \gset
select is((select valor_compra from veiculos_sigilo where veiculo_id = :'onix'), 60000.00, 'sigilo gravado junto');
insert into custos_veiculo (veiculo_id, tipo, valor) values (:'onix', 'funilaria', 1500), (:'onix', 'lavagem', 100);
select is((select custo_total from v_veiculos_gestao where id = :'onix'), 61600.00, 'custo total = compra + custos');
select is((select margem_prevista from v_veiculos_gestao where id = :'onix'), 18400.00, 'margem prevista');
select throws_ok($$ select salvar_veiculo(null, '{"tipo":"proprio","marca":"Fiat","modelo":"Argo","placa":"ABC1D23"}'::jsonb) $$, '23505', null, 'placa repetida em estoque ativo');
select throws_ok($$ select salvar_veiculo(null, '{"tipo":"proprio","marca":"Fiat","modelo":"Argo","preco_anunciado":50000,"preco_negociavel":60000}'::jsonb) $$, '23514', null, 'negociável não pode passar do anunciado');
select throws_ok(format($$ update veiculos set status = 'devolvido' where id = %L $$, :'onix'), '23514', null, 'próprio não pode ser devolvido');
select throws_ok(format($$ insert into consignacoes (veiculo_id, consignante_id) select %L, id from consignantes limit 1 $$, :'onix'), 'P0001', null, 'consignação só para consignado');
select pg_temp.sair();

-- Vendedor vê o veículo, mas não o sigilo, custos, consignação nem a visão de gestão
select pg_temp.logar(:'vend');
select is((select count(*)::int from veiculos), :'total_veiculos'::int, 'vendedor vê os veículos');
select is((select preco_negociavel from veiculos where id = :'onix'), 76000.00, 'vendedor vê o valor negociável');
select is((select count(*)::int from veiculos_sigilo), 0, 'vendedor não vê dados sigilosos');
select is((select count(*)::int from custos_veiculo), 0, 'vendedor não vê custos');
select is((select count(*)::int from consignacoes), 0, 'vendedor não vê consignações');
select is((select count(*)::int from v_veiculos_gestao), 0, 'vendedor não vê a visão de gestão');
select is((select count(*)::int from v_veiculos), :'total_veiculos'::int, 'vendedor usa a visão pública');
select throws_ok($$ select salvar_veiculo(null, '{"tipo":"proprio","marca":"Fiat","modelo":"Mobi"}'::jsonb) $$, '42501', null, 'vendedor não cadastra veículo');
update veiculos set preco_anunciado = 1 where id = :'onix';
select throws_ok(format($$ select alterar_status_veiculo(%L, 'disponivel') $$, :'onix'), '42501', null, 'vendedor não altera status');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('fotos-veiculos', 'x/y.jpg') $$, '42501', null, 'vendedor não envia fotos');
select pg_temp.sair();
select is((select preco_anunciado from veiculos where id = :'onix'), 80000.00, 'vendedor não altera preço');

-- Pendências do cadastro dos consignados
select pg_temp.logar(:'dono');
select ok((select pendencias @> array['placa', 'contrato de consignação', 'valor mínimo do dono', 'prazo do contrato']
             from v_veiculos_gestao where modelo = 'T-Cross'), 'pendências do T-Cross listadas');

-- Devolução ao dono fecha a consignação e não volta sem nova consignação
select id as tcross from veiculos where modelo = 'T-Cross' \gset
select lives_ok(format($$ select alterar_status_veiculo(%L, 'devolvido', 'Dono pediu de volta') $$, :'tcross'), 'devolve consignado');
select is((select status::text from consignacoes where veiculo_id = :'tcross'), 'devolvido', 'consignação encerrada');
select throws_ok(format($$ select alterar_status_veiculo(%L, 'disponivel') $$, :'tcross'), 'P0001', null, 'devolvido não volta sem nova consignação');
select pg_temp.sair();

select * from finish();
rollback;

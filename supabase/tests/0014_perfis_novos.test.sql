begin;
\ir _helpers.psql
select plan(32);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
select pg_temp.criar_usuario('v2@t.com', 'vendedor') as v2 \gset
select pg_temp.criar_usuario('atend@t.com', 'atendimento') as atend \gset
select pg_temp.criar_usuario('prep@t.com', 'preparador') as prep \gset
select pg_temp.criar_usuario('adm@t.com', 'administrativo') as adm \gset
select id as edley from consignantes where nome = 'Edley' \gset
delete from clientes_dados_pessoais where cpf = '11144477735';

-- Venda fechada de um consignado de teste (fluxo normal) e um carro próprio em preparação
insert into veiculos (tipo, origem, status, marca, modelo, ano_modelo, preco_anunciado) values ('consignado', 'consignacao', 'disponivel', 'Chevrolet', 'Celta', 2012, 25000) returning id as celta \gset
insert into consignacoes (veiculo_id, consignante_id) values (:'celta', :'edley');
insert into veiculos (tipo, origem, status, marca, modelo, ano_modelo) values ('proprio', 'compra', 'em_preparacao', 'Fiat', 'Mobi', 2020) returning id as mobi \gset

select pg_temp.logar(:'v1');
insert into clientes (nome, telefone, vendedor_id) values ('Comprador Perfis', '37966665555', :'v1') returning id as comprador \gset
insert into clientes_dados_pessoais (cliente_id, cpf) values (:'comprador', '11144477735');
select salvar_venda(null,
  jsonb_build_object('veiculo_id', :'celta', 'cliente_id', :'comprador', 'vendedor_id', :'v1', 'valor_venda', 25000),
  jsonb_build_array(jsonb_build_object('forma', 'pix', 'valor', 25000)), '[]'::jsonb) as venda \gset
select pg_temp.sair();
select pg_temp.logar(:'v2');
insert into clientes (nome, telefone, vendedor_id) values ('Outro Perfis', '37966664444', :'v2') returning id as outro \gset
select pg_temp.sair();
select pg_temp.logar(:'gerente');
delete from regras_comissao;
select fechar_venda(:'venda', '{"loja": 2500, "vendedor": 250}');
insert into custos_veiculo (veiculo_id, tipo, valor, descricao) values (:'mobi', 'mecanica', 800, 'Custo do gerente');
select pg_temp.sair();

-- ---------------------------------------------------------------- Atendimento
select pg_temp.logar(:'atend');
select is((select count(*)::int from clientes where id in (:'comprador', :'outro')), 2, 'atendimento vê todos os clientes');
select lives_ok(format($$ update clientes set telefone = '37966665556' where id = %L $$, :'comprador'), 'atendimento atualiza contato do cliente');
select throws_ok(format($$ update clientes set vendedor_id = %L where id = %L $$, :'v2', :'comprador'), '42501', null, 'atendimento não troca o vendedor do cliente');
select throws_ok(format($$ select revelar_dado_pessoal(%L, 'cpf') $$, :'comprador'), '42501', null, 'atendimento não revela CPF');
select is((select count(*)::int from v_garantias where venda_id = :'venda'), 1, 'atendimento vê a garantia');
select isnt((select venda_numero from v_garantias where venda_id = :'venda'), null, 'garantia mostra o número da venda ao atendimento');
select lives_ok(format($$ insert into garantias_acionamentos (garantia_id, descricao, custo) select id, 'Barulho na suspensão', 500 from garantias where venda_id = %L $$, :'venda'),
  'atendimento registra acionamento com custo');
select is((select (select count(*) from lancamentos) + (select count(*) from vendas) + (select count(*) from custos_veiculo))::int, 0,
  'atendimento não vê financeiro, vendas nem custos');
select pg_temp.sair();
select ok((select lancamento_id is not null from garantias_acionamentos a join garantias g on g.id = a.garantia_id where g.venda_id = :'venda'),
  'custo do acionamento virou conta a pagar');

-- ---------------------------------------------------------------- Preparador
select pg_temp.logar(:'prep');
select is((select count(*)::int from checklist_itens where veiculo_id = :'mobi' and tipo = 'preparacao'), 7, 'checklist de preparação criado ao entrar em preparação');
select is((select count(*)::int from custos_veiculo where veiculo_id = :'mobi'), 0, 'preparador não vê custos de outros');
select lives_ok(format($$ select lancar_custo_preparador(%L, 'lavagem', 120, 'Lavagem completa') $$, :'mobi'), 'preparador lança custo');
select is((select count(*)::int from custos_veiculo where veiculo_id = :'mobi'), 1, 'preparador vê só o custo que lançou');
select throws_ok(format($$ select lancar_custo_preparador(%L, 'lavagem', 50) $$, :'celta'), 'P0001', null, 'custo só em carro em preparação');
update checklist_itens set feito = true where veiculo_id = :'mobi' and item = 'Lavagem';
select is((select feito_por from checklist_itens where veiculo_id = :'mobi' and item = 'Lavagem'), :'prep'::uuid, 'item marcado registra quem fez');
select is((select (select count(*) from clientes) + (select count(*) from veiculos_sigilo) + (select count(*) from lancamentos))::int, 0,
  'preparador não vê clientes, compra nem financeiro');
select is((select count(*)::int from checklist_itens where tipo = 'documentacao'), 0, 'preparador não vê a documentação das vendas');
select pg_temp.sair();
select ok((select count(*) = 1 from lancamentos l join custos_veiculo c on c.id = l.custo_veiculo_id where c.veiculo_id = :'mobi' and c.descricao = 'Lavagem completa'),
  'custo do preparador gerou conta a pagar');

-- ---------------------------------------------------------------- Administrativo
select pg_temp.logar(:'adm');
select is((select count(*)::int from vendas where id = :'venda'), 1, 'administrativo vê a venda fechada');
select is((select count(*)::int from vendas where status <> 'fechada'), 0, 'administrativo não vê vendas em aberto');
select is((select count(*)::int from clientes where id in (:'comprador', :'outro')), 1, 'administrativo vê só o cliente que comprou');
select is(revelar_dado_pessoal(:'comprador', 'cpf', 'ATPV-e'), '11144477735', 'administrativo revela o CPF do comprador (com log)');
select throws_ok(format($$ select revelar_dado_pessoal(%L, 'cpf') $$, :'outro'), '42501', null, 'administrativo não revela CPF de quem não comprou');
select is((select count(*)::int from checklist_itens where venda_id = :'venda' and tipo = 'documentacao'), 5, 'checklist de transferência criado ao fechar a venda');
select is((select (select count(*) from custos_veiculo) + (select count(*) from comissoes) + (select count(*) from lancamentos))::int, 0,
  'administrativo não vê custos, comissões nem financeiro');
select ok(pode_anexar_venda(:'venda'), 'administrativo anexa documentos à venda fechada');
select pg_temp.sair();

-- ---------------------------------------------------------------- Tarefas e modelos
select pg_temp.logar(:'v1');
select lives_ok(format($$ insert into tarefas (titulo, responsavel_id, prazo) values ('Ligar para o cliente', %L, public.hoje() + 1) $$, :'v1'), 'vendedor cria tarefa para si');
select throws_ok(format($$ insert into tarefas (titulo, responsavel_id) values ('Tarefa do colega', %L) $$, :'v2'), '42501', null, 'vendedor não atribui tarefa a outro');
update tarefas set status = 'concluida' where titulo = 'Ligar para o cliente';
select is((select concluida_por from tarefas where titulo = 'Ligar para o cliente'), :'v1'::uuid, 'conclusão registra quem concluiu');
select ok(not pode_anexar_venda(:'venda'), 'vendedor não anexa à venda já fechada');
select pg_temp.sair();

select pg_temp.logar(:'v2');
select is((select count(*)::int from tarefas where titulo = 'Ligar para o cliente'), 0, 'outro vendedor não vê a tarefa');
select pg_temp.sair();

select pg_temp.logar(:'gerente');
select throws_ok($$ insert into checklist_modelos (tipo, item) values ('preparacao', 'Higienização') $$, '42501', null, 'gerente não altera os modelos de checklist');
select pg_temp.sair();

select * from finish();
rollback;

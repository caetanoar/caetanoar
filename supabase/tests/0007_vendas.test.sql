begin;
\ir _helpers.psql
select plan(40);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
select pg_temp.criar_usuario('v2@t.com', 'vendedor') as v2 \gset

select id as ka from veiculos where modelo = 'Ka' and criado_por is null \gset
select id as hb20 from veiculos where modelo = 'HB20S' and criado_por is null \gset
select id as ellerson from consignantes where nome = 'Ellerson' \gset
-- Isola de dados de testes anteriores
delete from regras_comissao;

-- ---------------------------------------------------------------------------
-- Regras de comissão: só o dono configura
-- ---------------------------------------------------------------------------
select pg_temp.logar(:'gerente');
select throws_ok($$ insert into regras_comissao (nome, tipo, modo, percentual) values ('x', 'vendedor', 'percentual', 10) $$, '42501', null, 'gerente não cria regra de comissão');
select pg_temp.sair();

select pg_temp.logar(:'dono');
insert into regras_comissao (nome, tipo, modo, percentual, piso, teto) values ('Loja consignado padrão', 'loja_consignado', 'percentual', 10, 3000, 8000);
insert into regras_comissao (nome, tipo, consignante_id, modo, valor_fixo) values ('Família Ellerson', 'loja_consignado', :'ellerson', 'fixo', 2000);
insert into regras_comissao (nome, tipo, aplica_a, modo, base, percentual) values ('Vendedor consignado', 'vendedor', 'consignado', 'percentual', 'comissao_loja', 10);
insert into regras_comissao (nome, tipo, aplica_a, modo, base, percentual) values ('Vendedor próprio', 'vendedor', 'proprio', 'percentual', 'lucro', 20);
insert into contas_financeiras (nome, tipo) values ('Banco vendas teste', 'banco') returning id as banco \gset
select throws_ok($$ insert into regras_comissao (nome, tipo, modo) values ('sem valor', 'vendedor', 'percentual') $$, '23514', null, 'regra exige percentual ou valor');
select pg_temp.sair();

-- ---------------------------------------------------------------------------
-- Vendedor registra a venda do Ka (consignado da família Ellerson) com troca
-- ---------------------------------------------------------------------------
select pg_temp.logar(:'v1');
insert into clientes (nome, telefone, vendedor_id) values ('Cliente Venda', '37988880000', :'v1') returning id as cli \gset
select salvar_venda(null,
  jsonb_build_object('veiculo_id', :'ka', 'cliente_id', :'cli', 'vendedor_id', :'v1', 'valor_venda', 42000, 'valor_entrada', 17000, 'recebimento_consignado', 'loja_repassa'),
  jsonb_build_array(
    jsonb_build_object('forma', 'pix', 'valor', 12000),
    jsonb_build_object('forma', 'financiamento', 'valor', 25000, 'banco_financiamento', 'BV', 'parcelas', 48)),
  jsonb_build_array(jsonb_build_object('marca', 'Volkswagen', 'modelo', 'Gol', 'ano_modelo', 2012, 'placa', 'GOL1A23', 'valor_avaliacao', 5000))
) as venda \gset
select is((select status::text from vendas where id = :'venda'), 'aguardando_aprovacao', 'venda do vendedor aguarda aprovação');
select is((select status::text from veiculos where id = :'ka'), 'reservado', 'carro fica reservado');
select throws_ok(format($$ select fechar_venda(%L) $$, :'venda'), '42501', null, 'vendedor não fecha venda');
select throws_ok(format($$ select calcular_venda(%L) $$, :'venda'), '42501', null, 'vendedor não vê simulação (lucro)');
select throws_ok(format($$ update vendas set status = 'fechada' where id = %L $$, :'venda'), 'P0001', null, 'status fechado só pela ação de fechar');
select pg_temp.sair();

select pg_temp.logar(:'v2');
select is((select count(*)::int from vendas where id = :'venda'), 0, 'outro vendedor não vê a venda');
select pg_temp.sair();

-- ---------------------------------------------------------------------------
-- Gerente simula e fecha
-- ---------------------------------------------------------------------------
select pg_temp.logar(:'gerente');
select calcular_venda(:'venda') as sim \gset
select is((:'sim'::jsonb -> 'comissao_loja' ->> 'valor')::numeric, 2000.00, 'regra da família Ellerson (fixo) vale sobre a padrão');
select is((:'sim'::jsonb -> 'comissao_vendedor' ->> 'valor')::numeric, 200.00, 'vendedor: 10% da comissão da loja');
select is((:'sim'::jsonb ->> 'repasse_consignante')::numeric, 40000.00, 'repasse = venda − comissão');
select is((:'sim'::jsonb ->> 'lucro')::numeric, 1800.00, 'lucro do consignado = comissão loja − comissão vendedor');
select is(jsonb_array_length(:'sim'::jsonb -> 'erros'), 0, 'simulação sem erros');

select lives_ok(format($$ select fechar_venda(%L) $$, :'venda'), 'gerente fecha a venda');
select is((select status::text from vendas where id = :'venda'), 'fechada', 'venda fechada');
select is((select status::text from veiculos where id = :'ka'), 'vendido', 'carro vendido');
select is((select status::text from consignacoes where veiculo_id = :'ka'), 'vendido', 'consignação encerrada como vendida');
select is((select etapa::text from clientes where id = :'cli'), 'ganho', 'cliente ganho');

-- Troca entrou como carro próprio em preparação
select veiculo_id as gol from vendas_trocas where venda_id = :'venda' \gset
select is((select tipo::text || '/' || status::text || '/' || origem::text from veiculos where id = :'gol'), 'proprio/em_preparacao/troca', 'troca entra como próprio em preparação');
select is((select valor_compra from veiculos_sigilo where veiculo_id = :'gol'), 5000.00, 'custo do carro da troca = avaliação');

-- Comissões
select is((select count(*)::int from comissoes where venda_id = :'venda'), 2, 'gera comissão da loja e do vendedor');
select is((select status::text from comissoes where venda_id = :'venda' and tipo = 'loja_consignado'), 'quitada', 'comissão da loja retida do repasse');
select is((select valor from comissoes where venda_id = :'venda' and tipo = 'vendedor'), 200.00, 'comissão do vendedor registrada');

-- Garantia de 90 dias
select is((select dias from garantias where venda_id = :'venda'), 90, 'garantia padrão de 90 dias');
select is((select status from v_garantias where venda_id = :'venda'), 'ativa', 'garantia ativa');

-- Financeiro
select is((select count(*)::int from lancamentos where venda_id = :'venda' and tipo = 'receita' and forma_pagamento in ('pix', 'financiamento') and status = 'pendente'), 2, 'recebimentos pendentes (pix e financiamento)');
select is((select valor from lancamentos where venda_id = :'venda' and categoria_id = categoria_sistema('repasse_consignante')), 40000.00, 'repasse a pagar ao consignante');
select is((select count(*)::int from lancamentos where venda_id = :'venda' and forma_pagamento = 'permuta'), 2, 'troca registrada como permuta (entrada e compra)');
select is((select lucro from v_lucro_vendas_calc where venda_id = :'venda'), 1800.00, 'lucro da venda na visão gerencial');

-- Vendedor paga a comissão → quitada; vendedor vê só o valor
select id as lanc_com from lancamentos where venda_id = :'venda' and categoria_id = categoria_sistema('comissao_vendedor') \gset
select baixar_lancamento(:'lanc_com', public.hoje(), :'banco');
select is((select status::text from comissoes where lancamento_id = :'lanc_com'), 'quitada', 'pagar o lançamento quita a comissão');
select pg_temp.sair();

select pg_temp.logar(:'v1');
select is((select valor from minhas_comissoes() where venda_id = :'venda'), 200.00, 'vendedor vê a própria comissão');
select is((select count(*)::int from comissoes), 0, 'vendedor não lê a tabela de comissões (base revelaria lucro)');
select is((select count(*)::int from v_lucro_vendas_calc), 0, 'vendedor não vê lucro');
select pg_temp.sair();

-- Cancelamento: bloqueado com pagamento baixado; depois do estorno, desfaz tudo
select pg_temp.logar(:'gerente');
select throws_ok(format($$ select cancelar_venda(%L, 'Cliente desistiu') $$, :'venda'), 'P0001', null, 'não cancela com pagamento baixado');
select estornar_baixa(:'lanc_com');
select lives_ok(format($$ select cancelar_venda(%L, 'Cliente desistiu') $$, :'venda'), 'cancela depois do estorno');
select is((select status::text from veiculos where id = :'ka'), 'disponivel', 'carro volta a disponível');
select is((select count(*)::int from veiculos where id = :'gol'), 0, 'carro da troca sai do estoque');
select is((select count(*)::int from lancamentos where venda_id = :'venda'), 0, 'lançamentos da venda removidos');

-- Consignado com pagamento direto ao dono: comissão a receber com piso/teto
select id as cli2 from clientes where id = :'cli' \gset
select salvar_venda(null,
  jsonb_build_object('veiculo_id', :'hb20', 'cliente_id', :'cli2', 'vendedor_id', :'v1', 'valor_venda', 96900, 'recebimento_consignado', 'direto_dono'),
  jsonb_build_array(jsonb_build_object('forma', 'ted', 'valor', 96900)), '[]'::jsonb) as venda2 \gset
select fechar_venda(:'venda2') as res2 \gset
select is((:'res2'::jsonb -> 'comissao_loja' ->> 'valor')::numeric, 8000.00, 'teto da regra padrão aplicado (10% de 96.900 → 8.000)');
select is((select count(*)::int from lancamentos where venda_id = :'venda2' and categoria_id = categoria_sistema('comissao_consignacao') and status = 'pendente'), 1, 'comissão a receber do consignante');
select pg_temp.sair();

select * from finish();
rollback;

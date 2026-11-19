begin;
\ir _helpers.psql
select plan(10);

select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
select id as edley from consignantes where nome = 'Edley' \gset

-- Padrões escolhidos pelo dono
select is((select recebimento_consignado_padrao from configuracoes), 'direto_dono', 'padrão: comprador paga direto ao dono');
select ok((select garantia_cobertura_padrao like 'Garantia de 90 dias%' and garantia_cobertura_padrao like '%Código de Defesa do Consumidor%' from configuracoes),
  'texto padrão da garantia preenchido, sem excluir o CDC');

-- Consignado de teste
insert into veiculos (tipo, origem, status, marca, modelo, ano_modelo, preco_anunciado) values ('consignado', 'consignacao', 'disponivel', 'Chevrolet', 'Prisma', 2016, 30000) returning id as carro \gset
insert into consignacoes (veiculo_id, consignante_id) values (:'carro', :'edley');

-- Vendedor registra com pix + carro na troca, sem escolher o modo
select pg_temp.logar(:'v1');
insert into clientes (nome, telefone, vendedor_id) values ('Comprador Direto', '37977776666', :'v1') returning id as cli \gset
select salvar_venda(null,
  jsonb_build_object('veiculo_id', :'carro', 'cliente_id', :'cli', 'vendedor_id', :'v1', 'valor_venda', 30000),
  jsonb_build_array(jsonb_build_object('forma', 'pix', 'valor', 20000)),
  jsonb_build_array(jsonb_build_object('marca', 'Fiat', 'modelo', 'Palio', 'ano_modelo', 2010, 'placa', 'PAL1O10', 'valor_avaliacao', 10000))
) as venda \gset
select is((select garantia_cobertura from vendas where id = :'venda'), (select garantia_cobertura_padrao from configuracoes), 'venda nasce com a cobertura padrão');
select pg_temp.sair();

-- Gerente fecha (valores de comissão informados manualmente: o dono ainda não definiu as regras)
select pg_temp.logar(:'gerente');
delete from regras_comissao;
select is((calcular_venda(:'venda', '{"loja": 3000, "vendedor": 300}') -> 'erros'), '[]'::jsonb, 'troca no modo direto ao dono não bloqueia mais');
select fechar_venda(:'venda', '{"loja": 3000, "vendedor": 300}');
select is((select recebimento_consignado::text from vendas where id = :'venda'), 'direto_dono', 'venda registra o modo usado');
select is((select count(*)::int from lancamentos where venda_id = :'venda' and tipo = 'receita' and forma_pagamento = 'pix'), 0, 'pix do comprador não entra no caixa da loja (foi ao dono)');
select is((select valor from lancamentos where venda_id = :'venda' and descricao like 'Comissão de consignação%' and status = 'pendente'), 3000.00, 'comissão a receber do dono');
select is((select valor from lancamentos where venda_id = :'venda' and descricao like 'Repasse ao dono — carro da troca%' and status = 'pendente'), 10000.00, 'loja deve ao dono o valor do carro da troca');
select is((select status::text from comissoes where venda_id = :'venda' and tipo = 'loja_consignado'), 'pendente', 'comissão da loja fica pendente até o dono pagar');
select ok(exists (select 1 from veiculos v join vendas_trocas t on t.veiculo_id = v.id where t.venda_id = :'venda' and v.tipo = 'proprio' and v.status = 'em_preparacao'),
  'carro da troca entra no estoque como próprio em preparação');
select pg_temp.sair();

select * from finish();
rollback;

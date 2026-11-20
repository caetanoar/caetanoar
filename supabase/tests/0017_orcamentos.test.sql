begin;
\ir _helpers.psql
select plan(29);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
select pg_temp.criar_usuario('v2@t.com', 'vendedor') as v2 \gset
update configuracoes set desconto_limites = '{}', orcamento_validade_dias = null, financiamento_taxas = '[]', consulta_limite_mensal_qtd = null, consulta_limite_mensal_valor = null;
delete from veiculos where placa = 'ORC1A25';
insert into veiculos (tipo, origem, status, marca, modelo, placa, preco_anunciado, preco_negociavel) values ('proprio', 'compra', 'disponivel', 'Fiat', 'Argo', 'ORC1A25', 50000, 48000) returning id as carro \gset
insert into veiculos_sigilo (veiculo_id, valor_compra, preco_minimo) values (:'carro', 40000, 47000);
insert into veiculo_historico (veiculo_id, tipo, descricao) values (:'carro', 'pintura', 'Para-choque traseiro repintado');

select pg_temp.logar(:'v1');
select registrar_consulta('{"placa": "ORC1A25", "provedor": "Simulado", "simulado": true, "status": "encontrado", "selo": "amarelo",
  "verificacoes": {"leilao": {"estado": "encontrado", "detalhe": "lote 42"}, "roubo_furto": {"estado": "nada_encontrado"}}}');
insert into clientes (nome, telefone, vendedor_id) values ('Cliente Orçamento', '37955554444', :'v1') returning id as cli \gset

-- Regra de desconto: vendedor vai até o valor negociável; nunca vê o mínimo
select is(avaliar_desconto(:'carro', 49000), 'dentro', 'vendedor dentro do valor negociável');
select is(avaliar_desconto(:'carro', 47500), 'fora', 'abaixo do negociável pede aprovação');
select pg_temp.sair();
update configuracoes set desconto_limites = '{"vendedor": 1}';
select pg_temp.logar(:'v1');
select is(avaliar_desconto(:'carro', 49000), 'fora', 'vale o limite mais restritivo (1% = R$ 49.500)');
select pg_temp.sair();
update configuracoes set desconto_limites = '{}';

select pg_temp.logar(:'v1');
select throws_ok(format($$ select salvar_orcamento(null, jsonb_build_object('veiculo_id', %L, 'cliente_id', %L, 'valor_final', 47500), '[]', '[]') $$, :'carro', :'cli'),
  'P0001', null, 'desconto fora do limite exige motivo');
select salvar_orcamento(null, jsonb_build_object('veiculo_id', :'carro', 'cliente_id', :'cli', 'valor_final', 47500, 'desconto_motivo', 'Cliente fecha hoje à vista'),
  '[{"forma": "pix", "valor": 40000}]', '[]') as orc \gset
select is((select desconto_status::text from orcamentos where id = :'orc'), 'aguardando_aprovacao', 'fica aguardando aprovação');
select is((select numero ~ '^O-\d{4}-\d{4}$' from orcamentos where id = :'orc'), true, 'numeração O-AAAA-NNNN');
select throws_ok(format($$ select enviar_orcamento(%L) $$, :'orc'), 'P0001', null, 'não envia com desconto aguardando aprovação');
select pg_temp.sair();

select pg_temp.logar(:'v2');
select is((select count(*)::int from orcamentos where id = :'orc'), 0, 'outro vendedor não vê o orçamento');
select pg_temp.sair();

select pg_temp.logar(:'gerente');
select is((select count(*)::int from tarefas where entidade_id = :'orc' and status = 'pendente'), 1, 'pedido de aprovação vira tarefa da gestão');
select throws_ok(format($$ select decidir_desconto(%L, true, '') $$, :'orc'), 'P0001', null, 'decisão exige motivo');
select lives_ok(format($$ select decidir_desconto(%L, true, 'Cliente antigo') $$, :'orc'), 'gerente aprova o desconto');
select pg_temp.sair();

select pg_temp.logar(:'v1');
select is((select desconto_status::text from orcamentos where id = :'orc'), 'aprovado', 'desconto aprovado');
select throws_ok(format($$ select enviar_orcamento(%L) $$, :'orc'), 'P0001', null, 'não envia sem validade');
update orcamentos set validade = public.hoje() + 7 where id = :'orc';
select throws_ok(format($$ select enviar_orcamento(%L) $$, :'orc'), 'P0001', null, 'não envia se pagamentos não fecham o valor');
select salvar_orcamento(:'orc', jsonb_build_object('veiculo_id', :'carro', 'cliente_id', :'cli', 'valor_final', 47500, 'validade', public.hoje() + 7, 'desconto_motivo', 'Cliente fecha hoje à vista'),
  '[{"forma": "pix", "valor": 37500}]', '[{"placa": "TRC1A23", "marca": "VW", "modelo": "Gol", "ano_modelo": 2012, "valor_avaliacao": 10000, "selo": "verde"}]');
select is((select desconto_status::text from orcamentos where id = :'orc'), 'aprovado', 'aprovação vale enquanto o valor não baixar');
select enviar_orcamento(:'orc') as token \gset
select ok((select alertas @> '[{"codigo": "leilao"}]' and alertas @> '[{"codigo": "historico_pintura"}]' and alertas @> '[{"codigo": "sem_laudo"}]' from orcamentos where id = :'orc'),
  'alertas do carro copiados no envio (leilão, repintura, sem laudo)');
select is((select count(*)::int from tarefas where entidade_id = :'orc' and origem = 'automatica' and responsavel_id = :'v1' and prazo in (public.hoje() + 2, public.hoje() + 5)), 2,
  'lembretes de 2 e 5 dias para o vendedor');
update orcamentos set valor_final = 1000 where id = :'orc';
select is((select valor_final from orcamentos where id = :'orc'), 47500.00, 'orçamento enviado não se edita');
select pg_temp.sair();

select pg_temp.anonimo();
select is((orcamento_publico(:'token') ->> 'numero') is not null, true, 'link público abre o orçamento sem login');
select is(orcamento_publico('token-errado-com-mais-de-20-caracteres'), null, 'token errado não abre nada');
select pg_temp.sair();

select pg_temp.logar(:'v1');
select lives_ok(format($$ select responder_orcamento(%L, true) $$, :'orc'), 'cliente aceitou');
select is((select count(*)::int from tarefas where chave_automatica like 'orcamento:' || :'orc' || ':%d' and status = 'cancelada'), 2, 'lembretes cancelados após a resposta');
select converter_orcamento_em_venda(:'orc') as venda \gset
select is((select valor_venda from vendas where id = :'venda'), 47500.00, 'orçamento aceito vira venda com o mesmo valor');
select is((select count(*)::int from vendas_trocas where venda_id = :'venda'), 1, 'carro da troca vai junto para a venda');
select throws_ok(format($$ select converter_orcamento_em_venda(%L) $$, :'orc'), 'P0001', null, 'não converte duas vezes');
select pg_temp.sair();

-- Desconto do próprio gerente (sem limite configurado) vai para o dono
select pg_temp.logar(:'gerente');
select salvar_orcamento(null, jsonb_build_object('veiculo_id', :'carro', 'cliente_id', :'cli', 'vendedor_id', :'gerente', 'valor_final', 49000, 'desconto_motivo', 'Teste'), '[]', '[]') as orc2 \gset
select throws_ok(format($$ select decidir_desconto(%L, true, 'eu mesmo') $$, :'orc2'), '42501', null, 'gerente não aprova o próprio desconto');
select pg_temp.sair();

-- Gerente aprova até o próprio limite e nunca abaixo do preço mínimo; além disso, só o dono
select pg_temp.logar(:'v1');
select salvar_orcamento(null, jsonb_build_object('veiculo_id', :'carro', 'cliente_id', :'cli', 'valor_final', 46000, 'desconto_motivo', 'Cliente pediu'), '[]', '[]') as orc3 \gset
select pg_temp.sair();
select pg_temp.logar(:'gerente');
select throws_ok(format($$ select decidir_desconto(%L, true, 'ok') $$, :'orc3'), '42501', null, 'gerente não aprova abaixo do preço mínimo');
select pg_temp.sair();
select pg_temp.logar(:'dono');
select lives_ok(format($$ select decidir_desconto(%L, true, 'Decisão do dono') $$, :'orc3'), 'dono aprova abaixo do preço mínimo');
select pg_temp.sair();
update configuracoes set desconto_limites = '{"gerente": 2}';
select pg_temp.logar(:'v1');
select salvar_orcamento(null, jsonb_build_object('veiculo_id', :'carro', 'cliente_id', :'cli', 'valor_final', 47500, 'desconto_motivo', 'Cliente pediu'), '[]', '[]') as orc4 \gset
select pg_temp.sair();
select pg_temp.logar(:'gerente');
select throws_ok(format($$ select decidir_desconto(%L, true, 'ok') $$, :'orc4'), '42501', null, 'gerente aprova só até o próprio limite (2%)');
select pg_temp.sair();
update configuracoes set desconto_limites = '{}';

select * from finish();
rollback;

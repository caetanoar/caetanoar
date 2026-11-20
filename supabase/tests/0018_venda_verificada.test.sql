begin;
\ir _helpers.psql
select plan(30);

select pg_temp.criar_usuario('dono@t.com', 'dono') as dono \gset
select pg_temp.criar_usuario('gerente@t.com', 'gerente') as gerente \gset
select pg_temp.criar_usuario('v1@t.com', 'vendedor') as v1 \gset
delete from consultas_veiculares where placa in ('VVA1A25', 'VVR1A27', 'VVP1A23');

-- Carro amarelo: leilão na consulta e sem laudo cautelar
insert into veiculos (tipo, origem, status, marca, modelo, placa, preco_anunciado) values ('proprio', 'compra', 'disponivel', 'Fiat', 'Argo', 'VVA1A25', 50000) returning id as amarelo \gset
insert into veiculos_sigilo (veiculo_id, valor_compra) values (:'amarelo', 40000);
-- Carro vermelho: roubo/furto na consulta
insert into veiculos (tipo, origem, status, marca, modelo, placa, preco_anunciado, laudo_cautelar, laudo_resultado) values ('proprio', 'compra', 'disponivel', 'VW', 'Gol', 'VVR1A27', 30000, true, 'aprovado') returning id as vermelho \gset
insert into veiculos_sigilo (veiculo_id, valor_compra) values (:'vermelho', 22000);
-- Carro com consulta antiga (mais de 7 dias)
insert into veiculos (tipo, origem, status, marca, modelo, placa, preco_anunciado, laudo_cautelar, laudo_resultado) values ('proprio', 'compra', 'disponivel', 'Ford', 'Ka', 'VVP1A23', 35000, true, 'aprovado') returning id as antigo \gset
insert into consultas_veiculares (placa, provedor, simulado, status, consultado_em, expira_em, usuario_id, verificacoes, selo)
values ('VVP1A23', 'Teste', true, 'encontrado', now() - interval '10 days', now() - interval '3 days', :'v1', '{"leilao": {"estado": "nada_encontrado"}}', 'verde');

select pg_temp.logar(:'v1');
select registrar_consulta('{"placa": "VVA1A25", "provedor": "Simulado", "simulado": true, "status": "encontrado", "selo": "amarelo",
  "verificacoes": {"leilao": {"estado": "encontrado", "detalhe": "lote 7"}, "roubo_furto": {"estado": "nada_encontrado"}}}');
select registrar_consulta('{"placa": "VVR1A27", "provedor": "Simulado", "simulado": true, "status": "encontrado", "selo": "vermelho",
  "verificacoes": {"roubo_furto": {"estado": "encontrado", "detalhe": "BO 123"}}}');
insert into clientes (nome, telefone, vendedor_id) values ('Comprador Verificado', '37900000018', :'v1') returning id as cli \gset

-- ===== Amarelo: ciência + Termo de Ciência assinado =====
select salvar_venda(null, jsonb_build_object('veiculo_id', :'amarelo', 'cliente_id', :'cli', 'valor_venda', 50000, 'status', 'aguardando_aprovacao'),
  '[{"forma": "pix", "valor": 50000}]', '[]') as va \gset
select is((select status::text from vendas where id = :'va'), 'rascunho', 'venda com alerta nasce como rascunho');
select is(verificacao_venda(:'va') ->> 'nivel', 'amarelo', 'verificação amarela');
select throws_ok(format($$ select enviar_venda_para_aprovacao(%L) $$, :'va'), 'P0001', null, 'não vai para aprovação sem a ciência do cliente');
select throws_ok(format($$ insert into vendas_ciencias (venda_id, alertas, declaracao) values (%L, '[{"codigo": "x"}]', 'eu') $$, :'va'),
  '42501', null, 'ciência só pela função (alertas vêm do banco)');
select lives_ok(format($$ select registrar_ciencia(%L) $$, :'va'), 'vendedor registra que informou o cliente');
select ok((select alertas @> '[{"codigo": "leilao"}]' and alertas @> '[{"codigo": "sem_laudo"}]' from vendas_ciencias where venda_id = :'va'),
  'ciência guarda todos os alertas (leilão e sem laudo)');
select lives_ok(format($$ select enviar_venda_para_aprovacao(%L) $$, :'va'), 'com a ciência, vai para aprovação');
select is((select count(*)::int from verificacoes_veiculo where venda_id = :'va' and momento = 'aprovacao'), 1, 'verificação registrada no envio');
select pg_temp.sair();

select pg_temp.logar(:'gerente');
select throws_like(format($$ select fechar_venda(%L, '{"vendedor": 0}') $$, :'va'), '%Termo de Ciência%', 'não fecha sem o Termo de Ciência assinado');
select pg_temp.sair();

select pg_temp.logar(:'v1');
select lives_ok(format($$ insert into arquivos (bucket, path, nome, entidade, entidade_id, categoria) values ('documentos', 'vendas/%s/termo.pdf', 'termo.pdf', 'venda', %L, 'termo_ciencia') $$, :'va', :'va'),
  'vendedor anexa o termo assinado');
select pg_temp.sair();

select pg_temp.logar(:'gerente');
select lives_ok(format($$ select fechar_venda(%L, '{"vendedor": 0}') $$, :'va'), 'com o termo, o gerente fecha');
select is((select status::text from vendas where id = :'va'), 'fechada', 'venda fechada');
select is((select count(*)::int from verificacoes_veiculo where venda_id = :'va' and momento = 'fechamento'), 1, 'verificação registrada no fechamento');
select pg_temp.sair();

-- ===== Vermelho: só o dono libera =====
select pg_temp.logar(:'v1');
select salvar_venda(null, jsonb_build_object('veiculo_id', :'vermelho', 'cliente_id', :'cli', 'valor_venda', 30000, 'status', 'aguardando_aprovacao'),
  '[{"forma": "pix", "valor": 30000}]', '[]') as vr \gset
select is((select status::text from vendas where id = :'vr'), 'rascunho', 'venda com impeditivo fica em rascunho');
select is(verificacao_venda(:'vr') ->> 'nivel', 'vermelho', 'verificação vermelha');
select lives_ok(format($$ select registrar_ciencia(%L) $$, :'vr'), 'cliente informado do impeditivo');
select throws_like(format($$ select enviar_venda_para_aprovacao(%L) $$, :'vr'), '%só o dono pode liberar%', 'impeditivo bloqueia o envio mesmo com ciência');
select pg_temp.sair();

select is((select u.papel::text from tarefas t join usuarios u on u.id = t.responsavel_id where t.chave_automatica = 'venda:' || :'vr' || ':bloqueio' and t.status = 'pendente'),
  'dono', 'impeditivo vira tarefa para o dono analisar');

select pg_temp.logar(:'gerente');
select throws_ok(format($$ select fechar_venda(%L, '{"vendedor": 0}') $$, :'vr'), 'P0001', null, 'gerente não fecha venda com impeditivo');
select throws_ok(format($$ select liberar_bloqueio(%L, 'Gerente tentando liberar a venda') $$, :'vr'), '42501', null, 'gerente não libera bloqueio');
select throws_ok(format($$ insert into liberacoes_bloqueio (venda_id, alertas, justificativa, liberado_por) values (%L, '[{"codigo": "roubo_furto"}]', 'Tentativa direta do gerente', %L) $$, :'vr', :'gerente'),
  '42501', null, 'RLS: só o dono grava liberação');
select pg_temp.sair();

select pg_temp.logar(:'dono');
select throws_ok(format($$ select liberar_bloqueio(%L, 'curta') $$, :'vr'), 'P0001', null, 'liberação exige justificativa escrita');
select lives_ok(format($$ select liberar_bloqueio(%L, 'BO baixado: carro recuperado e documentação regularizada no Detran') $$, :'vr'), 'dono libera com justificativa');
select throws_ok(format($$ update liberacoes_bloqueio set justificativa = 'alterada depois' where venda_id = %L $$, :'vr'), '42501', null, 'liberação não se altera nem pelo dono');
select pg_temp.sair();

select is((select status::text from tarefas where chave_automatica = 'venda:' || :'vr' || ':bloqueio'), 'concluida', 'tarefa do dono concluída na liberação');
select is((select count(*)::int from eventos_saida where tipo = 'venda.bloqueio_liberado' and payload ->> 'venda_id' = :'vr'), 1, 'evento de bloqueio liberado para webhooks');

select pg_temp.logar(:'v1');
select lives_ok(format($$ select enviar_venda_para_aprovacao(%L) $$, :'vr'), 'liberada pelo dono e com ciência, vai para aprovação');
-- Alerta novo depois da ciência (repintura registrada): precisa informar de novo
select pg_temp.sair();
insert into veiculo_historico (veiculo_id, tipo, descricao) values (:'vermelho', 'pintura', 'Porta dianteira repintada');
select pg_temp.logar(:'v1');
select is(jsonb_array_length(verificacao_venda(:'vr') -> 'sem_ciencia'), 1, 'alerta novo exige nova ciência');
select pg_temp.sair();

-- ===== Consulta antiga: pede nova consulta =====
select pg_temp.logar(:'v1');
select salvar_venda(null, jsonb_build_object('veiculo_id', :'antigo', 'cliente_id', :'cli', 'valor_venda', 35000, 'status', 'aguardando_aprovacao'),
  '[{"forma": "pix", "valor": 35000}]', '[]') as vp \gset
select ok((verificacao_venda(:'vp') -> 'bloqueios') @> '[{"codigo": "consulta_antiga"}]', 'consulta com mais de 7 dias bloqueia até nova consulta');
select registrar_consulta('{"placa": "VVP1A23", "provedor": "Simulado", "simulado": true, "status": "encontrado", "selo": "verde",
  "verificacoes": {"leilao": {"estado": "nada_encontrado"}, "roubo_furto": {"estado": "nada_encontrado"}}}');
select is((verificacao_venda(:'vp') -> 'alertas' -> 0 ->> 'descricao') ~ '^Nenhum registro encontrado na consulta de \d{2}/\d{2}/\d{4} \(Simulado\)$', true,
  'sem alertas: "nenhum registro encontrado na consulta de [data]"');
select pg_temp.sair();

select * from finish();
rollback;

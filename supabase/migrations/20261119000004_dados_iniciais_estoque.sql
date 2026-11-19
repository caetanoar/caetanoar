-- =============================================================================
-- Caetano Auto CRM — 0004 Dados iniciais: carros consignados atuais
-- Campos não informados ficam vazios e aparecem como "pendências do cadastro".
-- =============================================================================
do $$
declare
  v_ellerson uuid;
  v_edley uuid;
  v_filipy uuid;
  v_carro uuid;
begin
  perform set_config('app.ator', 'Carga inicial', true);

  insert into public.consignantes (nome) values ('Ellerson') returning id into v_ellerson;
  insert into public.consignantes (nome) values ('Edley') returning id into v_edley;
  insert into public.consignantes (nome) values ('Filipy') returning id into v_filipy;

  -- VW T-Cross 2025/26 200 TSI 1.0 Flex, branco, 40 mil km — R$ 129.999,90
  insert into public.veiculos (tipo, origem, status, marca, modelo, versao, motor, ano_fabricacao, ano_modelo, cor, km, combustivel, preco_anunciado)
  values ('consignado', 'consignacao', 'disponivel', 'Volkswagen', 'T-Cross', '200 TSI', '1.0 TSI', 2025, 2026, 'Branco', 40000, 'flex', 129999.90)
  returning id into v_carro;
  insert into public.veiculos_sigilo (veiculo_id) values (v_carro);
  insert into public.consignacoes (veiculo_id, consignante_id) values (v_carro, v_ellerson);

  -- Ford Ka 1.0 SE 2018/2018 Flex, branco — R$ 42.000,00; para-choques repintados; sem laudo cautelar
  insert into public.veiculos (tipo, origem, status, marca, modelo, versao, motor, ano_fabricacao, ano_modelo, cor, combustivel, preco_anunciado, laudo_cautelar)
  values ('consignado', 'consignacao', 'disponivel', 'Ford', 'Ka', 'SE', '1.0', 2018, 2018, 'Branco', 'flex', 42000.00, false)
  returning id into v_carro;
  insert into public.veiculos_sigilo (veiculo_id) values (v_carro);
  insert into public.consignacoes (veiculo_id, consignante_id) values (v_carro, v_ellerson);
  insert into public.veiculo_historico (veiculo_id, tipo, descricao, comprovado)
  values (v_carro, 'pintura', 'Para-choques dianteiro e traseiro repintados', true);

  -- Fiat Uno 1995 — R$ 45.999,90
  insert into public.veiculos (tipo, origem, status, marca, modelo, ano_modelo, preco_anunciado)
  values ('consignado', 'consignacao', 'disponivel', 'Fiat', 'Uno', 1995, 45999.90)
  returning id into v_carro;
  insert into public.veiculos_sigilo (veiculo_id) values (v_carro);
  insert into public.consignacoes (veiculo_id, consignante_id) values (v_carro, v_edley);

  -- Hyundai HB20S 2025 1.0 TGDI automático, branco — R$ 96.900,00
  insert into public.veiculos (tipo, origem, status, marca, modelo, motor, ano_modelo, cor, cambio, preco_anunciado)
  values ('consignado', 'consignacao', 'disponivel', 'Hyundai', 'HB20S', '1.0 TGDI', 2025, 'Branco', 'automatico', 96900.00)
  returning id into v_carro;
  insert into public.veiculos_sigilo (veiculo_id) values (v_carro);
  insert into public.consignacoes (veiculo_id, consignante_id) values (v_carro, v_filipy);
end
$$;

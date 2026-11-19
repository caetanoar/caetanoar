-- =============================================================================
-- Caetano Auto CRM — 0013 Decisões do dono
-- 1) Consignado: o comprador paga direto ao dono e a loja recebe a comissão
--    separada (padrão; pode ser trocado em cada venda).
-- 2) Texto padrão da cobertura da garantia (90 dias), se ainda não houver.
-- 3) Consignado com carro na troca também no modo "direto ao dono": o comprador
--    paga o dono, a loja fica com o carro da troca e lança o valor devido ao dono
--    (antes o sistema exigia "loja recebe e repassa" nesse caso).
-- =============================================================================

alter table public.configuracoes alter column recebimento_consignado_padrao set default 'direto_dono';
update public.configuracoes set recebimento_consignado_padrao = 'direto_dono';

update public.configuracoes
   set garantia_cobertura_padrao = $garantia$Garantia de 90 dias, contados da entrega do veículo, para defeitos de funcionamento no motor (partes internas lubrificadas), no câmbio e no diferencial que não tenham sido informados ao comprador na venda.

Não cobre: desgaste natural de uso (pneus, freios, embreagem, amortecedores, bateria, palhetas, lâmpadas, correias e filtros); itens de manutenção periódica; pintura, estética, acabamento e estofamento; som e acessórios; defeitos causados por mau uso, acidente, alagamento, superaquecimento, combustível adulterado ou falta de manutenção; e itens informados ao comprador ou apontados em laudo no ato da venda.

Para usar a garantia: avise a loja antes de qualquer conserto e leve o carro à oficina indicada por ela. Consertos feitos sem autorização da loja não são reembolsados. A garantia deixa de valer se o veículo for modificado ou tiver o hodômetro alterado.

Esta garantia não exclui os direitos previstos no Código de Defesa do Consumidor.$garantia$
 where garantia_cobertura_padrao is null or trim(garantia_cobertura_padrao) = '';

comment on column public.configuracoes.garantia_cobertura_padrao is 'Texto padrão da cobertura da garantia (editável pelo dono).';

create or replace function public.calcular_venda(p_venda uuid, p_manuais jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  vd public.vendas;
  v public.veiculos;
  s public.veiculos_sigilo;
  cs public.consignacoes;
  cfg public.configuracoes;
  r public.regras_comissao;
  v_custos numeric := 0;
  v_custos_cobrados numeric := 0;
  v_pagos numeric := 0;
  v_trocas numeric := 0;
  v_recebimento public.recebimento_consignado;
  v_parceiro uuid;
  v_loja jsonb := null;
  v_vend jsonb := null;
  v_parc jsonb := null;
  v_com_loja numeric := 0;
  v_lucro_bruto numeric := 0;
  v_base numeric;
  v_valor numeric;
  v_erros text[] := '{}';
  v_avisos text[] := '{}';
  v_repasse numeric := null;
  v_lucro numeric;
begin
  if not public.is_gestor() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  select * into vd from public.vendas where id = p_venda;
  if not found then
    raise exception 'Venda não encontrada.' using errcode = 'P0001';
  end if;
  select * into v from public.veiculos where id = vd.veiculo_id;
  select * into s from public.veiculos_sigilo where veiculo_id = v.id;
  select * into cfg from public.configuracoes;
  select coalesce(sum(valor), 0), coalesce(sum(valor) filter (where cobrar_do_consignante), 0)
    into v_custos, v_custos_cobrados from public.custos_veiculo where veiculo_id = v.id;
  select coalesce(sum(valor), 0) into v_pagos from public.vendas_pagamentos where venda_id = p_venda;
  select coalesce(sum(valor_avaliacao), 0) into v_trocas from public.vendas_trocas where venda_id = p_venda;
  v_parceiro := coalesce(vd.parceiro_id, (select c.parceiro_id from public.clientes c where c.id = vd.cliente_id));

  if abs(v_pagos + v_trocas - vd.valor_venda) > 0.009 then
    v_erros := v_erros || format('Pagamentos (%s) + trocas (%s) não fecham o valor da venda (%s).', v_pagos, v_trocas, vd.valor_venda);
  end if;
  if vd.abaixo_negociavel then
    v_avisos := v_avisos || 'Valor abaixo do negociável do carro.'::text;
  end if;
  if s.preco_minimo is not null and vd.valor_venda < s.preco_minimo then
    v_avisos := v_avisos || 'Valor ABAIXO DO PREÇO MÍNIMO definido para o carro.'::text;
  end if;

  if v.tipo = 'consignado' then
    select * into cs from public.consignacoes where veiculo_id = v.id and status = 'vigente' order by criado_em desc limit 1;
    if cs.id is null then
      v_erros := v_erros || 'Carro consignado sem consignação vigente.'::text;
    else
      if cs.valor_minimo_dono is not null and vd.valor_venda < cs.valor_minimo_dono then
        v_avisos := v_avisos || 'Valor abaixo do mínimo aceito pelo dono do carro.'::text;
      end if;
      v_recebimento := coalesce(vd.recebimento_consignado, cs.recebimento_padrao, cfg.recebimento_consignado_padrao::public.recebimento_consignado);
      if v_recebimento = 'direto_dono' and v_trocas > 0 then
        v_avisos := v_avisos || 'Carro na troca: o comprador paga o dono e a loja, que fica com o carro, deve o valor da troca ao dono (lançado em contas a pagar).'::text;
      end if;
      -- Comissão da loja
      r := public.resolver_regra('loja_consignado', 'consignado', cs.consignante_id, null, null, vd.data_venda, cs.regra_comissao_id);
      if p_manuais ? 'loja' then
        v_com_loja := (p_manuais ->> 'loja')::numeric;
        v_loja := jsonb_build_object('valor', v_com_loja, 'manual', true, 'base', vd.valor_venda, 'base_calculo', 'valor_venda');
      elsif r.id is not null then
        v_com_loja := public.calcular_valor_comissao(r, vd.valor_venda);
        v_loja := jsonb_build_object('valor', v_com_loja, 'manual', false, 'regra_id', r.id, 'regra_nome', r.nome, 'regra', to_jsonb(r), 'base', vd.valor_venda, 'base_calculo', 'valor_venda');
      else
        v_erros := v_erros || 'Sem regra de comissão da loja para este consignante: informe o valor.'::text;
      end if;
      v_lucro_bruto := v_com_loja - (v_custos - v_custos_cobrados);
      v_repasse := vd.valor_venda - v_com_loja - v_custos_cobrados;
    end if;
  else
    if s.valor_compra is null then
      v_avisos := v_avisos || 'Carro sem valor de compra: o lucro fica superestimado.'::text;
    end if;
    v_lucro_bruto := vd.valor_venda - coalesce(s.valor_compra, 0) - v_custos;
  end if;

  -- Comissão do vendedor
  r := public.resolver_regra('vendedor', v.tipo, null, vd.vendedor_id, null, vd.data_venda);
  if p_manuais ? 'vendedor' then
    v_valor := (p_manuais ->> 'vendedor')::numeric;
    v_vend := jsonb_build_object('valor', v_valor, 'manual', true);
  elsif r.id is not null then
    v_base := case r.base when 'valor_venda' then vd.valor_venda
                          when 'comissao_loja' then case when v.tipo = 'consignado' then v_com_loja else v_lucro_bruto end
                          else v_lucro_bruto end;
    v_valor := public.calcular_valor_comissao(r, v_base);
    v_vend := jsonb_build_object('valor', v_valor, 'manual', false, 'regra_id', r.id, 'regra_nome', r.nome, 'regra', to_jsonb(r), 'base', v_base, 'base_calculo', r.base);
  else
    v_erros := v_erros || 'Sem regra de comissão para este vendedor: informe o valor (pode ser 0).'::text;
  end if;

  -- Comissão de indicação
  if v_parceiro is not null then
    r := public.resolver_regra('parceiro', v.tipo, null, null, v_parceiro, vd.data_venda);
    if p_manuais ? 'parceiro' then
      v_parc := jsonb_build_object('valor', (p_manuais ->> 'parceiro')::numeric, 'manual', true, 'parceiro_id', v_parceiro);
    elsif r.id is not null then
      v_base := case r.base when 'valor_venda' then vd.valor_venda
                            when 'comissao_loja' then case when v.tipo = 'consignado' then v_com_loja else v_lucro_bruto end
                            else v_lucro_bruto end;
      v_parc := jsonb_build_object('valor', public.calcular_valor_comissao(r, v_base), 'manual', false, 'regra_id', r.id, 'regra_nome', r.nome,
                                   'regra', to_jsonb(r), 'base', v_base, 'base_calculo', r.base, 'parceiro_id', v_parceiro);
    else
      v_erros := v_erros || 'Venda com indicação sem regra de comissão do parceiro: informe o valor (pode ser 0).'::text;
    end if;
  end if;

  -- Lucro (fórmula da loja): próprio = venda − compra − custos − comissão do vendedor;
  -- consignado = comissão da loja − custos absorvidos − comissão do vendedor.
  v_lucro := v_lucro_bruto - coalesce((v_vend ->> 'valor')::numeric, 0);

  return jsonb_build_object(
    'tipo', v.tipo,
    'recebimento', v_recebimento,
    'valor_venda', vd.valor_venda,
    'valor_compra', s.valor_compra,
    'custos', v_custos,
    'custos_cobrados_consignante', v_custos_cobrados,
    'pagamentos', v_pagos,
    'trocas', v_trocas,
    'comissao_loja', v_loja,
    'comissao_vendedor', v_vend,
    'comissao_parceiro', v_parc,
    'repasse_consignante', v_repasse,
    'consignante_id', cs.consignante_id,
    'lucro_bruto', v_lucro_bruto,
    'lucro', v_lucro,
    'lucro_apos_indicacao', v_lucro - coalesce((v_parc ->> 'valor')::numeric, 0),
    'erros', to_jsonb(v_erros),
    'avisos', to_jsonb(v_avisos)
  );
end
$$;

create or replace function public.fechar_venda(p_venda uuid, p_manuais jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  vd public.vendas;
  v public.veiculos;
  c jsonb;
  pg record;
  tr record;
  v_novo uuid;
  v_cat_receita uuid;
  v_comissao_id uuid;
  v_lanc uuid;
  v_vendedor_nome text;
  v_desc_carro text;
  v_fim_mes date;
  v_cobertura text;
begin
  if not public.is_gestor() then
    raise exception 'Somente dono ou gerente fecham vendas.' using errcode = '42501';
  end if;
  select * into vd from public.vendas where id = p_venda for update;
  if not found then
    raise exception 'Venda não encontrada.' using errcode = 'P0001';
  end if;
  if vd.status not in ('rascunho', 'aguardando_aprovacao') then
    raise exception 'Esta venda já está %.', vd.status using errcode = 'P0001';
  end if;
  select * into v from public.veiculos where id = vd.veiculo_id for update;
  if v.status not in ('em_preparacao', 'disponivel', 'reservado') then
    raise exception 'O carro não está disponível (situação: %).', v.status using errcode = 'P0001';
  end if;

  c := public.calcular_venda(p_venda, coalesce(p_manuais, '{}'));
  if jsonb_array_length(c -> 'erros') > 0 then
    raise exception 'Não foi possível fechar: %', (select string_agg(e, ' ') from jsonb_array_elements_text(c -> 'erros') e) using errcode = 'P0001';
  end if;

  perform set_config('app.operacao_venda', 'fechar', true);
  v_desc_carro := v.marca || ' ' || v.modelo || coalesce(' ' || v.placa, '');
  v_fim_mes := (date_trunc('month', vd.data_venda) + interval '1 month - 1 day')::date;
  select nome into v_vendedor_nome from public.usuarios where id = vd.vendedor_id;

  -- 1) Carros recebidos na troca entram no estoque como próprios, em preparação.
  for tr in select * from public.vendas_trocas where venda_id = p_venda loop
    insert into public.veiculos (tipo, origem, status, placa, marca, modelo, versao, motor, ano_fabricacao, ano_modelo, cor, km,
                                 combustivel, cambio, codigo_fipe, valor_fipe, data_entrada, observacoes)
    values ('proprio', 'troca', 'em_preparacao', tr.placa, tr.marca, tr.modelo, tr.versao, tr.motor, tr.ano_fabricacao, tr.ano_modelo,
            tr.cor, tr.km, tr.combustivel, tr.cambio, tr.codigo_fipe, tr.valor_fipe, vd.data_venda,
            'Recebido na troca da venda ' || vd.numero || coalesce('. ' || tr.observacoes, ''))
    returning id into v_novo;
    insert into public.veiculos_sigilo (veiculo_id, valor_compra, data_compra, cliente_origem_id, venda_origem_id)
    values (v_novo, tr.valor_avaliacao, vd.data_venda, vd.cliente_id, vd.id);
    update public.vendas_trocas set veiculo_id = v_novo where id = tr.id;
    -- Entrada do carro como pagamento (permuta) e custo de aquisição do novo carro.
    insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, data_pagamento, status,
                                    forma_pagamento, veiculo_id, venda_id, cliente_id)
    values ('receita', 'Troca recebida na venda ' || vd.numero || ' (' || tr.marca || ' ' || tr.modelo || ')',
            case when v.tipo = 'proprio' then public.categoria_sistema('venda_veiculo') else public.categoria_sistema('venda_consignado') end,
            tr.valor_avaliacao, vd.data_venda, vd.data_venda, vd.data_venda, 'pago', 'permuta', v.id, vd.id, vd.cliente_id),
           ('despesa', 'Compra por troca: ' || tr.marca || ' ' || tr.modelo || coalesce(' ' || tr.placa, ''),
            public.categoria_sistema('compra_veiculo'), tr.valor_avaliacao, vd.data_venda, vd.data_venda, vd.data_venda, 'pago',
            'permuta', v_novo, vd.id, vd.cliente_id);
  end loop;

  -- 2) Recebimentos da venda (exceto consignado pago direto ao dono).
  if v.tipo = 'proprio' or c ->> 'recebimento' = 'loja_repassa' then
    v_cat_receita := case when v.tipo = 'proprio' then public.categoria_sistema('venda_veiculo') else public.categoria_sistema('venda_consignado') end;
    for pg in select * from public.vendas_pagamentos where venda_id = p_venda loop
      insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, data_pagamento, status,
                                      forma_pagamento, conta_id, veiculo_id, venda_id, cliente_id, observacoes)
      values ('receita',
              'Venda ' || vd.numero || ' — ' || v_desc_carro || ' (' || replace(pg.forma::text, '_', ' ') || coalesce(' ' || pg.banco_financiamento, '') || ')',
              v_cat_receita, pg.valor, vd.data_venda, coalesce(pg.data_prevista, vd.data_venda),
              case when pg.recebido then coalesce(pg.data_prevista, vd.data_venda) end,
              case when pg.recebido and pg.conta_id is not null then 'pago'::public.status_lancamento else 'pendente'::public.status_lancamento end,
              pg.forma::text::public.forma_pagamento, pg.conta_id, v.id, vd.id, vd.cliente_id, pg.observacoes)
      returning id into v_lanc;
      update public.vendas_pagamentos set lancamento_id = v_lanc where id = pg.id;
    end loop;
  end if;

  -- 3) Comissão da loja (consignado) e repasse/reembolso com o consignante.
  if v.tipo = 'consignado' then
    insert into public.comissoes (venda_id, tipo, direcao, consignante_id, regra_id, regra_snapshot, base_calculo, base_valor, valor, manual,
                                  status, data_prevista, data_quitacao)
    values (vd.id, 'loja_consignado', 'a_receber', (c ->> 'consignante_id')::uuid, (c -> 'comissao_loja' ->> 'regra_id')::uuid,
            c -> 'comissao_loja' -> 'regra', 'valor_venda', vd.valor_venda, (c -> 'comissao_loja' ->> 'valor')::numeric,
            (c -> 'comissao_loja' ->> 'manual')::boolean,
            case when c ->> 'recebimento' = 'loja_repassa' then 'quitada'::public.status_comissao else 'pendente'::public.status_comissao end,
            vd.data_venda, case when c ->> 'recebimento' = 'loja_repassa' then vd.data_venda end)
    returning id into v_comissao_id;

    if c ->> 'recebimento' = 'loja_repassa' then
      if (c ->> 'repasse_consignante')::numeric > 0 then
        insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, consignante_id, veiculo_id, venda_id, observacoes)
        values ('despesa', 'Repasse ao dono — venda ' || vd.numero || ' (' || v_desc_carro || ')', public.categoria_sistema('repasse_consignante'),
                (c ->> 'repasse_consignante')::numeric, vd.data_venda, vd.data_venda, (c ->> 'consignante_id')::uuid, v.id, vd.id,
                format('Venda %s − comissão %s − custos cobrados %s', vd.valor_venda, c -> 'comissao_loja' ->> 'valor', c ->> 'custos_cobrados_consignante'));
      end if;
    else
      if (c -> 'comissao_loja' ->> 'valor')::numeric > 0 then
        insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, consignante_id, veiculo_id, venda_id, comissao_id)
        values ('receita', 'Comissão de consignação — venda ' || vd.numero, public.categoria_sistema('comissao_consignacao'),
                (c -> 'comissao_loja' ->> 'valor')::numeric, vd.data_venda, vd.data_venda, (c ->> 'consignante_id')::uuid, v.id, vd.id, v_comissao_id)
        returning id into v_lanc;
        update public.comissoes set lancamento_id = v_lanc where id = v_comissao_id;
      end if;
      if (c ->> 'custos_cobrados_consignante')::numeric > 0 then
        insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, consignante_id, veiculo_id, venda_id)
        values ('receita', 'Reembolso de custos — venda ' || vd.numero, public.categoria_sistema('reembolso_consignante'),
                (c ->> 'custos_cobrados_consignante')::numeric, vd.data_venda, vd.data_venda, (c ->> 'consignante_id')::uuid, v.id, vd.id);
      end if;
      -- O comprador pagou o dono, mas o carro da troca ficou com a loja: a loja deve esse valor ao dono.
      if exists (select 1 from public.vendas_trocas where venda_id = p_venda) then
        insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, consignante_id, veiculo_id, venda_id, observacoes)
        select 'despesa', 'Repasse ao dono — carro da troca na venda ' || vd.numero, public.categoria_sistema('repasse_consignante'),
               sum(t.valor_avaliacao), vd.data_venda, vd.data_venda, (c ->> 'consignante_id')::uuid, v.id, vd.id,
               'Comprador pagou o dono direto; o carro da troca (' || string_agg(t.marca || ' ' || t.modelo, ', ') || ') ficou no estoque da loja.'
          from public.vendas_trocas t where t.venda_id = p_venda
        having sum(t.valor_avaliacao) > 0;
      end if;
    end if;
    update public.consignacoes set status = 'vendido' where veiculo_id = v.id and status = 'vigente';
  end if;

  -- 4) Comissão do vendedor (a pagar, vence no fim do mês da venda).
  if c -> 'comissao_vendedor' is not null and c -> 'comissao_vendedor' <> 'null'::jsonb then
    insert into public.comissoes (venda_id, tipo, direcao, usuario_id, regra_id, regra_snapshot, base_calculo, base_valor, valor, manual, status, data_prevista)
    values (vd.id, 'vendedor', 'a_pagar', vd.vendedor_id, (c -> 'comissao_vendedor' ->> 'regra_id')::uuid, c -> 'comissao_vendedor' -> 'regra',
            c -> 'comissao_vendedor' ->> 'base_calculo', (c -> 'comissao_vendedor' ->> 'base')::numeric, (c -> 'comissao_vendedor' ->> 'valor')::numeric,
            (c -> 'comissao_vendedor' ->> 'manual')::boolean,
            case when (c -> 'comissao_vendedor' ->> 'valor')::numeric = 0 then 'quitada'::public.status_comissao else 'pendente'::public.status_comissao end,
            v_fim_mes)
    returning id into v_comissao_id;
    if (c -> 'comissao_vendedor' ->> 'valor')::numeric > 0 then
      insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, usuario_id, veiculo_id, venda_id, comissao_id)
      values ('despesa', 'Comissão ' || coalesce(v_vendedor_nome, 'vendedor') || ' — venda ' || vd.numero, public.categoria_sistema('comissao_vendedor'),
              (c -> 'comissao_vendedor' ->> 'valor')::numeric, vd.data_venda, v_fim_mes, vd.vendedor_id, v.id, vd.id, v_comissao_id)
      returning id into v_lanc;
      update public.comissoes set lancamento_id = v_lanc where id = v_comissao_id;
    end if;
  end if;

  -- 5) Comissão de indicação.
  if c -> 'comissao_parceiro' is not null and c -> 'comissao_parceiro' <> 'null'::jsonb then
    insert into public.comissoes (venda_id, tipo, direcao, parceiro_id, regra_id, regra_snapshot, base_calculo, base_valor, valor, manual, status, data_prevista)
    values (vd.id, 'parceiro', 'a_pagar', (c -> 'comissao_parceiro' ->> 'parceiro_id')::uuid, (c -> 'comissao_parceiro' ->> 'regra_id')::uuid,
            c -> 'comissao_parceiro' -> 'regra', c -> 'comissao_parceiro' ->> 'base_calculo', (c -> 'comissao_parceiro' ->> 'base')::numeric,
            (c -> 'comissao_parceiro' ->> 'valor')::numeric, (c -> 'comissao_parceiro' ->> 'manual')::boolean,
            case when (c -> 'comissao_parceiro' ->> 'valor')::numeric = 0 then 'quitada'::public.status_comissao else 'pendente'::public.status_comissao end,
            v_fim_mes)
    returning id into v_comissao_id;
    if (c -> 'comissao_parceiro' ->> 'valor')::numeric > 0 then
      insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, parceiro_id, veiculo_id, venda_id, comissao_id)
      values ('despesa', 'Comissão de indicação — venda ' || vd.numero, public.categoria_sistema('comissao_indicacao'),
              (c -> 'comissao_parceiro' ->> 'valor')::numeric, vd.data_venda, v_fim_mes, (c -> 'comissao_parceiro' ->> 'parceiro_id')::uuid, v.id, vd.id, v_comissao_id)
      returning id into v_lanc;
      update public.comissoes set lancamento_id = v_lanc where id = v_comissao_id;
    end if;
  end if;

  -- 6) Garantia.
  v_cobertura := coalesce(vd.garantia_cobertura, (select garantia_cobertura_padrao from public.configuracoes));
  insert into public.garantias (venda_id, veiculo_id, cliente_id, data_inicio, dias, cobertura)
  values (vd.id, v.id, vd.cliente_id, vd.data_venda, coalesce(vd.garantia_dias, (select garantia_dias_padrao from public.configuracoes)), v_cobertura);

  -- 7) Carro vendido, cliente ganho, venda fechada.
  update public.veiculos set status = 'vendido', data_saida = vd.data_venda, reservado_para_cliente_id = null, reservado_ate = null where id = v.id;
  update public.clientes set etapa = 'ganho', motivo_perda = null where id = vd.cliente_id;
  update public.clientes_interesses set ativo = false where veiculo_id = v.id;
  update public.vendas set status = 'fechada', aprovada_por = auth.uid(), aprovada_em = now(),
                           recebimento_consignado = (c ->> 'recebimento')::public.recebimento_consignado
   where id = vd.id;

  perform public.registrar_evento('venda.fechada', jsonb_build_object(
    'venda_id', vd.id, 'numero', vd.numero, 'veiculo_id', v.id, 'veiculo', v_desc_carro, 'valor', vd.valor_venda, 'data', vd.data_venda));
  perform set_config('app.operacao_venda', '', true);
  return c;
end
$$;

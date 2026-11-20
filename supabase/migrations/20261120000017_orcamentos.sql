-- =============================================================================
-- Caetano Auto CRM — 0017 Orçamentos (e cálculo de alertas do veículo)
-- Valores que dependem do dono (limite de desconto por perfil, validade padrão,
-- taxas da simulação) nascem vazios. Enquanto vazios, o sistema segue o caminho
-- seguro: qualquer desconto pede aprovação, a validade é escolhida no orçamento
-- e a simulação de financiamento não aparece.
-- =============================================================================

alter table public.configuracoes
  add column orcamento_validade_dias integer check (orcamento_validade_dias > 0),
  add column desconto_limites jsonb not null default '{}',
  add column financiamento_taxas jsonb not null default '[]';
comment on column public.configuracoes.desconto_limites is 'Limite de desconto sem aprovação, em % do preço anunciado, por perfil: {"vendedor": 3, "gerente": 6}. Vazio = precisa de aprovação.';
comment on column public.configuracoes.financiamento_taxas is 'Simulação: [{"prazo": 48, "taxa_mensal": 1.99}, ...]. Vazio = simulação desligada.';

-- Km nos registros do histórico (para detectar km divergente).
alter table public.veiculo_historico add column km integer check (km >= 0);

-- Consulta feita antes de o carro existir no estoque (ex.: troca) passa a apontar para ele.
create or replace function public.ligar_consultas_ao_veiculo()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.placa is not null then
    update public.consultas_veiculares set veiculo_id = new.id where placa = new.placa and veiculo_id is null;
  end if;
  return new;
end
$$;
create trigger veiculos_ligar_consultas after insert or update of placa on public.veiculos
  for each row execute function public.ligar_consultas_ao_veiculo();

-- -----------------------------------------------------------------------------
-- Alertas do veículo (consulta mais recente + cadastro). Usado no orçamento e na venda.
-- nivel: vermelho (impeditivo), amarelo (informar o comprador), pendente (falta consulta válida), info (consulta sem registros).
-- -----------------------------------------------------------------------------
create or replace function public.chassi_confere(p_parcial text, p_completo text)
returns boolean language plpgsql immutable set search_path = ''
as $$
declare
  p text := upper(regexp_replace(coalesce(p_parcial, ''), '[^A-Za-z0-9*]', '', 'g'));
  c text := upper(regexp_replace(coalesce(p_completo, ''), '[^A-Za-z0-9]', '', 'g'));
  i integer;
begin
  if p = '' or c = '' or length(replace(p, '*', '')) < 4 then
    return null;
  end if;
  if length(p) = length(c) then
    for i in 1 .. length(p) loop
      if substr(p, i, 1) <> '*' and substr(p, i, 1) <> substr(c, i, 1) then
        return false;
      end if;
    end loop;
    return true;
  end if;
  return c like split_part(p, '*', 1) || '%' and c like '%' || regexp_replace(p, '^.*\*', '');
end
$$;

create or replace function public.alertas_veiculo(p_veiculo uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v public.veiculos;
  c public.consultas_veiculares;
  cfg public.configuracoes;
  a jsonb := '[]';
  h record;
  k text;
  e jsonb;
  v_nivel text;
  v_baixa boolean;
  v_km_max integer;
  rotulos constant jsonb := '{"roubo_furto": "Roubo ou furto", "restricoes": "Restrição judicial ou administrativa", "gravame": "Alienação / gravame",
    "leilao": "Passagem por leilão", "sinistro": "Sinistro ou histórico de dano", "ipva": "Débitos de IPVA", "multas": "Multas",
    "licenciamento": "Licenciamento em aberto", "recall": "Recall pendente"}';
begin
  if not public.is_ativo() then
    return '[]';
  end if;
  select * into v from public.veiculos where id = p_veiculo;
  if v.id is null then
    return '[]';
  end if;
  select * into cfg from public.configuracoes;
  if v.placa is not null then
    select * into c from public.consultas_veiculares where placa = v.placa and status <> 'erro' order by consultado_em desc limit 1;
  end if;

  if c.id is null then
    a := a || jsonb_build_object('codigo', 'sem_consulta', 'nivel', 'pendente', 'origem', 'consulta',
      'descricao', case when v.placa is null then 'Carro sem placa cadastrada: não foi possível consultar'
                        else 'Placa ainda não consultada (leilão, sinistro, gravame, débitos)' end);
  else
    if c.consultado_em < now() - make_interval(days => cfg.consulta_validade_venda_dias) then
      a := a || jsonb_build_object('codigo', 'consulta_antiga', 'nivel', 'pendente', 'origem', 'consulta', 'consulta_id', c.id,
        'descricao', format('Consulta de %s tem mais de %s dias: faça uma nova', to_char(c.consultado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), cfg.consulta_validade_venda_dias));
    end if;
    if c.status = 'nao_encontrado' then
      a := a || jsonb_build_object('codigo', 'placa_nao_encontrada', 'nivel', 'amarelo', 'origem', 'consulta', 'consulta_id', c.id,
        'descricao', 'Placa não encontrada na base do provedor', 'fonte', c.provedor, 'data', c.consultado_em);
    end if;
    for k, e in select key, value from jsonb_each(c.verificacoes) loop
      if e ->> 'estado' = 'encontrado' then
        v_nivel := case when k in ('roubo_furto', 'restricoes', 'gravame') then 'vermelho' else 'amarelo' end;
        v_baixa := false;
        if k = 'gravame' then
          select exists (select 1 from public.arquivos ar where ar.entidade = 'veiculo' and ar.entidade_id = v.id and ar.categoria = 'baixa_gravame') into v_baixa;
          if v_baixa then v_nivel := 'amarelo'; end if;
        end if;
        a := a || jsonb_build_object('codigo', k, 'nivel', v_nivel, 'origem', 'consulta', 'consulta_id', c.id, 'fonte', c.provedor, 'data', c.consultado_em,
          'descricao', (rotulos ->> k)
            || case when k = 'gravame' and v_baixa then ' (baixa documentada)' when k = 'gravame' then ' sem baixa documentada' else '' end
            || coalesce(': ' || nullif(e ->> 'detalhe', ''), ''));
      end if;
    end loop;
    if (c.dados ->> 'chassi') is not null and v.chassi is not null and public.chassi_confere(c.dados ->> 'chassi', v.chassi) is false then
      a := a || jsonb_build_object('codigo', 'chassi_divergente', 'nivel', 'vermelho', 'origem', 'consulta', 'consulta_id', c.id, 'fonte', c.provedor, 'data', c.consultado_em,
        'descricao', format('Chassi do cadastro não confere com a consulta (%s)', c.dados ->> 'chassi'));
    end if;
    -- Nada encontrado: registra a frase padrão (nunca "carro limpo" ou "sem problemas").
    if c.status = 'encontrado' and not exists (select 1 from jsonb_array_elements(a) x where x ->> 'origem' = 'consulta' and x ->> 'nivel' in ('vermelho', 'amarelo')) then
      a := a || jsonb_build_object('codigo', 'consulta_sem_registros', 'nivel', 'info', 'origem', 'consulta', 'consulta_id', c.id, 'fonte', c.provedor, 'data', c.consultado_em,
        'descricao', format('Nenhum registro encontrado na consulta de %s (%s)', to_char(c.consultado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), c.provedor));
    end if;
  end if;

  if not v.laudo_cautelar then
    a := a || jsonb_build_object('codigo', 'sem_laudo', 'nivel', 'amarelo', 'origem', 'cadastro', 'descricao', 'Sem laudo cautelar');
  elsif v.laudo_resultado in ('aprovado_apontamentos', 'reprovado') then
    a := a || jsonb_build_object('codigo', 'laudo_apontamentos', 'nivel', 'amarelo', 'origem', 'cadastro',
      'descricao', case v.laudo_resultado when 'reprovado' then 'Laudo cautelar reprovado' else 'Laudo cautelar aprovado com apontamentos' end);
  end if;

  for h in select tipo, descricao, data from public.veiculo_historico
            where veiculo_id = v.id and tipo in ('pintura', 'reparo', 'sinistro') order by data, criado_em loop
    a := a || jsonb_build_object('codigo', 'historico_' || h.tipo, 'nivel', 'amarelo', 'origem', 'cadastro', 'data', h.data,
      'descricao', case h.tipo when 'pintura' then 'Repintura registrada' when 'reparo' then 'Reparo ou peça trocada registrado'
                               else 'Sinistro registrado no histórico' end || ': ' || h.descricao);
  end loop;

  select max(km) into v_km_max from public.veiculo_historico where veiculo_id = v.id and km is not null;
  if v_km_max is not null and v.km is not null and v.km < v_km_max then
    a := a || jsonb_build_object('codigo', 'km_divergente', 'nivel', 'amarelo', 'origem', 'cadastro',
      'descricao', format('Km atual (%s) menor que um km já registrado no histórico (%s)', v.km, v_km_max));
  end if;
  return a;
end
$$;
grant execute on function public.alertas_veiculo(uuid) to authenticated;

-- Valor em reais para mensagens (R$ 1.234,56).
create or replace function public.moeda_br(p numeric)
returns text language sql immutable set search_path = ''
as $$ select 'R$ ' || translate(to_char(coalesce(p, 0), 'FM999,999,999,990.00'), ',.', '.,') $$;

-- Nível mais grave de uma lista de alertas.
create or replace function public.nivel_alertas(p_alertas jsonb)
returns text language sql immutable set search_path = ''
as $$
  select case
    when exists (select 1 from jsonb_array_elements(p_alertas) x where x ->> 'nivel' = 'vermelho') then 'vermelho'
    when exists (select 1 from jsonb_array_elements(p_alertas) x where x ->> 'nivel' = 'amarelo') then 'amarelo'
    when exists (select 1 from jsonb_array_elements(p_alertas) x where x ->> 'nivel' = 'pendente') then 'pendente'
    else 'verde'
  end
$$;

-- -----------------------------------------------------------------------------
-- Desconto: "dentro" ou "fora" do limite. O vendedor nunca recebe preço mínimo ou custo.
-- Vendedor: pode ir até o valor negociável do carro e/ou até o limite % do perfil
-- (vale o mais restritivo); sem nenhum dos dois, qualquer desconto pede aprovação.
-- Gerente: até o limite % dele; dono: livre. Ninguém (exceto o dono) passa do preço
-- mínimo do carro nem do mínimo do dono do consignado sem aprovação.
-- -----------------------------------------------------------------------------
create or replace function public.avaliar_desconto(p_veiculo uuid, p_valor numeric)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare
  v public.veiculos;
  v_papel public.papel_usuario := public.papel();
  v_minimo numeric;
  v_min_dono numeric;
  v_lim numeric;
  v_pisos numeric[] := '{}';
  v_piso numeric;
begin
  if v_papel is null or p_valor is null then
    return 'fora';
  end if;
  select * into v from public.veiculos where id = p_veiculo;
  if v.id is null or v.preco_anunciado is null then
    return 'fora';
  end if;
  if p_valor >= v.preco_anunciado or v_papel = 'dono' then
    return 'dentro';
  end if;
  if v_papel not in ('vendedor', 'gerente') then
    return 'fora';
  end if;
  select preco_minimo into v_minimo from public.veiculos_sigilo where veiculo_id = v.id;
  select valor_minimo_dono into v_min_dono from public.consignacoes where veiculo_id = v.id and status = 'vigente' order by criado_em desc limit 1;
  v_lim := nullif((select desconto_limites ->> v_papel::text from public.configuracoes), '')::numeric;
  if v_lim is not null then
    v_pisos := v_pisos || round(v.preco_anunciado * (1 - v_lim / 100), 2);
  end if;
  if v_papel = 'vendedor' and v.preco_negociavel is not null then
    v_pisos := v_pisos || v.preco_negociavel;
  end if;
  if cardinality(v_pisos) = 0 then
    return 'fora';
  end if;
  select max(x) into v_piso from unnest(v_pisos) x;
  v_piso := greatest(v_piso, coalesce(v_minimo, 0), coalesce(v_min_dono, 0));
  return case when p_valor >= v_piso then 'dentro' else 'fora' end;
end
$$;
grant execute on function public.avaliar_desconto(uuid, numeric) to authenticated;

-- -----------------------------------------------------------------------------
-- Orçamentos
-- -----------------------------------------------------------------------------
create type public.status_orcamento as enum ('rascunho', 'enviado', 'aceito', 'recusado', 'expirado');
create type public.status_desconto as enum ('sem_desconto', 'dentro_limite', 'aguardando_aprovacao', 'aprovado', 'recusado');
create sequence public.orcamentos_numero_seq;

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text unique,
  veiculo_id uuid not null references public.veiculos (id) on delete restrict,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  vendedor_id uuid not null default auth.uid() references public.usuarios (id),
  preco_anunciado numeric(12, 2) not null default 0,
  valor_final numeric(12, 2) not null check (valor_final > 0),
  desconto numeric(12, 2) generated always as (greatest(preco_anunciado - valor_final, 0)) stored,
  valor_entrada numeric(12, 2) not null default 0 check (valor_entrada >= 0),
  simulacao jsonb,
  observacoes text,
  validade date,
  status public.status_orcamento not null default 'rascunho',
  enviado_em timestamptz,
  respondido_em timestamptz,
  motivo_recusa text,
  desconto_status public.status_desconto not null default 'sem_desconto',
  desconto_motivo text,
  desconto_aprovado_valor numeric(12, 2),
  desconto_decidido_por uuid references public.usuarios (id),
  desconto_decidido_em timestamptz,
  desconto_decisao_motivo text,
  alertas jsonb not null default '[]',
  alertas_em timestamptz,
  token_publico text unique,
  venda_id uuid references public.vendas (id) on delete set null,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index orcamentos_vendedor_idx on public.orcamentos (vendedor_id, status);
create index orcamentos_veiculo_idx on public.orcamentos (veiculo_id);
select public.preparar_tabela('public.orcamentos');

create policy orcamentos_ver on public.orcamentos for select to authenticated
  using ((select public.is_gestor()) or vendedor_id = (select auth.uid()));
create policy orcamentos_inserir on public.orcamentos for insert to authenticated
  with check (status = 'rascunho' and ((select public.is_gestor())
    or ((select public.is_vendedor()) and vendedor_id = (select auth.uid()) and public.pode_ver_cliente(cliente_id))));
-- Só rascunho se edita; mudanças de situação passam pelas funções abaixo.
create policy orcamentos_alterar on public.orcamentos for update to authenticated
  using (status = 'rascunho' and ((select public.is_gestor()) or vendedor_id = (select auth.uid())))
  with check (status = 'rascunho' and ((select public.is_gestor()) or vendedor_id = (select auth.uid())));
create policy orcamentos_excluir on public.orcamentos for delete to authenticated
  using (status = 'rascunho' and ((select public.is_gestor()) or vendedor_id = (select auth.uid())));

create table public.orcamentos_pagamentos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  forma public.forma_pagamento_venda not null,
  valor numeric(12, 2) not null check (valor > 0),
  banco_financiamento text,
  parcelas integer check (parcelas between 1 and 120),
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index orcamentos_pagamentos_orc_idx on public.orcamentos_pagamentos (orcamento_id);
select public.preparar_tabela('public.orcamentos_pagamentos');

create table public.orcamentos_trocas (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  consulta_id uuid references public.consultas_veiculares (id) on delete set null,
  placa text check (placa is null or placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  marca text not null,
  modelo text not null,
  versao text,
  ano_fabricacao integer,
  ano_modelo integer,
  cor text,
  km integer check (km >= 0),
  valor_fipe numeric(12, 2),
  valor_avaliacao numeric(12, 2) not null check (valor_avaliacao > 0),
  selo public.selo_consulta,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index orcamentos_trocas_orc_idx on public.orcamentos_trocas (orcamento_id);
select public.preparar_tabela('public.orcamentos_trocas');

create or replace function public.pode_editar_orcamento(p_orcamento uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.orcamentos o where o.id = p_orcamento and o.status = 'rascunho'
                  and (public.is_gestor() or o.vendedor_id = auth.uid()))
$$;
create or replace function public.pode_ver_orcamento(p_orcamento uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.orcamentos o where o.id = p_orcamento and (public.is_gestor() or o.vendedor_id = auth.uid()))
$$;
grant execute on function public.pode_editar_orcamento(uuid), public.pode_ver_orcamento(uuid) to authenticated;

create policy orc_pagamentos_ver on public.orcamentos_pagamentos for select to authenticated using (public.pode_ver_orcamento(orcamento_id));
create policy orc_pagamentos_editar on public.orcamentos_pagamentos for all to authenticated
  using (public.pode_editar_orcamento(orcamento_id)) with check (public.pode_editar_orcamento(orcamento_id));
create policy orc_trocas_ver on public.orcamentos_trocas for select to authenticated using (public.pode_ver_orcamento(orcamento_id));
create policy orc_trocas_editar on public.orcamentos_trocas for all to authenticated
  using (public.pode_editar_orcamento(orcamento_id)) with check (public.pode_editar_orcamento(orcamento_id));

-- Número, preço anunciado (cópia), vendedor, validade padrão e situação do desconto.
create or replace function public.preparar_orcamento()
returns trigger language plpgsql set search_path = ''
as $$
declare
  cfg public.configuracoes;
  v_aval text;
begin
  select * into cfg from public.configuracoes;
  if tg_op = 'INSERT' then
    new.numero := 'O-' || to_char(public.hoje(), 'YYYY') || '-' || lpad(nextval('public.orcamentos_numero_seq')::text, 4, '0');
    if public.is_vendedor() then
      new.vendedor_id := auth.uid();
    end if;
    if new.validade is null and cfg.orcamento_validade_dias is not null then
      new.validade := public.hoje() + cfg.orcamento_validade_dias;
    end if;
  end if;
  if tg_op = 'INSERT' or new.veiculo_id is distinct from old.veiculo_id then
    select coalesce(preco_anunciado, 0) into new.preco_anunciado from public.veiculos where id = new.veiculo_id;
    if not found then
      raise exception 'Carro não encontrado.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.veiculos where id = new.veiculo_id and status in ('vendido', 'devolvido')) then
      raise exception 'Este carro não está mais à venda.' using errcode = 'P0001';
    end if;
  end if;
  if tg_op = 'INSERT' or new.valor_final is distinct from old.valor_final or new.veiculo_id is distinct from old.veiculo_id then
    if new.valor_final >= new.preco_anunciado then
      new.desconto_status := 'sem_desconto';
      new.desconto_aprovado_valor := null;
    else
      v_aval := public.avaliar_desconto(new.veiculo_id, new.valor_final);
      if v_aval = 'dentro' then
        new.desconto_status := 'dentro_limite';
      elsif new.desconto_status = 'aprovado' and new.valor_final >= coalesce(new.desconto_aprovado_valor, new.preco_anunciado) then
        new.desconto_status := 'aprovado';
      else
        if nullif(trim(coalesce(new.desconto_motivo, '')), '') is null then
          raise exception 'Desconto fora do seu limite: informe o motivo para pedir aprovação.' using errcode = 'P0001';
        end if;
        new.desconto_status := 'aguardando_aprovacao';
        new.desconto_aprovado_valor := null;
        new.desconto_decidido_por := null;
        new.desconto_decidido_em := null;
        new.desconto_decisao_motivo := null;
      end if;
    end if;
  end if;
  return new;
end
$$;
create trigger orcamentos_preparar before insert or update on public.orcamentos
  for each row execute function public.preparar_orcamento();

-- Pedido de aprovação vira tarefa da gestão (sem responsável: aparece para dono e gerente).
create or replace function public.tarefa_aprovacao_desconto()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.desconto_status = 'aguardando_aprovacao' and (tg_op = 'INSERT' or old.desconto_status is distinct from 'aguardando_aprovacao') then
    insert into public.tarefas (titulo, descricao, entidade, entidade_id, prazo, origem, chave_automatica)
    values ('Aprovar desconto do orçamento ' || new.numero, 'Motivo do vendedor: ' || coalesce(new.desconto_motivo, '—'),
            'orcamento', new.id, public.hoje(), 'automatica', 'orcamento:' || new.id || ':desconto')
    on conflict (chave_automatica) do update set status = 'pendente', prazo = excluded.prazo, descricao = excluded.descricao;
  elsif tg_op = 'UPDATE' and old.desconto_status = 'aguardando_aprovacao' and new.desconto_status <> 'aguardando_aprovacao' then
    update public.tarefas set status = case when new.desconto_status in ('aprovado', 'recusado') then 'concluida'::public.status_tarefa else 'cancelada'::public.status_tarefa end
     where chave_automatica = 'orcamento:' || new.id || ':desconto' and status in ('pendente', 'em_andamento');
  end if;
  return new;
end
$$;
create trigger orcamentos_tarefa_desconto after insert or update of desconto_status on public.orcamentos
  for each row execute function public.tarefa_aprovacao_desconto();

-- Salva o orçamento com pagamentos e trocas numa transação (a RLS se aplica).
create or replace function public.salvar_orcamento(p_id uuid, p_orcamento jsonb, p_pagamentos jsonb, p_trocas jsonb)
returns uuid language plpgsql set search_path = ''
as $$
declare
  v_id uuid := p_id;
  item jsonb;
begin
  if not public.is_ativo() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if v_id is null then
    insert into public.orcamentos (veiculo_id, cliente_id, vendedor_id, valor_final, valor_entrada, simulacao, observacoes, validade, desconto_motivo)
    values ((p_orcamento ->> 'veiculo_id')::uuid, (p_orcamento ->> 'cliente_id')::uuid,
            coalesce((p_orcamento ->> 'vendedor_id')::uuid, auth.uid()), (p_orcamento ->> 'valor_final')::numeric,
            coalesce((p_orcamento ->> 'valor_entrada')::numeric, 0), p_orcamento -> 'simulacao', p_orcamento ->> 'observacoes',
            (p_orcamento ->> 'validade')::date, p_orcamento ->> 'desconto_motivo')
    returning id into v_id;
  else
    update public.orcamentos set
      veiculo_id = (p_orcamento ->> 'veiculo_id')::uuid,
      cliente_id = (p_orcamento ->> 'cliente_id')::uuid,
      valor_final = (p_orcamento ->> 'valor_final')::numeric,
      valor_entrada = coalesce((p_orcamento ->> 'valor_entrada')::numeric, 0),
      simulacao = p_orcamento -> 'simulacao',
      observacoes = p_orcamento ->> 'observacoes',
      validade = (p_orcamento ->> 'validade')::date,
      desconto_motivo = p_orcamento ->> 'desconto_motivo'
     where id = v_id;
    if not found then
      raise exception 'Orçamento não encontrado ou já enviado (reabra para editar).' using errcode = 'P0001';
    end if;
    delete from public.orcamentos_pagamentos where orcamento_id = v_id;
    delete from public.orcamentos_trocas where orcamento_id = v_id;
  end if;
  for item in select * from jsonb_array_elements(coalesce(p_pagamentos, '[]')) loop
    insert into public.orcamentos_pagamentos (orcamento_id, forma, valor, banco_financiamento, parcelas, observacoes)
    values (v_id, (item ->> 'forma')::public.forma_pagamento_venda, (item ->> 'valor')::numeric, item ->> 'banco_financiamento',
            (item ->> 'parcelas')::integer, item ->> 'observacoes');
  end loop;
  for item in select * from jsonb_array_elements(coalesce(p_trocas, '[]')) loop
    insert into public.orcamentos_trocas (orcamento_id, consulta_id, placa, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, km, valor_fipe, valor_avaliacao, selo, observacoes)
    values (v_id, (item ->> 'consulta_id')::uuid, nullif(item ->> 'placa', ''), item ->> 'marca', item ->> 'modelo', item ->> 'versao',
            (item ->> 'ano_fabricacao')::integer, (item ->> 'ano_modelo')::integer, item ->> 'cor', (item ->> 'km')::integer,
            (item ->> 'valor_fipe')::numeric, (item ->> 'valor_avaliacao')::numeric, nullif(item ->> 'selo', '')::public.selo_consulta, item ->> 'observacoes');
  end loop;
  return v_id;
end
$$;
grant execute on function public.salvar_orcamento(uuid, jsonb, jsonb, jsonb) to authenticated;

-- Gerente ou dono decide o desconto (com motivo). Gerente não decide o próprio pedido.
create or replace function public.decidir_desconto(p_orcamento uuid, p_aprovar boolean, p_motivo text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  o public.orcamentos;
  v_piso numeric;
begin
  if not public.is_gestor() then
    raise exception 'Somente gerente ou dono aprovam descontos.' using errcode = '42501';
  end if;
  select * into o from public.orcamentos where id = p_orcamento for update;
  if o.id is null or o.desconto_status <> 'aguardando_aprovacao' then
    raise exception 'Este orçamento não tem desconto aguardando aprovação.' using errcode = 'P0001';
  end if;
  if not public.is_dono() and o.vendedor_id = auth.uid() then
    raise exception 'O próprio pedido de desconto é aprovado pelo dono.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Informe o motivo da decisão.' using errcode = 'P0001';
  end if;
  -- O gerente aprova até o próprio limite (se o dono definiu) e nunca abaixo do preço mínimo
  -- do carro nem do mínimo do consignante; além disso, só o dono.
  if p_aprovar and not public.is_dono() then
    select greatest(
             coalesce((select s.preco_minimo from public.veiculos_sigilo s where s.veiculo_id = o.veiculo_id), 0),
             coalesce((select c.valor_minimo_dono from public.consignacoes c where c.veiculo_id = o.veiculo_id and c.status = 'vigente' order by c.criado_em desc limit 1), 0),
             coalesce(round(o.preco_anunciado * (1 - nullif(cfg.desconto_limites ->> 'gerente', '')::numeric / 100), 2), 0))
      into v_piso
      from public.configuracoes cfg;
    if o.valor_final < v_piso then
      raise exception 'Este desconto passa do limite do gerente ou do preço mínimo do carro: só o dono aprova.' using errcode = '42501';
    end if;
  end if;
  update public.orcamentos
     set desconto_status = case when p_aprovar then 'aprovado'::public.status_desconto else 'recusado'::public.status_desconto end,
         desconto_aprovado_valor = case when p_aprovar then o.valor_final end,
         desconto_decidido_por = auth.uid(), desconto_decidido_em = now(), desconto_decisao_motivo = trim(p_motivo)
   where id = o.id;
end
$$;
grant execute on function public.decidir_desconto(uuid, boolean, text) to authenticated;

-- Envia: confere desconto, validade e valores, copia os alertas (não dá para ocultar) e agenda os lembretes.
create or replace function public.enviar_orcamento(p_orcamento uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  o public.orcamentos;
  v_soma numeric;
  v_token text;
begin
  select * into o from public.orcamentos where id = p_orcamento for update;
  if o.id is null or not (public.is_gestor() or o.vendedor_id = auth.uid()) then
    raise exception 'Orçamento não encontrado.' using errcode = '42501';
  end if;
  if o.status <> 'rascunho' then
    raise exception 'Só rascunho pode ser enviado (reabra para editar).' using errcode = 'P0001';
  end if;
  if o.desconto_status = 'aguardando_aprovacao' then
    raise exception 'O desconto aguarda aprovação do gerente ou do dono.' using errcode = 'P0001';
  end if;
  if o.desconto_status = 'recusado' then
    raise exception 'O desconto foi recusado: ajuste o valor.' using errcode = 'P0001';
  end if;
  if o.validade is null or o.validade < public.hoje() then
    raise exception 'Informe uma validade a partir de hoje.' using errcode = 'P0001';
  end if;
  select coalesce((select sum(valor) from public.orcamentos_pagamentos where orcamento_id = o.id), 0)
       + coalesce((select sum(valor_avaliacao) from public.orcamentos_trocas where orcamento_id = o.id), 0)
    into v_soma;
  if abs(v_soma - o.valor_final) > 0.009 then
    raise exception 'Formas de pagamento + trocas (%) precisam fechar o valor do orçamento (%).',
      public.moeda_br(v_soma), public.moeda_br(o.valor_final) using errcode = 'P0001';
  end if;
  v_token := coalesce(o.token_publico, translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_'));
  update public.orcamentos
     set status = 'enviado', enviado_em = now(), alertas = public.alertas_veiculo(o.veiculo_id), alertas_em = now(), token_publico = v_token
   where id = o.id;
  insert into public.tarefas (titulo, entidade, entidade_id, responsavel_id, prazo, origem, chave_automatica)
  values ('Retorno do orçamento ' || o.numero || ' (2 dias sem resposta)', 'orcamento', o.id, o.vendedor_id, public.hoje() + 2, 'automatica', 'orcamento:' || o.id || ':2d'),
         ('Retorno do orçamento ' || o.numero || ' (5 dias sem resposta)', 'orcamento', o.id, o.vendedor_id, public.hoje() + 5, 'automatica', 'orcamento:' || o.id || ':5d')
  on conflict (chave_automatica) do update set status = 'pendente', prazo = excluded.prazo, responsavel_id = excluded.responsavel_id;
  return v_token;
end
$$;
grant execute on function public.enviar_orcamento(uuid) to authenticated;

create or replace function public.cancelar_lembretes_orcamento(p_orcamento uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.tarefas set status = 'cancelada'
   where chave_automatica in ('orcamento:' || p_orcamento || ':2d', 'orcamento:' || p_orcamento || ':5d')
     and status in ('pendente', 'em_andamento')
$$;

revoke all on function public.cancelar_lembretes_orcamento(uuid) from public, anon, authenticated;

-- Cliente respondeu: aceito ou recusado (para os lembretes).
create or replace function public.responder_orcamento(p_orcamento uuid, p_aceito boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  o public.orcamentos;
begin
  select * into o from public.orcamentos where id = p_orcamento for update;
  if o.id is null or not (public.is_gestor() or o.vendedor_id = auth.uid()) then
    raise exception 'Orçamento não encontrado.' using errcode = '42501';
  end if;
  if o.status <> 'enviado' then
    raise exception 'Só orçamento enviado recebe resposta.' using errcode = 'P0001';
  end if;
  if p_aceito and o.validade < public.hoje() then
    raise exception 'Orçamento vencido: reabra, atualize a validade e reenvie.' using errcode = 'P0001';
  end if;
  update public.orcamentos
     set status = case when p_aceito then 'aceito'::public.status_orcamento else 'recusado'::public.status_orcamento end,
         respondido_em = now(), motivo_recusa = case when p_aceito then null else nullif(trim(coalesce(p_motivo, '')), '') end
   where id = o.id;
  perform public.cancelar_lembretes_orcamento(o.id);
end
$$;
grant execute on function public.responder_orcamento(uuid, boolean, text) to authenticated;

-- Reabre para editar (volta a rascunho). Não vale para orçamento que já virou venda.
create or replace function public.reabrir_orcamento(p_orcamento uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  o public.orcamentos;
begin
  select * into o from public.orcamentos where id = p_orcamento for update;
  if o.id is null or not (public.is_gestor() or o.vendedor_id = auth.uid()) then
    raise exception 'Orçamento não encontrado.' using errcode = '42501';
  end if;
  if o.venda_id is not null then
    raise exception 'Este orçamento já virou venda.' using errcode = 'P0001';
  end if;
  update public.orcamentos set status = 'rascunho', respondido_em = null, motivo_recusa = null where id = o.id;
  perform public.cancelar_lembretes_orcamento(o.id);
end
$$;
grant execute on function public.reabrir_orcamento(uuid) to authenticated;

create or replace function public.vincular_venda_orcamento(p_orcamento uuid, p_venda uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.orcamentos o set venda_id = p_venda
   where o.id = p_orcamento and o.status = 'aceito' and o.venda_id is null
     and (public.is_gestor() or o.vendedor_id = auth.uid())
     and exists (select 1 from public.vendas v where v.id = p_venda and v.veiculo_id = o.veiculo_id and v.cliente_id = o.cliente_id);
  if not found then
    raise exception 'Não foi possível ligar a venda ao orçamento.' using errcode = 'P0001';
  end if;
end
$$;

revoke all on function public.vincular_venda_orcamento(uuid, uuid) from public, anon;
grant execute on function public.vincular_venda_orcamento(uuid, uuid) to authenticated;

-- Orçamento aceito vira venda com um clique, levando valores, pagamentos e trocas.
-- Roda com a permissão de quem converte: a venda segue as mesmas regras de sempre.
create or replace function public.converter_orcamento_em_venda(p_orcamento uuid)
returns uuid language plpgsql set search_path = ''
as $$
declare
  o public.orcamentos;
  v_venda uuid;
begin
  select * into o from public.orcamentos where id = p_orcamento;
  if o.id is null then
    raise exception 'Orçamento não encontrado.' using errcode = '42501';
  end if;
  if o.status <> 'aceito' then
    raise exception 'Só orçamento aceito pelo cliente vira venda.' using errcode = 'P0001';
  end if;
  if o.venda_id is not null then
    raise exception 'Este orçamento já virou a venda.' using errcode = 'P0001';
  end if;
  v_venda := public.salvar_venda(
    null,
    jsonb_build_object('veiculo_id', o.veiculo_id, 'cliente_id', o.cliente_id, 'vendedor_id', o.vendedor_id,
                       'valor_venda', o.valor_final, 'valor_entrada', o.valor_entrada,
                       'observacoes', 'Gerada do orçamento ' || o.numero || coalesce('. ' || o.observacoes, '')),
    coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('forma', p.forma, 'valor', p.valor, 'banco_financiamento', p.banco_financiamento,
                                                'parcelas', p.parcelas, 'observacoes', p.observacoes)))
                from public.orcamentos_pagamentos p where p.orcamento_id = o.id), '[]'),
    coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('placa', t.placa, 'marca', t.marca, 'modelo', t.modelo, 'versao', t.versao,
                                                'ano_fabricacao', t.ano_fabricacao, 'ano_modelo', t.ano_modelo, 'cor', t.cor, 'km', t.km,
                                                'valor_fipe', t.valor_fipe, 'valor_avaliacao', t.valor_avaliacao, 'observacoes', t.observacoes)))
                from public.orcamentos_trocas t where t.orcamento_id = o.id), '[]')
  );
  perform public.vincular_venda_orcamento(o.id, v_venda);
  return v_venda;
end
$$;
grant execute on function public.converter_orcamento_em_venda(uuid) to authenticated;

-- Página pública do orçamento (link do WhatsApp). Sem CPF nem telefone do cliente.
create or replace function public.orcamento_publico(p_token text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'numero', o.numero, 'status', o.status, 'validade', o.validade, 'vencido', o.validade < public.hoje(),
    'cliente', split_part(c.nome, ' ', 1),
    'vendedor', split_part(u.nome, ' ', 1),
    'veiculo', jsonb_build_object('marca', v.marca, 'modelo', v.modelo, 'versao', v.versao, 'ano_fabricacao', v.ano_fabricacao,
                                  'ano_modelo', v.ano_modelo, 'cor', v.cor, 'km', v.km, 'combustivel', v.combustivel, 'cambio', v.cambio),
    'preco_anunciado', o.preco_anunciado, 'desconto', o.desconto, 'valor_final', o.valor_final, 'valor_entrada', o.valor_entrada,
    'simulacao', o.simulacao, 'observacoes', o.observacoes, 'alertas', o.alertas, 'alertas_em', o.alertas_em, 'enviado_em', o.enviado_em,
    'pagamentos', coalesce((select jsonb_agg(jsonb_build_object('forma', p.forma, 'valor', p.valor, 'banco', p.banco_financiamento, 'parcelas', p.parcelas))
                              from public.orcamentos_pagamentos p where p.orcamento_id = o.id), '[]'),
    'trocas', coalesce((select jsonb_agg(jsonb_build_object('marca', t.marca, 'modelo', t.modelo, 'ano_modelo', t.ano_modelo, 'valor_avaliacao', t.valor_avaliacao))
                          from public.orcamentos_trocas t where t.orcamento_id = o.id), '[]'),
    'loja', jsonb_build_object('nome', cfg.nome_loja, 'cidade', cfg.cidade, 'uf', cfg.uf, 'whatsapp', cfg.whatsapp_numero,
                               'telefones', cfg.telefones_assinatura, 'assinatura', cfg.assinatura)
  )
  from public.orcamentos o
  join public.veiculos v on v.id = o.veiculo_id
  join public.clientes c on c.id = o.cliente_id
  join public.usuarios u on u.id = o.vendedor_id
  cross join public.configuracoes cfg
  where o.token_publico = p_token and length(p_token) >= 20 and o.status in ('enviado', 'aceito')
$$;
grant execute on function public.orcamento_publico(text) to anon, authenticated;

create or replace view public.v_orcamentos with (security_invoker = true) as
select
  o.*,
  case when o.status = 'enviado' and o.validade < public.hoje() then 'expirado'::public.status_orcamento else o.status end as status_efetivo,
  v.marca || ' ' || v.modelo || coalesce(' ' || v.versao, '') as veiculo_nome,
  v.placa as veiculo_placa,
  v.ano_modelo as veiculo_ano,
  cl.nome as cliente_nome,
  coalesce(cl.whatsapp, cl.telefone) as cliente_telefone,
  u.nome as vendedor_nome,
  (select count(*) from public.orcamentos_trocas t where t.orcamento_id = o.id)::int as qtd_trocas,
  case when o.status = 'enviado' then public.hoje() - (o.enviado_em at time zone 'America/Sao_Paulo')::date end as dias_sem_resposta
from public.orcamentos o
join public.veiculos v on v.id = o.veiculo_id
join public.clientes cl on cl.id = o.cliente_id
join public.usuarios u on u.id = o.vendedor_id;
grant select on public.v_orcamentos to authenticated;

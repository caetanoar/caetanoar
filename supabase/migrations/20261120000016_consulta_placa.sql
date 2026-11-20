-- =============================================================================
-- Caetano Auto CRM — 0016 Consulta por placa
-- Cada consulta externa vira um registro datado (provedor, data e hora, usuário,
-- custo). O resultado normalizado fica visível à equipe; a resposta bruta do
-- provedor fica só com dono e gerente, e sai sem nome/CPF do proprietário.
-- =============================================================================

create type public.selo_consulta as enum ('verde', 'amarelo', 'vermelho');
create type public.status_consulta as enum ('encontrado', 'nao_encontrado', 'erro');

alter table public.configuracoes
  add column consulta_cache_dias integer not null default 7 check (consulta_cache_dias >= 0),
  add column consulta_validade_venda_dias integer not null default 7 check (consulta_validade_venda_dias >= 1),
  add column consulta_limite_mensal_qtd integer check (consulta_limite_mensal_qtd > 0),
  add column consulta_limite_mensal_valor numeric(12, 2) check (consulta_limite_mensal_valor > 0),
  add column consulta_custo_unitario numeric(12, 2) not null default 0 check (consulta_custo_unitario >= 0);

comment on column public.configuracoes.consulta_limite_mensal_qtd is 'Limite de consultas externas no mês (vazio = sem limite). Definido pelo dono.';
comment on column public.configuracoes.consulta_custo_unitario is 'Custo de cada consulta no contrato do provedor (o provedor simulado custa zero).';

create table public.consultas_veiculares (
  id uuid primary key default gen_random_uuid(),
  placa text not null check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  provedor text not null,
  simulado boolean not null default false,
  status public.status_consulta not null,
  consultado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usuario_id uuid not null references public.usuarios (id),
  custo numeric(12, 2) not null default 0 check (custo >= 0),
  veiculo_id uuid references public.veiculos (id) on delete set null,
  dados jsonb not null default '{}',
  verificacoes jsonb not null default '{}',
  selo public.selo_consulta,
  erro text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index consultas_veiculares_placa_idx on public.consultas_veiculares (placa, consultado_em desc);
create index consultas_veiculares_mes_idx on public.consultas_veiculares (consultado_em);
select public.preparar_tabela('public.consultas_veiculares');

-- Resultado normalizado: toda a equipe ativa vê (vendedor usa no orçamento e na venda).
create policy consultas_ver on public.consultas_veiculares for select to authenticated using ((select public.is_ativo()));
-- Só a gestão vincula a consulta a um carro do estoque; só o dono apaga. Inserção só pela função.
create policy consultas_gestor_altera on public.consultas_veiculares for update to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));
create policy consultas_dono_exclui on public.consultas_veiculares for delete to authenticated using ((select public.is_dono()));
revoke insert on public.consultas_veiculares from authenticated;

create table public.consultas_veiculares_brutos (
  consulta_id uuid primary key references public.consultas_veiculares (id) on delete cascade,
  resposta jsonb not null,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
select public.preparar_tabela('public.consultas_veiculares_brutos', 'consulta_id');
create policy consultas_brutos_gestor on public.consultas_veiculares_brutos for select to authenticated using ((select public.is_gestor()));
revoke insert, update, delete on public.consultas_veiculares_brutos from authenticated;

-- Uso do mês (para o limite): conta todas as consultas externas, de todos os usuários.
create or replace function public.uso_consultas_mes()
returns table (qtd integer, valor numeric, limite_qtd integer, limite_valor numeric, custo_unitario numeric)
language sql stable security definer set search_path = ''
as $$
  select
    (select count(*)::int from public.consultas_veiculares c
      where c.consultado_em >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
        and c.status <> 'erro'),
    (select coalesce(sum(c.custo), 0) from public.consultas_veiculares c
      where c.consultado_em >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
    cfg.consulta_limite_mensal_qtd, cfg.consulta_limite_mensal_valor, cfg.consulta_custo_unitario
  from public.configuracoes cfg
  where public.is_ativo()
$$;
grant execute on function public.uso_consultas_mes() to authenticated;

-- Pode consultar agora? (perfil com permissão e limite do mês)
create or replace function public.consulta_disponivel()
returns text language plpgsql stable security definer set search_path = ''
as $$
declare
  u record;
begin
  if not public.tem_papel('dono', 'gerente', 'vendedor', 'administrativo') then
    return 'Seu perfil não faz consultas externas de placa.';
  end if;
  select * into u from public.uso_consultas_mes();
  if u.limite_qtd is not null and u.qtd >= u.limite_qtd then
    return format('Limite mensal de %s consultas atingido. Fale com o dono.', u.limite_qtd);
  end if;
  if u.limite_valor is not null and u.valor + coalesce(u.custo_unitario, 0) > u.limite_valor then
    return 'Limite mensal de gasto com consultas atingido. Fale com o dono.';
  end if;
  return null;
end
$$;
grant execute on function public.consulta_disponivel() to authenticated;

-- Grava a consulta (o servidor chamou o provedor e normalizou o resultado).
create or replace function public.registrar_consulta(p_consulta jsonb, p_bruto jsonb default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_placa text := upper(regexp_replace(coalesce(p_consulta ->> 'placa', ''), '[^A-Za-z0-9]', '', 'g'));
  v_status public.status_consulta := (p_consulta ->> 'status')::public.status_consulta;
  v_motivo text;
  cfg public.configuracoes;
begin
  v_motivo := public.consulta_disponivel();
  if v_motivo is not null and v_status <> 'erro' then
    raise exception '%', v_motivo using errcode = '42501';
  end if;
  select * into cfg from public.configuracoes;
  insert into public.consultas_veiculares (placa, provedor, simulado, status, expira_em, usuario_id, custo, veiculo_id, dados, verificacoes, selo, erro)
  values (
    v_placa,
    p_consulta ->> 'provedor',
    coalesce((p_consulta ->> 'simulado')::boolean, false),
    v_status,
    now() + make_interval(days => cfg.consulta_cache_dias),
    auth.uid(),
    case when v_status = 'erro' then 0 else coalesce((p_consulta ->> 'custo')::numeric, cfg.consulta_custo_unitario) end,
    (select v.id from public.veiculos v where v.placa = v_placa order by (v.status in ('vendido', 'devolvido')), v.data_entrada desc limit 1),
    coalesce(p_consulta -> 'dados', '{}'),
    coalesce(p_consulta -> 'verificacoes', '{}'),
    nullif(p_consulta ->> 'selo', '')::public.selo_consulta,
    p_consulta ->> 'erro'
  )
  returning id into v_id;
  if p_bruto is not null then
    insert into public.consultas_veiculares_brutos (consulta_id, resposta) values (v_id, p_bruto);
  end if;
  return v_id;
end
$$;
grant execute on function public.registrar_consulta(jsonb, jsonb) to authenticated;

-- Painel de uso (gestão): quantidade e custo por mês e por usuário.
create or replace view public.v_consultas_uso with (security_invoker = true) as
select
  date_trunc('month', c.consultado_em at time zone 'America/Sao_Paulo')::date as mes,
  c.usuario_id,
  u.nome as usuario_nome,
  count(*) filter (where c.status <> 'erro')::int as qtd,
  count(*) filter (where c.status = 'erro')::int as erros,
  coalesce(sum(c.custo), 0)::numeric(12, 2) as custo
from public.consultas_veiculares c
join public.usuarios u on u.id = c.usuario_id
where public.is_gestor()
group by 1, 2, 3;
grant select on public.v_consultas_uso to authenticated;

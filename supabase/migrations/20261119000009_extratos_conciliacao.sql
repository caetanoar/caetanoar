-- =============================================================================
-- Caetano Auto CRM — 0009 Extratos bancários e conciliação
-- Importação de OFX/CSV (e Open Finance, quando ligado), deduplicação e
-- conciliação com os lançamentos. Somente dono e gerente.
-- =============================================================================

create type public.origem_extrato as enum ('ofx', 'csv', 'open_finance');
create type public.status_transacao as enum ('pendente', 'conciliada', 'ignorada');

create table public.extratos_importacoes (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas_financeiras (id) on delete cascade,
  origem public.origem_extrato not null,
  nome_arquivo text,
  arquivo_id uuid references public.arquivos (id) on delete set null,
  periodo_inicio date,
  periodo_fim date,
  qtd_transacoes integer not null default 0,
  qtd_novas integer not null default 0,
  saldo_final numeric(14, 2),
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
select public.preparar_tabela('public.extratos_importacoes');
create policy importacoes_gestor on public.extratos_importacoes for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

create table public.extratos_transacoes (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid references public.extratos_importacoes (id) on delete cascade,
  conta_id uuid not null references public.contas_financeiras (id) on delete cascade,
  data date not null,
  valor numeric(14, 2) not null check (valor <> 0),
  descricao text not null default '',
  documento text,
  fitid text,
  hash text not null,
  status public.status_transacao not null default 'pendente',
  lancamento_id uuid references public.lancamentos (id) on delete set null,
  conciliado_em timestamptz,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  unique (conta_id, hash)
);
create index extratos_transacoes_status_idx on public.extratos_transacoes (conta_id, status, data);
select public.preparar_tabela('public.extratos_transacoes');
create policy transacoes_gestor on public.extratos_transacoes for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

alter table public.lancamentos
  add constraint lancamentos_extrato_fk foreign key (extrato_transacao_id) references public.extratos_transacoes (id) on delete set null;

create table public.extratos_layouts_csv (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  separador text not null default ';',
  coluna_data text not null,
  coluna_descricao text not null,
  coluna_valor text,
  coluna_debito text,
  coluna_credito text,
  formato_data text not null default 'dd/mm/aaaa' check (formato_data in ('dd/mm/aaaa', 'aaaa-mm-dd', 'dd/mm/aa')),
  decimal text not null default ',' check (decimal in (',', '.')),
  linhas_ignorar integer not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  check (coluna_valor is not null or (coluna_debito is not null and coluna_credito is not null))
);
select public.preparar_tabela('public.extratos_layouts_csv');
create policy layouts_gestor on public.extratos_layouts_csv for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

create table public.open_finance_conexoes (
  id uuid primary key default gen_random_uuid(),
  provedor text not null default 'pluggy',
  item_id text not null,
  conta_externa_id text,
  conta_id uuid references public.contas_financeiras (id) on delete set null,
  nome text,
  status text not null default 'ativa',
  ultimo_sync timestamptz,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  unique (provedor, item_id, conta_externa_id)
);
select public.preparar_tabela('public.open_finance_conexoes');
create policy open_finance_gestor on public.open_finance_conexoes for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Conciliação
-- -----------------------------------------------------------------------------
-- Candidatos: mesmo sentido, mesmo valor, até 7 dias de diferença, ainda não conciliados.
create or replace function public.sugestoes_conciliacao(p_transacao uuid)
returns table (lancamento_id uuid, descricao text, valor numeric, data date, status public.status_lancamento, conta_id uuid, pontuacao integer)
language sql stable set search_path = ''
as $$
  with t as (select * from public.extratos_transacoes where id = p_transacao)
  select l.id, l.descricao, l.valor, coalesce(l.data_pagamento, l.data_vencimento), l.status, l.conta_id,
         (100 - least(abs(coalesce(l.data_pagamento, l.data_vencimento) - t.data), 7) * 10
              + case when l.conta_id = t.conta_id then 5 else 0 end)::int as pontuacao
    from public.lancamentos l, t
   where public.is_gestor()
     and not l.conciliado
     and l.status in ('pendente', 'pago')
     and abs(l.valor - abs(t.valor)) < 0.005
     and ((t.valor > 0 and l.tipo in ('receita', 'transferencia_entrada')) or (t.valor < 0 and l.tipo in ('despesa', 'transferencia_saida')))
     and (l.conta_id is null or l.conta_id = t.conta_id)
     and (l.status = 'pendente' or l.conta_id = t.conta_id)
     and abs(coalesce(l.data_pagamento, l.data_vencimento) - t.data) <= 7
   order by pontuacao desc, abs(coalesce(l.data_pagamento, l.data_vencimento) - t.data)
   limit 5
$$;
grant execute on function public.sugestoes_conciliacao(uuid) to authenticated;

create or replace function public.conciliar_transacao(p_transacao uuid, p_lancamento uuid)
returns void language plpgsql set search_path = ''
as $$
declare
  t public.extratos_transacoes;
  l public.lancamentos;
begin
  if not public.is_gestor() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  select * into t from public.extratos_transacoes where id = p_transacao for update;
  select * into l from public.lancamentos where id = p_lancamento for update;
  if t.id is null or l.id is null then
    raise exception 'Transação ou lançamento não encontrado.' using errcode = 'P0001';
  end if;
  if t.status <> 'pendente' then
    raise exception 'Transação já conciliada ou ignorada.' using errcode = 'P0001';
  end if;
  if l.conciliado then
    raise exception 'Lançamento já conciliado com outra transação.' using errcode = 'P0001';
  end if;
  if abs(l.valor - abs(t.valor)) >= 0.005 then
    raise exception 'Valores diferentes (extrato % × lançamento %).', abs(t.valor), l.valor using errcode = 'P0001';
  end if;
  if (t.valor > 0) <> (l.tipo in ('receita', 'transferencia_entrada')) then
    raise exception 'Entrada no extrato só concilia com receita (e saída com despesa).' using errcode = 'P0001';
  end if;
  if l.status = 'pago' and l.conta_id is distinct from t.conta_id then
    raise exception 'O lançamento foi pago por outra conta.' using errcode = 'P0001';
  end if;
  if l.status = 'cancelado' then
    raise exception 'Lançamento cancelado.' using errcode = 'P0001';
  end if;

  update public.lancamentos
     set status = 'pago',
         data_pagamento = case when status = 'pendente' then t.data else data_pagamento end,
         conta_id = t.conta_id,
         forma_pagamento = coalesce(forma_pagamento, 'ted'),
         conciliado = true,
         extrato_transacao_id = t.id
   where id = l.id;
  update public.extratos_transacoes set status = 'conciliada', lancamento_id = l.id, conciliado_em = now() where id = t.id;
end
$$;
grant execute on function public.conciliar_transacao(uuid, uuid) to authenticated;

create or replace function public.lancar_transacao(p_transacao uuid, p_categoria uuid, p_descricao text default null)
returns uuid language plpgsql set search_path = ''
as $$
declare
  t public.extratos_transacoes;
  v_id uuid;
begin
  if not public.is_gestor() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  select * into t from public.extratos_transacoes where id = p_transacao for update;
  if t.status <> 'pendente' then
    raise exception 'Transação já tratada.' using errcode = 'P0001';
  end if;
  insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, data_pagamento, status, forma_pagamento, conta_id, conciliado, extrato_transacao_id)
  values ((case when t.valor > 0 then 'receita' else 'despesa' end)::public.tipo_lancamento,
          coalesce(nullif(trim(p_descricao), ''), nullif(t.descricao, ''), 'Movimento do extrato'),
          p_categoria, abs(t.valor), t.data, t.data, t.data, 'pago', 'ted', t.conta_id, true, t.id)
  returning id into v_id;
  update public.extratos_transacoes set status = 'conciliada', lancamento_id = v_id, conciliado_em = now() where id = t.id;
  return v_id;
end
$$;
grant execute on function public.lancar_transacao(uuid, uuid, text) to authenticated;

create or replace function public.desfazer_conciliacao(p_transacao uuid)
returns void language plpgsql set search_path = ''
as $$
declare
  t public.extratos_transacoes;
begin
  if not public.is_gestor() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  select * into t from public.extratos_transacoes where id = p_transacao for update;
  if t.lancamento_id is not null then
    update public.lancamentos set conciliado = false, extrato_transacao_id = null where id = t.lancamento_id;
  end if;
  update public.extratos_transacoes set status = 'pendente', lancamento_id = null, conciliado_em = null where id = t.id;
end
$$;
grant execute on function public.desfazer_conciliacao(uuid) to authenticated;

-- Concilia sozinho o que tem exatamente um candidato forte (mesmo valor, até 1 dia).
create or replace function public.conciliar_automatico(p_conta uuid)
returns integer language plpgsql set search_path = ''
as $$
declare
  t record;
  v_qtd integer := 0;
  v_cands uuid[];
begin
  if not public.is_gestor() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  for t in select id from public.extratos_transacoes where conta_id = p_conta and status = 'pendente' order by data loop
    select array_agg(s.lancamento_id) into v_cands from public.sugestoes_conciliacao(t.id) s where s.pontuacao >= 90;
    if array_length(v_cands, 1) = 1 then
      begin
        perform public.conciliar_transacao(t.id, v_cands[1]);
        v_qtd := v_qtd + 1;
      exception when others then
        null;
      end;
    end if;
  end loop;
  return v_qtd;
end
$$;
grant execute on function public.conciliar_automatico(uuid) to authenticated;

create or replace view public.v_extrato with (security_invoker = true) as
select
  t.*,
  l.descricao as lancamento_descricao,
  c.nome as conta_nome
from public.extratos_transacoes t
left join public.lancamentos l on l.id = t.lancamento_id
join public.contas_financeiras c on c.id = t.conta_id
where public.is_gestor();
grant select on public.v_extrato to authenticated;

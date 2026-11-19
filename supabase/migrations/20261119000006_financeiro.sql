-- =============================================================================
-- Caetano Auto CRM — 0006 Financeiro
-- Contas (caixa e bancos), categorias, lançamentos (a pagar / a receber /
-- movimentações), transferências e saldos. Somente dono e gerente.
-- Categorias de natureza "terceiros" (dinheiro do consignante) não entram na
-- receita da loja nos relatórios.
-- =============================================================================

create type public.tipo_conta as enum ('caixa', 'banco', 'carteira_digital');
create type public.tipo_lancamento as enum ('receita', 'despesa', 'transferencia_saida', 'transferencia_entrada');
create type public.status_lancamento as enum ('pendente', 'pago', 'cancelado');
create type public.forma_pagamento as enum
  ('dinheiro', 'pix', 'ted', 'boleto', 'cartao_credito', 'cartao_debito', 'financiamento', 'cheque', 'permuta', 'outro');
create type public.natureza_categoria as enum ('operacional', 'terceiros', 'transferencia', 'estoque');

-- -----------------------------------------------------------------------------
-- Contas
-- -----------------------------------------------------------------------------
create table public.contas_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (length(trim(nome)) >= 2),
  tipo public.tipo_conta not null default 'banco',
  banco text,
  agencia text,
  conta text,
  saldo_inicial numeric(14, 2) not null default 0,
  data_saldo_inicial date not null default public.hoje(),
  ativa boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
select public.preparar_tabela('public.contas_financeiras');
create policy contas_gestor on public.contas_financeiras for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Categorias
-- -----------------------------------------------------------------------------
create table public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) >= 2),
  tipo text not null check (tipo in ('receita', 'despesa')),
  grupo text not null default 'Geral',
  natureza public.natureza_categoria not null default 'operacional',
  sistema text unique,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  unique (nome, tipo)
);
comment on column public.categorias_financeiras.sistema is 'Código usado pelas automações (venda, compra, custos, comissões, repasse). Não pode ser removida.';
select public.preparar_tabela('public.categorias_financeiras');
create policy categorias_gestor on public.categorias_financeiras for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

create or replace function public.proteger_categoria_sistema()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.sistema is not null then
    raise exception 'Categoria usada pelas automações não pode ser excluída (pode ser renomeada).' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and old.sistema is not null and (new.sistema is distinct from old.sistema or new.tipo <> old.tipo or new.natureza <> old.natureza) then
    raise exception 'Tipo e natureza de categoria do sistema não podem mudar.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end
$$;
create trigger proteger_categoria_sistema before update or delete on public.categorias_financeiras
  for each row execute function public.proteger_categoria_sistema();

create or replace function public.categoria_sistema(p_codigo text)
returns uuid language sql stable security definer set search_path = ''
as $$ select id from public.categorias_financeiras where sistema = p_codigo $$;
grant execute on function public.categoria_sistema(text) to authenticated;

insert into public.categorias_financeiras (nome, tipo, grupo, natureza, sistema) values
  ('Venda de veículo próprio', 'receita', 'Vendas', 'operacional', 'venda_veiculo'),
  ('Comissão de consignação', 'receita', 'Vendas', 'operacional', 'comissao_consignacao'),
  ('Recebimento de venda consignada (valores de terceiros)', 'receita', 'Valores de terceiros', 'terceiros', 'venda_consignado'),
  ('Outras receitas', 'receita', 'Outras', 'operacional', null),
  ('Aporte de sócio / empréstimo', 'receita', 'Financiamentos e aportes', 'terceiros', null),
  ('Transferência recebida', 'receita', 'Transferências', 'transferencia', 'transferencia_entrada'),
  ('Compra de veículo', 'despesa', 'Estoque', 'estoque', 'compra_veiculo'),
  ('Custo de preparação', 'despesa', 'Veículos', 'operacional', 'custo_preparacao'),
  ('Comissão de vendedor', 'despesa', 'Comissões', 'operacional', 'comissao_vendedor'),
  ('Comissão de indicação', 'despesa', 'Comissões', 'operacional', 'comissao_indicacao'),
  ('Repasse a consignante (valores de terceiros)', 'despesa', 'Valores de terceiros', 'terceiros', 'repasse_consignante'),
  ('Custo de garantia', 'despesa', 'Veículos', 'operacional', 'custo_garantia'),
  ('Transferência enviada', 'despesa', 'Transferências', 'transferencia', 'transferencia_saida'),
  ('Aluguel', 'despesa', 'Estrutura', 'operacional', null),
  ('Energia, água e internet', 'despesa', 'Estrutura', 'operacional', null),
  ('Salários e pró-labore', 'despesa', 'Pessoal', 'operacional', null),
  ('Impostos e taxas', 'despesa', 'Impostos', 'operacional', null),
  ('Marketing e anúncios', 'despesa', 'Comercial', 'operacional', null),
  ('Despachante e documentação', 'despesa', 'Veículos', 'operacional', null),
  ('Tarifas bancárias', 'despesa', 'Financeiras', 'operacional', null),
  ('Manutenção da loja', 'despesa', 'Estrutura', 'operacional', null),
  ('Outras despesas', 'despesa', 'Outras', 'operacional', null);

-- -----------------------------------------------------------------------------
-- Transferências e lançamentos
-- -----------------------------------------------------------------------------
create table public.transferencias (
  id uuid primary key default gen_random_uuid(),
  conta_origem_id uuid not null references public.contas_financeiras (id) on delete restrict,
  conta_destino_id uuid not null references public.contas_financeiras (id) on delete restrict,
  valor numeric(14, 2) not null check (valor > 0),
  data date not null default public.hoje(),
  descricao text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  check (conta_origem_id <> conta_destino_id)
);
select public.preparar_tabela('public.transferencias');
create policy transferencias_gestor on public.transferencias for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_lancamento not null,
  descricao text not null check (length(trim(descricao)) >= 2),
  categoria_id uuid not null references public.categorias_financeiras (id) on delete restrict,
  valor numeric(14, 2) not null check (valor > 0),
  data_competencia date not null default public.hoje(),
  data_vencimento date not null default public.hoje(),
  data_pagamento date,
  status public.status_lancamento not null default 'pendente',
  forma_pagamento public.forma_pagamento,
  conta_id uuid references public.contas_financeiras (id) on delete restrict,
  parcela_numero integer check (parcela_numero > 0),
  parcela_total integer check (parcela_total > 0),
  grupo_parcelas uuid,
  conciliado boolean not null default false,
  extrato_transacao_id uuid,
  veiculo_id uuid references public.veiculos (id) on delete set null,
  venda_id uuid,
  comissao_id uuid,
  custo_veiculo_id uuid references public.custos_veiculo (id) on delete set null,
  garantia_acionamento_id uuid,
  nota_fiscal_id uuid,
  fornecedor_id uuid references public.fornecedores (id) on delete set null,
  cliente_id uuid references public.clientes (id) on delete set null,
  consignante_id uuid references public.consignantes (id) on delete set null,
  parceiro_id uuid references public.parceiros (id) on delete set null,
  usuario_id uuid references public.usuarios (id) on delete set null,
  transferencia_id uuid references public.transferencias (id) on delete cascade,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint lancamento_pago_completo check (
    status <> 'pago' or (data_pagamento is not null and (conta_id is not null or forma_pagamento = 'permuta'))
  ),
  constraint lancamento_transferencia check ((tipo in ('transferencia_saida', 'transferencia_entrada')) = (transferencia_id is not null)),
  constraint lancamento_parcelas check (parcela_numero is null or parcela_total is null or parcela_numero <= parcela_total)
);
create index lancamentos_status_venc_idx on public.lancamentos (status, data_vencimento);
create index lancamentos_conta_idx on public.lancamentos (conta_id, data_pagamento) where status = 'pago';
create index lancamentos_competencia_idx on public.lancamentos (data_competencia);
create index lancamentos_veiculo_idx on public.lancamentos (veiculo_id);
create index lancamentos_venda_idx on public.lancamentos (venda_id);
create index lancamentos_custo_idx on public.lancamentos (custo_veiculo_id);
create index lancamentos_grupo_idx on public.lancamentos (grupo_parcelas);
select public.preparar_tabela('public.lancamentos');
create policy lancamentos_gestor on public.lancamentos for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- Coerência: tipo do lançamento x tipo da categoria; não altera valor de lançamento conciliado.
create or replace function public.validar_lancamento()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_tipo_cat text;
begin
  select c.tipo into v_tipo_cat from public.categorias_financeiras c where c.id = new.categoria_id;
  if (new.tipo in ('receita', 'transferencia_entrada') and v_tipo_cat <> 'receita')
     or (new.tipo in ('despesa', 'transferencia_saida') and v_tipo_cat <> 'despesa') then
    raise exception 'A categoria escolhida não combina com o tipo do lançamento.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and old.conciliado and (new.valor <> old.valor or new.conta_id is distinct from old.conta_id or new.status <> old.status)
     and new.conciliado then
    raise exception 'Lançamento conciliado com o extrato: desfaça a conciliação antes de alterar valor, conta ou situação.' using errcode = 'P0001';
  end if;
  if new.status <> 'pago' then
    new.data_pagamento := null;
    new.conciliado := false;
  end if;
  return new;
end
$$;
create trigger validar_lancamento before insert or update on public.lancamentos
  for each row execute function public.validar_lancamento();

-- -----------------------------------------------------------------------------
-- Operações
-- -----------------------------------------------------------------------------
create or replace function public.transferir(p_origem uuid, p_destino uuid, p_valor numeric, p_data date default null, p_descricao text default null)
returns uuid language plpgsql set search_path = ''
as $$
declare
  v_id uuid;
  v_data date := coalesce(p_data, public.hoje());
  v_desc text := coalesce(nullif(trim(p_descricao), ''), 'Transferência entre contas');
begin
  if not public.is_gestor() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  insert into public.transferencias (conta_origem_id, conta_destino_id, valor, data, descricao)
  values (p_origem, p_destino, p_valor, v_data, v_desc) returning id into v_id;
  insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, data_pagamento, status, forma_pagamento, conta_id, transferencia_id)
  values
    ('transferencia_saida', v_desc, public.categoria_sistema('transferencia_saida'), p_valor, v_data, v_data, v_data, 'pago', 'ted', p_origem, v_id),
    ('transferencia_entrada', v_desc, public.categoria_sistema('transferencia_entrada'), p_valor, v_data, v_data, v_data, 'pago', 'ted', p_destino, v_id);
  return v_id;
end
$$;
grant execute on function public.transferir(uuid, uuid, numeric, date, text) to authenticated;

create or replace function public.baixar_lancamento(p_id uuid, p_data date, p_conta uuid, p_forma public.forma_pagamento default null, p_valor numeric default null)
returns void language plpgsql set search_path = ''
as $$
declare
  l public.lancamentos;
begin
  if not public.is_gestor() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  select * into l from public.lancamentos where id = p_id for update;
  if not found then
    raise exception 'Lançamento não encontrado.' using errcode = 'P0001';
  end if;
  if l.status <> 'pendente' then
    raise exception 'Só lançamentos pendentes podem ser baixados.' using errcode = 'P0001';
  end if;
  update public.lancamentos
     set status = 'pago',
         data_pagamento = coalesce(p_data, public.hoje()),
         conta_id = coalesce(p_conta, conta_id),
         forma_pagamento = coalesce(p_forma, forma_pagamento),
         valor = coalesce(p_valor, valor)
   where id = p_id;
end
$$;
grant execute on function public.baixar_lancamento(uuid, date, uuid, public.forma_pagamento, numeric) to authenticated;

create or replace function public.estornar_baixa(p_id uuid)
returns void language plpgsql set search_path = ''
as $$
begin
  if not public.is_gestor() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if exists (select 1 from public.lancamentos where id = p_id and transferencia_id is not null) then
    raise exception 'Para desfazer uma transferência, exclua a transferência.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.lancamentos where id = p_id and conciliado) then
    raise exception 'Desfaça a conciliação com o extrato antes de estornar.' using errcode = 'P0001';
  end if;
  update public.lancamentos set status = 'pendente' where id = p_id and status = 'pago';
end
$$;
grant execute on function public.estornar_baixa(uuid) to authenticated;

-- Cria um lançamento (opcionalmente parcelado mês a mês). SECURITY INVOKER.
create or replace function public.criar_lancamento(p_dados jsonb, p_parcelas integer default 1)
returns uuid language plpgsql set search_path = ''
as $$
declare
  v_grupo uuid := case when p_parcelas > 1 then gen_random_uuid() end;
  v_primeiro uuid;
  v_id uuid;
  v_total numeric := (p_dados ->> 'valor')::numeric;
  v_parcela numeric;
  v_venc date := coalesce((p_dados ->> 'data_vencimento')::date, public.hoje());
  i integer;
begin
  if not public.is_gestor() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if p_parcelas < 1 or p_parcelas > 120 then
    raise exception 'Número de parcelas inválido.' using errcode = 'P0001';
  end if;
  for i in 1..p_parcelas loop
    v_parcela := case
      when p_parcelas = 1 then v_total
      when i < p_parcelas then round(v_total / p_parcelas, 2)
      else v_total - round(v_total / p_parcelas, 2) * (p_parcelas - 1)
    end;
    v_id := interno.inserir('public.lancamentos',
      p_dados || jsonb_build_object(
        'valor', v_parcela,
        'data_vencimento', (v_venc + make_interval(months => i - 1))::date,
        'descricao', case when p_parcelas > 1 then (p_dados ->> 'descricao') || format(' (%s/%s)', i, p_parcelas) else p_dados ->> 'descricao' end,
        'parcela_numero', case when p_parcelas > 1 then i end,
        'parcela_total', case when p_parcelas > 1 then p_parcelas end,
        'grupo_parcelas', v_grupo,
        'status', case when i = 1 then coalesce(p_dados ->> 'status', 'pendente') else 'pendente' end,
        'data_pagamento', case when i = 1 then p_dados -> 'data_pagamento' else null end
      ));
    v_primeiro := coalesce(v_primeiro, v_id);
  end loop;
  return v_primeiro;
end
$$;
grant execute on function public.criar_lancamento(jsonb, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Integração com o estoque: custos de preparação e compra viram contas a pagar
-- -----------------------------------------------------------------------------
alter table public.custos_veiculo add column lancar_financeiro boolean not null default true;

create or replace function public.custo_para_financeiro()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_veiculo text;
  l public.lancamentos;
begin
  if tg_op = 'INSERT' then
    if not new.lancar_financeiro then
      return new;
    end if;
    select v.marca || ' ' || v.modelo into v_veiculo from public.veiculos v where v.id = new.veiculo_id;
    insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, veiculo_id, fornecedor_id, custo_veiculo_id)
    values ('despesa',
            initcap(new.tipo::text) || coalesce(' — ' || new.descricao, '') || ' (' || v_veiculo || ')',
            public.categoria_sistema('custo_preparacao'), new.valor, new.data, new.data, new.veiculo_id, new.fornecedor_id, new.id);
    return new;
  end if;

  select * into l from public.lancamentos where custo_veiculo_id = coalesce(new.id, old.id) and status <> 'cancelado' limit 1;
  if tg_op = 'UPDATE' then
    if found and l.status = 'pendente' then
      update public.lancamentos set valor = new.valor, data_competencia = new.data, fornecedor_id = new.fornecedor_id where id = l.id;
    elsif found and l.status = 'pago' and new.valor <> old.valor then
      raise exception 'O custo já foi pago no financeiro. Estorne o pagamento antes de mudar o valor.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- DELETE
  if found and l.status = 'pago' then
    raise exception 'O custo já foi pago no financeiro. Estorne o pagamento antes de excluir.' using errcode = 'P0001';
  elsif found then
    delete from public.lancamentos where id = l.id;
  end if;
  return old;
end
$$;
create trigger custo_para_financeiro_ins after insert on public.custos_veiculo
  for each row execute function public.custo_para_financeiro();
create trigger custo_para_financeiro_upd after update on public.custos_veiculo
  for each row execute function public.custo_para_financeiro();
create trigger custo_para_financeiro_del before delete on public.custos_veiculo
  for each row execute function public.custo_para_financeiro();

-- Compra de carro próprio (origem "compra") gera conta a pagar ao fornecedor.
create or replace function public.compra_para_financeiro()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v public.veiculos;
  l public.lancamentos;
begin
  select * into v from public.veiculos where id = new.veiculo_id;
  if v.tipo <> 'proprio' or v.origem <> 'compra' or new.valor_compra is null or new.valor_compra = 0 then
    return new;
  end if;
  select * into l from public.lancamentos
   where veiculo_id = new.veiculo_id and categoria_id = public.categoria_sistema('compra_veiculo') and status <> 'cancelado'
   limit 1;
  if not found then
    insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, veiculo_id, fornecedor_id)
    values ('despesa', 'Compra: ' || v.marca || ' ' || v.modelo || coalesce(' ' || v.placa, ''),
            public.categoria_sistema('compra_veiculo'), new.valor_compra,
            coalesce(new.data_compra, v.data_entrada), coalesce(new.data_compra, v.data_entrada), v.id, new.fornecedor_id);
  elsif l.status = 'pendente' then
    update public.lancamentos
       set valor = new.valor_compra, fornecedor_id = new.fornecedor_id,
           data_competencia = coalesce(new.data_compra, data_competencia)
     where id = l.id;
  end if;
  return new;
end
$$;
create trigger compra_para_financeiro after insert or update of valor_compra, fornecedor_id, data_compra on public.veiculos_sigilo
  for each row execute function public.compra_para_financeiro();

-- -----------------------------------------------------------------------------
-- Views
-- -----------------------------------------------------------------------------
create or replace view public.v_lancamentos with (security_invoker = true) as
select
  l.*,
  c.nome as categoria_nome,
  c.grupo as categoria_grupo,
  c.natureza,
  ct.nome as conta_nome,
  case when l.tipo in ('receita', 'transferencia_entrada') then l.valor else -l.valor end as valor_sinal,
  (l.status = 'pendente' and l.data_vencimento < public.hoje()) as vencido,
  coalesce(f.nome, cl.nome, cg.nome, p.nome, u.nome) as pessoa,
  case when v.id is not null then v.marca || ' ' || v.modelo || coalesce(' ' || v.placa, '') end as veiculo_nome
from public.lancamentos l
join public.categorias_financeiras c on c.id = l.categoria_id
left join public.contas_financeiras ct on ct.id = l.conta_id
left join public.fornecedores f on f.id = l.fornecedor_id
left join public.clientes cl on cl.id = l.cliente_id
left join public.consignantes cg on cg.id = l.consignante_id
left join public.parceiros p on p.id = l.parceiro_id
left join public.usuarios u on u.id = l.usuario_id
left join public.veiculos v on v.id = l.veiculo_id
where public.is_gestor();

create or replace view public.v_saldos_contas with (security_invoker = true) as
select
  c.id, c.nome, c.tipo, c.banco, c.ativa, c.saldo_inicial, c.data_saldo_inicial,
  (c.saldo_inicial + coalesce(sum(
     case when l.tipo in ('receita', 'transferencia_entrada') then l.valor else -l.valor end
   ) filter (where l.status = 'pago' and l.data_pagamento >= c.data_saldo_inicial), 0))::numeric(14, 2) as saldo_atual,
  coalesce(sum(case when l.tipo = 'receita' then l.valor else 0 end) filter (where l.status = 'pendente'), 0)::numeric(14, 2) as a_receber,
  coalesce(sum(case when l.tipo = 'despesa' then l.valor else 0 end) filter (where l.status = 'pendente'), 0)::numeric(14, 2) as a_pagar
from public.contas_financeiras c
left join public.lancamentos l on l.conta_id = c.id
where public.is_gestor()
group by c.id;

grant select on public.v_lancamentos, public.v_saldos_contas to authenticated;

-- Excluir um carro cadastrado por engano leva junto as contas a pagar ainda pendentes.
create or replace function public.limpar_financeiro_veiculo()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if exists (select 1 from public.lancamentos where veiculo_id = old.id and status = 'pago') then
    raise exception 'Este carro tem lançamentos pagos no financeiro e não pode ser excluído.' using errcode = 'P0001';
  end if;
  delete from public.lancamentos where veiculo_id = old.id and status <> 'pago' and custo_veiculo_id is null;
  return old;
end
$$;
create trigger limpar_financeiro_veiculo before delete on public.veiculos
  for each row execute function public.limpar_financeiro_veiculo();

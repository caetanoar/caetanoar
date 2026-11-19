-- =============================================================================
-- Caetano Auto CRM — 0007 Comissões, vendas e garantias
-- Regras de comissão (dono configura), vendas com troca, fechamento atômico
-- (carro vendido, troca no estoque, comissões, garantia, financeiro) e garantias.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Regras de comissão
-- -----------------------------------------------------------------------------
create type public.tipo_comissao as enum ('loja_consignado', 'vendedor', 'parceiro');
create type public.modo_comissao as enum ('percentual', 'fixo');
create type public.base_comissao as enum ('valor_venda', 'comissao_loja', 'lucro');

create table public.regras_comissao (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) >= 2),
  tipo public.tipo_comissao not null,
  consignante_id uuid references public.consignantes (id) on delete cascade,
  vendedor_id uuid references public.usuarios (id) on delete cascade,
  parceiro_id uuid references public.parceiros (id) on delete cascade,
  aplica_a text not null default 'todos' check (aplica_a in ('proprio', 'consignado', 'todos')),
  modo public.modo_comissao not null,
  base public.base_comissao not null default 'valor_venda',
  percentual numeric(6, 3) check (percentual between 0 and 100),
  valor_fixo numeric(12, 2) check (valor_fixo >= 0),
  piso numeric(12, 2) check (piso >= 0),
  teto numeric(12, 2) check (teto >= 0),
  vigente_desde date not null default public.hoje(),
  vigente_ate date,
  ativa boolean not null default true,
  prioridade integer not null default 0,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint regra_modo_valor check ((modo = 'percentual' and percentual is not null) or (modo = 'fixo' and valor_fixo is not null)),
  constraint regra_piso_teto check (piso is null or teto is null or piso <= teto),
  constraint regra_vigencia check (vigente_ate is null or vigente_ate >= vigente_desde),
  constraint regra_escopo check (
    (tipo = 'loja_consignado' and vendedor_id is null and parceiro_id is null and base = 'valor_venda' and aplica_a <> 'proprio')
    or (tipo = 'vendedor' and consignante_id is null and parceiro_id is null)
    or (tipo = 'parceiro' and consignante_id is null and vendedor_id is null)
  )
);
select public.preparar_tabela('public.regras_comissao');
create policy regras_gestor_ver on public.regras_comissao for select to authenticated using ((select public.is_gestor()));
create policy regras_dono_insere on public.regras_comissao for insert to authenticated with check ((select public.is_dono()));
create policy regras_dono_altera on public.regras_comissao for update to authenticated
  using ((select public.is_dono())) with check ((select public.is_dono()));
create policy regras_dono_exclui on public.regras_comissao for delete to authenticated using ((select public.is_dono()));

alter table public.consignacoes
  add constraint consignacoes_regra_fk foreign key (regra_comissao_id) references public.regras_comissao (id) on delete set null;

-- Regra mais específica e vigente para a situação.
create or replace function public.resolver_regra(
  p_tipo public.tipo_comissao,
  p_tipo_veiculo public.tipo_veiculo,
  p_consignante uuid,
  p_vendedor uuid,
  p_parceiro uuid,
  p_data date,
  p_regra_fixa uuid default null
) returns public.regras_comissao language sql stable security definer set search_path = ''
as $$
  select r.* from public.regras_comissao r
   where r.ativa and r.tipo = p_tipo
     and (p_regra_fixa is null or r.id = p_regra_fixa)
     and r.vigente_desde <= p_data and (r.vigente_ate is null or r.vigente_ate >= p_data)
     and (r.aplica_a = 'todos' or r.aplica_a = p_tipo_veiculo::text)
     and (r.consignante_id is null or r.consignante_id = p_consignante)
     and (r.vendedor_id is null or r.vendedor_id = p_vendedor)
     and (r.parceiro_id is null or r.parceiro_id = p_parceiro)
   order by (r.id = p_regra_fixa) desc nulls last,
            (r.consignante_id is not null or r.vendedor_id is not null or r.parceiro_id is not null) desc,
            r.prioridade desc, r.criado_em desc
   limit 1
$$;

create or replace function public.existe_regra_loja(p_consignante uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.regras_comissao r
     where r.ativa and r.tipo = 'loja_consignado'
       and r.vigente_desde <= public.hoje() and (r.vigente_ate is null or r.vigente_ate >= public.hoje())
       and (r.consignante_id is null or r.consignante_id = p_consignante)
  )
$$;

create or replace function public.calcular_valor_comissao(r public.regras_comissao, p_base numeric)
returns numeric language sql immutable set search_path = ''
as $$
  select greatest(0, round(
    least(coalesce(r.teto, 'infinity'::numeric),
          greatest(coalesce(r.piso, 0),
                   case when r.modo = 'fixo' then r.valor_fixo else greatest(p_base, 0) * r.percentual / 100 end)),
    2))
$$;

-- -----------------------------------------------------------------------------
-- Eventos para integrações (webhooks consomem esta fila)
-- -----------------------------------------------------------------------------
create table public.eventos_saida (
  id bigint generated always as identity primary key,
  tipo text not null,
  payload jsonb not null,
  criado_em timestamptz not null default now()
);
alter table public.eventos_saida enable row level security;
revoke all on public.eventos_saida from anon, authenticated;

create or replace function public.registrar_evento(p_tipo text, p_payload jsonb)
returns void language sql security definer set search_path = ''
as $$ insert into public.eventos_saida (tipo, payload) values (p_tipo, p_payload) $$;

-- -----------------------------------------------------------------------------
-- Vendas
-- -----------------------------------------------------------------------------
create type public.status_venda as enum ('rascunho', 'aguardando_aprovacao', 'fechada', 'cancelada');
create type public.forma_pagamento_venda as enum
  ('dinheiro', 'pix', 'ted', 'cartao_credito', 'cartao_debito', 'financiamento', 'boleto', 'cheque');

create sequence public.vendas_numero_seq;
grant usage on sequence public.vendas_numero_seq to authenticated;

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default ('V-' || to_char(public.hoje(), 'YYYY') || '-' || lpad(nextval('public.vendas_numero_seq')::text, 4, '0')),
  veiculo_id uuid not null references public.veiculos (id) on delete restrict,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  vendedor_id uuid not null references public.usuarios (id) on delete restrict default auth.uid(),
  parceiro_id uuid references public.parceiros (id) on delete set null,
  data_venda date not null default public.hoje(),
  valor_venda numeric(12, 2) not null check (valor_venda > 0),
  valor_entrada numeric(12, 2) not null default 0 check (valor_entrada >= 0),
  status public.status_venda not null default 'aguardando_aprovacao',
  tipo_veiculo public.tipo_veiculo,
  abaixo_negociavel boolean not null default false,
  recebimento_consignado public.recebimento_consignado,
  garantia_dias integer check (garantia_dias >= 0),
  garantia_cobertura text,
  status_veiculo_anterior public.status_veiculo,
  observacoes text,
  aprovada_por uuid references public.usuarios (id),
  aprovada_em timestamptz,
  cancelada_por uuid references public.usuarios (id),
  cancelada_em timestamptz,
  motivo_cancelamento text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create unique index vendas_veiculo_ativa_unq on public.vendas (veiculo_id) where status <> 'cancelada';
create index vendas_data_idx on public.vendas (data_venda desc, status);
create index vendas_vendedor_idx on public.vendas (vendedor_id, data_venda desc);
create index vendas_cliente_idx on public.vendas (cliente_id);

create or replace function public.pode_ver_venda(p_venda uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_gestor()
      or exists (select 1 from public.vendas v where v.id = p_venda and v.vendedor_id = auth.uid() and public.is_ativo())
$$;
grant execute on function public.pode_ver_venda(uuid) to authenticated;

select public.preparar_tabela('public.vendas');
create policy vendas_ver on public.vendas for select to authenticated
  using ((select public.is_gestor()) or vendedor_id = (select auth.uid()));
create policy vendas_inserir on public.vendas for insert to authenticated
  with check (
    status in ('rascunho', 'aguardando_aprovacao')
    and ((select public.is_gestor()) or (vendedor_id = (select auth.uid()) and public.pode_ver_cliente(cliente_id)))
  );
create policy vendas_alterar on public.vendas for update to authenticated
  using ((select public.is_gestor()) or (vendedor_id = (select auth.uid()) and status in ('rascunho', 'aguardando_aprovacao')))
  with check ((select public.is_gestor()) or (vendedor_id = (select auth.uid()) and status in ('rascunho', 'aguardando_aprovacao')));
create policy vendas_excluir on public.vendas for delete to authenticated
  using (status in ('rascunho', 'aguardando_aprovacao') and ((select public.is_gestor()) or vendedor_id = (select auth.uid())));

-- Regras ao registrar/alterar a venda (antes de fechar).
create or replace function public.preparar_venda()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v public.veiculos;
  v_referencia numeric;
begin
  if tg_op = 'UPDATE' and old.status in ('fechada', 'cancelada') and coalesce(current_setting('app.operacao_venda', true), '') = '' then
    raise exception 'Venda fechada ou cancelada não pode ser alterada.' using errcode = 'P0001';
  end if;
  if new.status in ('fechada', 'cancelada') and (tg_op = 'INSERT' or old.status <> new.status)
     and coalesce(current_setting('app.operacao_venda', true), '') = '' then
    raise exception 'Use as ações de fechar ou cancelar venda.' using errcode = 'P0001';
  end if;
  if new.status in ('fechada', 'cancelada') then
    return new;
  end if;

  select * into v from public.veiculos where id = new.veiculo_id;
  if v.status not in ('em_preparacao', 'disponivel', 'reservado') then
    raise exception 'Este carro não está disponível para venda (situação: %).', v.status using errcode = 'P0001';
  end if;
  new.tipo_veiculo := v.tipo;
  v_referencia := coalesce(v.preco_negociavel, v.preco_anunciado);
  new.abaixo_negociavel := v_referencia is not null and new.valor_venda < v_referencia;
  if new.garantia_dias is null then
    select c.garantia_dias_padrao into new.garantia_dias from public.configuracoes c;
  end if;
  if new.garantia_cobertura is null then
    select c.garantia_cobertura_padrao into new.garantia_cobertura from public.configuracoes c;
  end if;
  if new.tipo_veiculo = 'proprio' then
    new.recebimento_consignado := null;
  end if;
  return new;
end
$$;
create trigger preparar_venda before insert or update on public.vendas
  for each row execute function public.preparar_venda();

-- Venda registrada reserva o carro; venda removida/cancelada antes de fechar libera.
create or replace function public.reservar_carro_da_venda()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.vendas set status_veiculo_anterior = (select status from public.veiculos where id = new.veiculo_id)
     where id = new.id;
    update public.veiculos set status = 'reservado', reservado_para_cliente_id = new.cliente_id
     where id = new.veiculo_id and status in ('disponivel', 'em_preparacao', 'reservado');
  elsif tg_op = 'UPDATE' and new.veiculo_id <> old.veiculo_id and old.status in ('rascunho', 'aguardando_aprovacao') then
    update public.veiculos set status = coalesce(old.status_veiculo_anterior, 'disponivel'), reservado_para_cliente_id = null
     where id = old.veiculo_id and status = 'reservado';
    update public.veiculos set status = 'reservado', reservado_para_cliente_id = new.cliente_id
     where id = new.veiculo_id and status in ('disponivel', 'em_preparacao', 'reservado');
  elsif tg_op = 'DELETE' and old.status in ('rascunho', 'aguardando_aprovacao') then
    update public.veiculos set status = case when old.status_veiculo_anterior = 'em_preparacao' then 'em_preparacao' else 'disponivel' end,
                               reservado_para_cliente_id = null
     where id = old.veiculo_id and status = 'reservado';
  end if;
  return coalesce(new, old);
end
$$;
create trigger reservar_carro_ins after insert on public.vendas for each row execute function public.reservar_carro_da_venda();
create trigger reservar_carro_upd after update of veiculo_id on public.vendas for each row execute function public.reservar_carro_da_venda();
create trigger reservar_carro_del after delete on public.vendas for each row execute function public.reservar_carro_da_venda();

create table public.vendas_pagamentos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  forma public.forma_pagamento_venda not null,
  valor numeric(12, 2) not null check (valor > 0),
  banco_financiamento text,
  parcelas integer check (parcelas between 1 and 120),
  data_prevista date,
  recebido boolean not null default false,
  conta_id uuid references public.contas_financeiras (id) on delete set null,
  lancamento_id uuid references public.lancamentos (id) on delete set null,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint pagamento_financiamento_banco check (forma <> 'financiamento' or banco_financiamento is not null)
);
create index vendas_pagamentos_venda_idx on public.vendas_pagamentos (venda_id);

create table public.vendas_trocas (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  placa text check (placa is null or placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  marca text not null,
  modelo text not null,
  versao text,
  motor text,
  ano_fabricacao integer,
  ano_modelo integer,
  cor text,
  km integer check (km >= 0),
  combustivel public.combustivel,
  cambio public.cambio,
  codigo_fipe text,
  valor_fipe numeric(12, 2),
  valor_avaliacao numeric(12, 2) not null check (valor_avaliacao > 0),
  observacoes text,
  veiculo_id uuid references public.veiculos (id) on delete set null,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index vendas_trocas_venda_idx on public.vendas_trocas (venda_id);

-- Filhos da venda: só podem mudar enquanto a venda não está fechada/cancelada.
create or replace function public.proteger_filhos_venda()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if coalesce(current_setting('app.operacao_venda', true), '') = ''
     and exists (select 1 from public.vendas v where v.id = coalesce(new.venda_id, old.venda_id) and v.status in ('fechada', 'cancelada')) then
    raise exception 'Venda fechada ou cancelada não pode ser alterada.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end
$$;

select public.preparar_tabela('public.vendas_pagamentos');
select public.preparar_tabela('public.vendas_trocas');
create trigger proteger_pagamentos before insert or update or delete on public.vendas_pagamentos for each row execute function public.proteger_filhos_venda();
create trigger proteger_trocas before insert or update or delete on public.vendas_trocas for each row execute function public.proteger_filhos_venda();
create policy pagamentos_venda on public.vendas_pagamentos for all to authenticated
  using (public.pode_ver_venda(venda_id)) with check (public.pode_ver_venda(venda_id));
create policy trocas_venda on public.vendas_trocas for all to authenticated
  using (public.pode_ver_venda(venda_id)) with check (public.pode_ver_venda(venda_id));

-- -----------------------------------------------------------------------------
-- Comissões
-- -----------------------------------------------------------------------------
create type public.status_comissao as enum ('pendente', 'quitada', 'cancelada');

create table public.comissoes (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  tipo public.tipo_comissao not null,
  direcao text not null check (direcao in ('a_receber', 'a_pagar')),
  usuario_id uuid references public.usuarios (id) on delete set null,
  parceiro_id uuid references public.parceiros (id) on delete set null,
  consignante_id uuid references public.consignantes (id) on delete set null,
  regra_id uuid references public.regras_comissao (id) on delete set null,
  regra_snapshot jsonb,
  base_calculo text,
  base_valor numeric(12, 2),
  valor numeric(12, 2) not null check (valor >= 0),
  manual boolean not null default false,
  status public.status_comissao not null default 'pendente',
  data_prevista date,
  data_quitacao date,
  lancamento_id uuid references public.lancamentos (id) on delete set null,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index comissoes_venda_idx on public.comissoes (venda_id);
create index comissoes_usuario_idx on public.comissoes (usuario_id, status);
select public.preparar_tabela('public.comissoes');
create policy comissoes_gestor on public.comissoes for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- Pagar/receber o lançamento da comissão quita a comissão (e o estorno reabre).
create or replace function public.sincronizar_comissao()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.comissao_id is not null and new.status is distinct from old.status then
    update public.comissoes
       set status = case when new.status = 'pago' then 'quitada'::public.status_comissao
                         when new.status = 'cancelado' then 'cancelada'::public.status_comissao
                         else 'pendente'::public.status_comissao end,
           data_quitacao = case when new.status = 'pago' then new.data_pagamento end
     where id = new.comissao_id;
  end if;
  return new;
end
$$;
create trigger sincronizar_comissao after update of status on public.lancamentos
  for each row execute function public.sincronizar_comissao();

-- Vendedor vê só as próprias comissões, sem a base (que revelaria lucro).
create or replace function public.minhas_comissoes()
returns table (id uuid, venda_id uuid, venda_numero text, veiculo text, data_venda date, valor numeric, status public.status_comissao, data_prevista date, data_quitacao date)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.venda_id, v.numero, ve.marca || ' ' || ve.modelo, v.data_venda, c.valor, c.status, c.data_prevista, c.data_quitacao
    from public.comissoes c
    join public.vendas v on v.id = c.venda_id
    join public.veiculos ve on ve.id = v.veiculo_id
   where c.usuario_id = auth.uid() and c.tipo = 'vendedor' and public.is_ativo()
   order by v.data_venda desc
$$;
grant execute on function public.minhas_comissoes() to authenticated;

-- -----------------------------------------------------------------------------
-- Garantias
-- -----------------------------------------------------------------------------
create type public.status_acionamento as enum ('aberto', 'em_andamento', 'resolvido', 'negado');

create table public.garantias (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null unique references public.vendas (id) on delete cascade,
  veiculo_id uuid not null references public.veiculos (id) on delete restrict,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  data_inicio date not null,
  dias integer not null check (dias >= 0),
  data_fim date generated always as (data_inicio + dias) stored,
  cobertura text,
  cancelada boolean not null default false,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index garantias_fim_idx on public.garantias (data_fim) where not cancelada;
select public.preparar_tabela('public.garantias');
create policy garantias_gestor on public.garantias for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

create table public.garantias_acionamentos (
  id uuid primary key default gen_random_uuid(),
  garantia_id uuid not null references public.garantias (id) on delete cascade,
  data_abertura date not null default public.hoje(),
  descricao text not null check (length(trim(descricao)) >= 3),
  custo numeric(12, 2) not null default 0 check (custo >= 0),
  solucao text,
  status public.status_acionamento not null default 'aberto',
  data_resolucao date,
  fornecedor_id uuid references public.fornecedores (id) on delete set null,
  lancamento_id uuid references public.lancamentos (id) on delete set null,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index garantias_acionamentos_garantia_idx on public.garantias_acionamentos (garantia_id);
select public.preparar_tabela('public.garantias_acionamentos');
create policy acionamentos_gestor on public.garantias_acionamentos for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- Custo do acionamento vira conta a pagar (categoria Custo de garantia).
create or replace function public.acionamento_para_financeiro()
returns trigger language plpgsql set search_path = ''
as $$
declare
  g public.garantias;
  l public.lancamentos;
begin
  select * into g from public.garantias where id = new.garantia_id;
  if new.status in ('resolvido', 'negado') and new.data_resolucao is null then
    new.data_resolucao := public.hoje();
  end if;
  if new.lancamento_id is not null then
    select * into l from public.lancamentos where id = new.lancamento_id;
    if l.status = 'pendente' then
      if new.custo > 0 then
        update public.lancamentos set valor = new.custo, fornecedor_id = new.fornecedor_id where id = l.id;
      else
        delete from public.lancamentos where id = l.id;
        new.lancamento_id := null;
      end if;
    elsif l.status = 'pago' and new.custo <> l.valor then
      raise exception 'O custo da garantia já foi pago. Estorne o pagamento antes de mudar o valor.' using errcode = 'P0001';
    end if;
  elsif new.custo > 0 then
    insert into public.lancamentos (tipo, descricao, categoria_id, valor, data_competencia, data_vencimento, veiculo_id, cliente_id, fornecedor_id, venda_id)
    values ('despesa', 'Garantia: ' || left(new.descricao, 80), public.categoria_sistema('custo_garantia'), new.custo,
            new.data_abertura, new.data_abertura, g.veiculo_id, g.cliente_id, new.fornecedor_id, g.venda_id)
    returning id into new.lancamento_id;
  end if;
  return new;
end
$$;
create trigger acionamento_para_financeiro before insert or update on public.garantias_acionamentos
  for each row execute function public.acionamento_para_financeiro();

-- -----------------------------------------------------------------------------
-- Categorias de sistema adicionais
-- -----------------------------------------------------------------------------
insert into public.categorias_financeiras (nome, tipo, grupo, natureza, sistema) values
  ('Reembolso de custos pelo consignante', 'receita', 'Vendas', 'operacional', 'reembolso_consignante')
on conflict (sistema) do nothing;

alter table public.lancamentos
  add constraint lancamentos_venda_fk foreign key (venda_id) references public.vendas (id) on delete set null,
  add constraint lancamentos_comissao_fk foreign key (comissao_id) references public.comissoes (id) on delete set null,
  add constraint lancamentos_garantia_fk foreign key (garantia_acionamento_id) references public.garantias_acionamentos (id) on delete set null;
alter table public.veiculos_sigilo
  add constraint veiculos_sigilo_venda_origem_fk foreign key (venda_origem_id) references public.vendas (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Cálculo da venda (usado na simulação e no fechamento)
-- -----------------------------------------------------------------------------
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
        v_erros := v_erros || 'Venda de consignado com carro na troca: use "loja recebe e repassa".'::text;
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
grant execute on function public.calcular_venda(uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Fechamento da venda (transação única)
-- -----------------------------------------------------------------------------
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
grant execute on function public.fechar_venda(uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Cancelamento (desfaz o que está pendente)
-- -----------------------------------------------------------------------------
create or replace function public.cancelar_venda(p_venda uuid, p_motivo text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  vd public.vendas;
  tr record;
begin
  if not public.is_gestor() then
    raise exception 'Somente dono ou gerente cancelam vendas.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Informe o motivo do cancelamento.' using errcode = 'P0001';
  end if;
  select * into vd from public.vendas where id = p_venda for update;
  if not found or vd.status = 'cancelada' then
    raise exception 'Venda não encontrada ou já cancelada.' using errcode = 'P0001';
  end if;
  perform set_config('app.operacao_venda', 'cancelar', true);

  if vd.status = 'fechada' then
    if exists (select 1 from public.lancamentos where venda_id = p_venda and status = 'pago' and coalesce(forma_pagamento::text, '') <> 'permuta') then
      raise exception 'Há recebimentos ou pagamentos já baixados desta venda. Estorne-os no financeiro antes de cancelar.' using errcode = 'P0001';
    end if;
    for tr in select * from public.vendas_trocas where venda_id = p_venda and veiculo_id is not null loop
      if exists (select 1 from public.vendas where veiculo_id = tr.veiculo_id and status <> 'cancelada') then
        raise exception 'O carro recebido na troca já foi vendido: cancele aquela venda antes.' using errcode = 'P0001';
      end if;
      if exists (select 1 from public.lancamentos where veiculo_id = tr.veiculo_id and status = 'pago' and coalesce(forma_pagamento::text, '') <> 'permuta') then
        raise exception 'O carro recebido na troca já tem custos pagos: estorne-os antes.' using errcode = 'P0001';
      end if;
    end loop;
    delete from public.lancamentos where venda_id = p_venda;
    update public.comissoes set status = 'cancelada' where venda_id = p_venda;
    update public.garantias set cancelada = true where venda_id = p_venda;
    for tr in select * from public.vendas_trocas where venda_id = p_venda and veiculo_id is not null loop
      update public.vendas_trocas set veiculo_id = null where id = tr.id;
      delete from public.custos_veiculo where veiculo_id = tr.veiculo_id;
      delete from public.lancamentos where veiculo_id = tr.veiculo_id;
      delete from public.veiculos where id = tr.veiculo_id;
    end loop;
    update public.veiculos set status = 'disponivel', data_saida = null where id = vd.veiculo_id;
    update public.consignacoes set status = 'vigente' where veiculo_id = vd.veiculo_id and status = 'vendido';
    update public.clientes set etapa = 'negociacao' where id = vd.cliente_id and etapa = 'ganho';
  else
    update public.veiculos set status = case when vd.status_veiculo_anterior = 'em_preparacao' then 'em_preparacao' else 'disponivel' end,
                               reservado_para_cliente_id = null
     where id = vd.veiculo_id and status = 'reservado';
  end if;

  update public.vendas set status = 'cancelada', cancelada_por = auth.uid(), cancelada_em = now(), motivo_cancelamento = p_motivo where id = p_venda;
  perform public.registrar_evento('venda.cancelada', jsonb_build_object('venda_id', vd.id, 'numero', vd.numero, 'motivo', p_motivo));
  perform set_config('app.operacao_venda', '', true);
end
$$;
grant execute on function public.cancelar_venda(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Gravação atômica da venda com pagamentos e trocas (SECURITY INVOKER)
-- -----------------------------------------------------------------------------
create or replace function public.salvar_venda(p_id uuid, p_venda jsonb, p_pagamentos jsonb, p_trocas jsonb)
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
    v_id := interno.inserir('public.vendas', p_venda);
  else
    perform interno.atualizar('public.vendas', 'id', v_id, p_venda - 'status');
    delete from public.vendas_pagamentos where venda_id = v_id;
    delete from public.vendas_trocas where venda_id = v_id;
  end if;
  for item in select * from jsonb_array_elements(coalesce(p_pagamentos, '[]')) loop
    perform interno.inserir('public.vendas_pagamentos', item, jsonb_build_object('venda_id', v_id));
  end loop;
  for item in select * from jsonb_array_elements(coalesce(p_trocas, '[]')) loop
    perform interno.inserir('public.vendas_trocas', item, jsonb_build_object('venda_id', v_id));
  end loop;
  return v_id;
end
$$;
grant execute on function public.salvar_venda(uuid, jsonb, jsonb, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Views
-- -----------------------------------------------------------------------------
create or replace view public.v_vendas with (security_invoker = true) as
select
  vd.*,
  ve.marca || ' ' || ve.modelo || coalesce(' ' || ve.versao, '') as veiculo_nome,
  ve.placa as veiculo_placa,
  ve.ano_modelo as veiculo_ano,
  cl.nome as cliente_nome,
  u.nome as vendedor_nome,
  (select count(*) from public.vendas_trocas t where t.venda_id = vd.id)::int as qtd_trocas,
  (select string_agg(distinct replace(p.forma::text, '_', ' '), ', ') from public.vendas_pagamentos p where p.venda_id = vd.id) as formas
from public.vendas vd
join public.veiculos ve on ve.id = vd.veiculo_id
left join public.clientes cl on cl.id = vd.cliente_id
left join public.usuarios u on u.id = vd.vendedor_id;

create or replace view public.v_lucro_vendas with (security_invoker = true) as
select
  vd.id as venda_id,
  vd.numero,
  vd.data_venda,
  vd.vendedor_id,
  vd.tipo_veiculo,
  vd.valor_venda,
  s.valor_compra,
  coalesce((select sum(c.valor) from public.custos_veiculo c where c.veiculo_id = vd.veiculo_id), 0)::numeric(12, 2) as custos,
  coalesce((select sum(c.valor) from public.custos_veiculo c where c.veiculo_id = vd.veiculo_id and c.cobrar_do_consignante), 0)::numeric(12, 2) as custos_cobrados,
  coalesce((select sum(cm.valor) from public.comissoes cm where cm.venda_id = vd.id and cm.tipo = 'loja_consignado' and cm.status <> 'cancelada'), 0)::numeric(12, 2) as comissao_loja,
  coalesce((select sum(cm.valor) from public.comissoes cm where cm.venda_id = vd.id and cm.tipo = 'vendedor' and cm.status <> 'cancelada'), 0)::numeric(12, 2) as comissao_vendedor,
  coalesce((select sum(cm.valor) from public.comissoes cm where cm.venda_id = vd.id and cm.tipo = 'parceiro' and cm.status <> 'cancelada'), 0)::numeric(12, 2) as comissao_parceiro,
  coalesce((select sum(a.custo) from public.garantias g join public.garantias_acionamentos a on a.garantia_id = g.id where g.venda_id = vd.id), 0)::numeric(12, 2) as custo_garantia
from public.vendas vd
left join public.veiculos_sigilo s on s.veiculo_id = vd.veiculo_id
where vd.status = 'fechada' and public.is_gestor();

create or replace view public.v_lucro_vendas_calc with (security_invoker = true) as
select
  l.*,
  (case when l.tipo_veiculo = 'proprio'
        then l.valor_venda - coalesce(l.valor_compra, 0) - l.custos - l.comissao_vendedor
        else l.comissao_loja - (l.custos - l.custos_cobrados) - l.comissao_vendedor end)::numeric(12, 2) as lucro,
  (case when l.tipo_veiculo = 'proprio'
        then l.valor_venda - coalesce(l.valor_compra, 0) - l.custos - l.comissao_vendedor
        else l.comissao_loja - (l.custos - l.custos_cobrados) - l.comissao_vendedor end
   - l.comissao_parceiro - l.custo_garantia)::numeric(12, 2) as resultado_apos_garantia
from public.v_lucro_vendas l;

create or replace view public.v_garantias with (security_invoker = true) as
select
  g.*,
  vd.numero as venda_numero,
  ve.marca || ' ' || ve.modelo || coalesce(' ' || ve.placa, '') as veiculo_nome,
  cl.nome as cliente_nome,
  cl.whatsapp as cliente_whatsapp,
  cl.telefone as cliente_telefone,
  (g.data_fim - public.hoje()) as dias_restantes,
  (select count(*) from public.garantias_acionamentos a where a.garantia_id = g.id and a.status in ('aberto', 'em_andamento'))::int as acionamentos_abertos,
  coalesce((select sum(a.custo) from public.garantias_acionamentos a where a.garantia_id = g.id), 0)::numeric(12, 2) as custo_total,
  case
    when g.cancelada then 'cancelada'
    when exists (select 1 from public.garantias_acionamentos a where a.garantia_id = g.id and a.status in ('aberto', 'em_andamento')) then 'acionada'
    when g.data_fim < public.hoje() then 'vencida'
    else 'ativa'
  end as status,
  (not g.cancelada and g.data_fim >= public.hoje() and g.data_fim - public.hoje() <= (select alerta_garantia_dias from public.configuracoes)) as vence_em_breve
from public.garantias g
join public.vendas vd on vd.id = g.venda_id
join public.veiculos ve on ve.id = g.veiculo_id
join public.clientes cl on cl.id = g.cliente_id;

grant select on public.v_vendas, public.v_lucro_vendas, public.v_lucro_vendas_calc, public.v_garantias to authenticated;

-- Arquivos de vendas: vendedor vê os das próprias vendas; gestor envia.
create or replace function public.pode_ver_entidade(p_entidade public.entidade_arquivo, p_id uuid, p_sigiloso boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when public.is_gestor() then true
    when not public.is_ativo() then false
    when p_sigiloso then false
    when p_entidade = 'veiculo' then true
    when p_entidade = 'cliente' then public.pode_ver_cliente(p_id)
    when p_entidade = 'venda' then public.pode_ver_venda(p_id)
    else false
  end
$$;

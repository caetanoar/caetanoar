-- =============================================================================
-- Caetano Auto CRM — 0003 Estoque: carros próprios e consignados
-- Dados do veículo (todos veem) separados dos dados sigilosos (custo, preço
-- mínimo, fornecedor, consignação), que só dono e gerente acessam.
-- =============================================================================

-- Esquema interno (não exposto pela API) para utilitários.
create schema if not exists interno;
grant usage on schema interno to authenticated, service_role;

create type public.tipo_veiculo as enum ('proprio', 'consignado');
create type public.status_veiculo as enum ('em_preparacao', 'disponivel', 'reservado', 'vendido', 'devolvido');
create type public.origem_veiculo as enum ('compra', 'troca', 'consignacao');
create type public.combustivel as enum ('flex', 'gasolina', 'etanol', 'diesel', 'gnv', 'hibrido', 'eletrico');
create type public.cambio as enum ('manual', 'automatico', 'cvt', 'automatizado');
create type public.resultado_laudo as enum ('aprovado', 'aprovado_apontamentos', 'reprovado');
create type public.tipo_custo as enum
  ('funilaria', 'mecanica', 'pintura', 'documentacao', 'lavagem', 'estetica', 'pneus', 'eletrica', 'laudo', 'transporte', 'outros');
create type public.tipo_historico as enum ('pintura', 'reparo', 'sinistro', 'revisao', 'manutencao', 'observacao');
create type public.status_consignacao as enum ('vigente', 'vendido', 'devolvido');
create type public.recebimento_consignado as enum ('loja_repassa', 'direto_dono');

create or replace function public.hoje()
returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;
grant execute on function public.hoje() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Veículos (visível a todos os perfis)
-- -----------------------------------------------------------------------------
create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_veiculo not null,
  status public.status_veiculo not null default 'disponivel',
  origem public.origem_veiculo not null default 'compra',
  placa text check (placa is null or placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  chassi text check (chassi is null or chassi ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  renavam text check (renavam is null or renavam ~ '^[0-9]{11}$'),
  marca text not null check (length(trim(marca)) >= 2),
  modelo text not null check (length(trim(modelo)) >= 1),
  versao text,
  motor text,
  ano_fabricacao integer check (ano_fabricacao between 1900 and 2100),
  ano_modelo integer check (ano_modelo between 1900 and 2100),
  cor text,
  km integer check (km >= 0),
  combustivel public.combustivel,
  cambio public.cambio,
  portas smallint check (portas between 1 and 6),
  codigo_fipe text,
  valor_fipe numeric(12, 2) check (valor_fipe >= 0),
  fipe_referencia text,
  preco_anunciado numeric(12, 2) check (preco_anunciado >= 0),
  preco_negociavel numeric(12, 2) check (preco_negociavel >= 0),
  data_entrada date not null default public.hoje(),
  data_saida date,
  laudo_cautelar boolean not null default false,
  laudo_resultado public.resultado_laudo,
  descricao text,
  observacoes text,
  reservado_para_cliente_id uuid,
  reservado_ate date,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint veiculos_anos_coerentes check (
    ano_fabricacao is null or ano_modelo is null or ano_modelo between ano_fabricacao and ano_fabricacao + 1
  ),
  constraint veiculos_negociavel_ate_anunciado check (
    preco_negociavel is null or preco_anunciado is null or preco_negociavel <= preco_anunciado
  ),
  constraint veiculos_status_por_tipo check (
    (tipo = 'proprio' and status <> 'devolvido') or (tipo = 'consignado' and status <> 'em_preparacao')
  ),
  constraint veiculos_laudo_coerente check (laudo_cautelar or laudo_resultado is null),
  constraint veiculos_saida_apos_entrada check (data_saida is null or data_saida >= data_entrada)
);
comment on column public.veiculos.preco_negociavel is 'Até onde o vendedor pode negociar sem aprovação (visível ao vendedor). O preço mínimo fica em veiculos_sigilo.';

create unique index veiculos_placa_ativa_unq on public.veiculos (placa) where placa is not null and status not in ('vendido', 'devolvido');
create unique index veiculos_chassi_ativo_unq on public.veiculos (chassi) where chassi is not null and status not in ('vendido', 'devolvido');
create index veiculos_status_idx on public.veiculos (status, tipo);
create index veiculos_busca_idx on public.veiculos using gin (
  public.normalizar(marca || ' ' || modelo || ' ' || coalesce(versao, '') || ' ' || coalesce(placa, '')) extensions.gin_trgm_ops
);

select public.preparar_tabela('public.veiculos');
create policy veiculos_ver on public.veiculos for select to authenticated using ((select public.is_ativo()));
create policy veiculos_gestor_insere on public.veiculos for insert to authenticated with check ((select public.is_gestor()));
create policy veiculos_gestor_altera on public.veiculos for update to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));
create policy veiculos_gestor_exclui on public.veiculos for delete to authenticated using ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Dados sigilosos do veículo (somente dono e gerente)
-- -----------------------------------------------------------------------------
create table public.veiculos_sigilo (
  veiculo_id uuid primary key references public.veiculos (id) on delete cascade,
  valor_compra numeric(12, 2) check (valor_compra >= 0),
  data_compra date,
  fornecedor_id uuid references public.fornecedores (id) on delete restrict,
  cliente_origem_id uuid,
  venda_origem_id uuid,
  preco_minimo numeric(12, 2) check (preco_minimo >= 0),
  observacoes_internas text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index veiculos_sigilo_fornecedor_idx on public.veiculos_sigilo (fornecedor_id);
select public.preparar_tabela('public.veiculos_sigilo', 'veiculo_id');
create policy veiculos_sigilo_gestor on public.veiculos_sigilo for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Custos de preparação (somente dono e gerente)
-- -----------------------------------------------------------------------------
create table public.custos_veiculo (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos (id) on delete cascade,
  tipo public.tipo_custo not null,
  descricao text,
  valor numeric(12, 2) not null check (valor > 0),
  data date not null default public.hoje(),
  fornecedor_id uuid references public.fornecedores (id) on delete restrict,
  cobrar_do_consignante boolean not null default false,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index custos_veiculo_veiculo_idx on public.custos_veiculo (veiculo_id);
create index custos_veiculo_fornecedor_idx on public.custos_veiculo (fornecedor_id);
comment on column public.custos_veiculo.cobrar_do_consignante is 'Em carro consignado: o valor é descontado do repasse ao dono.';
select public.preparar_tabela('public.custos_veiculo');
create policy custos_veiculo_gestor on public.custos_veiculo for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Itens/opcionais e histórico do veículo (todos veem; gestor altera)
-- -----------------------------------------------------------------------------
create table public.itens_catalogo (
  id uuid primary key default gen_random_uuid(),
  item text not null unique,
  categoria text not null default 'Conforto',
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
select public.preparar_tabela('public.itens_catalogo');
create policy itens_catalogo_ver on public.itens_catalogo for select to authenticated using ((select public.is_ativo()));
create policy itens_catalogo_gestor on public.itens_catalogo for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

create table public.veiculo_itens (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos (id) on delete cascade,
  item text not null check (length(trim(item)) >= 2),
  categoria text,
  confirmado boolean not null default false,
  fonte text check (fonte in ('vistoria', 'documento', 'dono', 'outro')),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  unique (veiculo_id, item)
);
comment on column public.veiculo_itens.confirmado is 'Só itens confirmados entram com ✅ nos anúncios gerados.';
select public.preparar_tabela('public.veiculo_itens');
create policy veiculo_itens_ver on public.veiculo_itens for select to authenticated using ((select public.is_ativo()));
create policy veiculo_itens_gestor on public.veiculo_itens for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

create table public.veiculo_historico (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos (id) on delete cascade,
  data date not null default public.hoje(),
  tipo public.tipo_historico not null default 'observacao',
  descricao text not null check (length(trim(descricao)) >= 3),
  comprovado boolean not null default false,
  arquivo_id uuid references public.arquivos (id) on delete set null,
  visivel_anuncio boolean not null default false,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index veiculo_historico_veiculo_idx on public.veiculo_historico (veiculo_id, data desc);
select public.preparar_tabela('public.veiculo_historico');
create policy veiculo_historico_ver on public.veiculo_historico for select to authenticated using ((select public.is_ativo()));
create policy veiculo_historico_gestor on public.veiculo_historico for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Consignações (somente dono e gerente)
-- -----------------------------------------------------------------------------
create table public.consignacoes (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos (id) on delete cascade,
  consignante_id uuid not null references public.consignantes (id) on delete restrict,
  contrato_arquivo_id uuid references public.arquivos (id) on delete set null,
  valor_minimo_dono numeric(12, 2) check (valor_minimo_dono >= 0),
  regra_comissao_id uuid,
  data_inicio date not null default public.hoje(),
  data_fim date,
  status public.status_consignacao not null default 'vigente',
  data_devolucao date,
  motivo_devolucao text,
  recebimento_padrao public.recebimento_consignado,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint consignacoes_prazo check (data_fim is null or data_fim >= data_inicio)
);
create unique index consignacoes_vigente_unq on public.consignacoes (veiculo_id) where status = 'vigente';
create index consignacoes_consignante_idx on public.consignacoes (consignante_id);
select public.preparar_tabela('public.consignacoes');
create policy consignacoes_gestor on public.consignacoes for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Cache de consultas FIPE (qualquer usuário ativo consulta)
-- -----------------------------------------------------------------------------
create table public.fipe_cache (
  codigo_fipe text not null,
  ano_modelo integer not null,
  combustivel text not null default '',
  marca text not null,
  modelo text not null,
  valor numeric(12, 2) not null,
  mes_referencia text,
  consultado_em timestamptz not null default now(),
  primary key (codigo_fipe, ano_modelo, combustivel)
);
alter table public.fipe_cache enable row level security;
revoke all on public.fipe_cache from anon;
create policy fipe_cache_ver on public.fipe_cache for select to authenticated using ((select public.is_ativo()));
create policy fipe_cache_grava on public.fipe_cache for insert to authenticated with check ((select public.is_ativo()));
create policy fipe_cache_atualiza on public.fipe_cache for update to authenticated
  using ((select public.is_ativo())) with check ((select public.is_ativo()));

-- -----------------------------------------------------------------------------
-- Regras de coerência entre tipo do carro, consignação e sigilo
-- -----------------------------------------------------------------------------
create or replace function public.validar_consignacao()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (select v.tipo from public.veiculos v where v.id = new.veiculo_id) <> 'consignado' then
    raise exception 'Consignação só pode ser registrada para carro consignado.' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger validar_consignacao before insert or update of veiculo_id on public.consignacoes
  for each row execute function public.validar_consignacao();

-- -----------------------------------------------------------------------------
-- Gravação atômica a partir de JSON (veículo + sigilo + consignação)
-- SECURITY INVOKER: a RLS de cada tabela continua valendo.
-- -----------------------------------------------------------------------------
create or replace function interno.colunas(p_tabela regclass, p_dados jsonb)
returns text language sql stable set search_path = ''
as $$
  select string_agg(quote_ident(a.attname), ', ' order by a.attnum)
    from pg_catalog.pg_attribute a
   where a.attrelid = p_tabela
     and a.attnum > 0
     and not a.attisdropped
     and a.attgenerated = ''
     and a.attname not in ('id', 'criado_em', 'criado_por', 'atualizado_em', 'atualizado_por')
     and p_dados ? a.attname
$$;

create or replace function interno.inserir(p_tabela regclass, p_dados jsonb, p_extra jsonb default '{}')
returns uuid language plpgsql set search_path = ''
as $$
declare
  v_dados jsonb := coalesce(p_dados, '{}') || coalesce(p_extra, '{}');
  v_cols text := interno.colunas(p_tabela, v_dados);
  v_id uuid;
  v_pk text;
begin
  select a.attname into v_pk
    from pg_catalog.pg_index i
    join pg_catalog.pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
   where i.indrelid = p_tabela and i.indisprimary
   limit 1;
  if v_cols is null then
    raise exception 'Nenhum dado para gravar.' using errcode = 'P0001';
  end if;
  execute format(
    'insert into %s (%s) select %s from jsonb_populate_record(null::%s, $1) returning %I',
    p_tabela, v_cols, v_cols, p_tabela, v_pk
  ) using v_dados into v_id;
  return v_id;
end
$$;

create or replace function interno.atualizar(p_tabela regclass, p_coluna_id text, p_id uuid, p_dados jsonb)
returns void language plpgsql set search_path = ''
as $$
declare
  v_cols text := interno.colunas(p_tabela, p_dados - p_coluna_id);
  v_n integer;
begin
  if v_cols is null then
    return;
  end if;
  execute format(
    'update %s set (%s) = (select %s from jsonb_populate_record(null::%s, $1)) where %I = $2',
    p_tabela, v_cols, v_cols, p_tabela, p_coluna_id
  ) using p_dados, p_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Registro não encontrado ou sem permissão.' using errcode = '42501';
  end if;
end
$$;

grant execute on all functions in schema interno to authenticated, service_role;

create or replace function public.salvar_veiculo(
  p_id uuid,
  p_veiculo jsonb,
  p_sigilo jsonb default null,
  p_consignacao jsonb default null
) returns uuid language plpgsql set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_tipo public.tipo_veiculo;
  v_consignacao_id uuid;
begin
  if not public.is_gestor() then
    raise exception 'Somente dono ou gerente cadastram veículos.' using errcode = '42501';
  end if;

  if v_id is null then
    v_id := interno.inserir('public.veiculos', p_veiculo);
  else
    perform interno.atualizar('public.veiculos', 'id', v_id, p_veiculo);
  end if;

  select v.tipo into v_tipo from public.veiculos v where v.id = v_id;

  if p_sigilo is not null then
    if exists (select 1 from public.veiculos_sigilo s where s.veiculo_id = v_id) then
      perform interno.atualizar('public.veiculos_sigilo', 'veiculo_id', v_id, p_sigilo);
    else
      perform interno.inserir('public.veiculos_sigilo', p_sigilo, jsonb_build_object('veiculo_id', v_id));
    end if;
  elsif not exists (select 1 from public.veiculos_sigilo s where s.veiculo_id = v_id) then
    insert into public.veiculos_sigilo (veiculo_id) values (v_id);
  end if;

  if v_tipo = 'consignado' and p_consignacao is not null then
    select c.id into v_consignacao_id from public.consignacoes c where c.veiculo_id = v_id and c.status = 'vigente';
    if v_consignacao_id is null then
      perform interno.inserir('public.consignacoes', p_consignacao, jsonb_build_object('veiculo_id', v_id));
    else
      perform interno.atualizar('public.consignacoes', 'id', v_consignacao_id, p_consignacao - 'veiculo_id' - 'status');
    end if;
  end if;

  return v_id;
end
$$;
grant execute on function public.salvar_veiculo(uuid, jsonb, jsonb, jsonb) to authenticated;

-- Mudança de status com regras (devolução de consignado fecha a consignação).
create or replace function public.alterar_status_veiculo(p_id uuid, p_status public.status_veiculo, p_motivo text default null)
returns void language plpgsql set search_path = ''
as $$
declare
  v public.veiculos;
begin
  if not public.is_gestor() then
    raise exception 'Somente dono ou gerente alteram o status.' using errcode = '42501';
  end if;
  select * into v from public.veiculos where id = p_id for update;
  if not found then
    raise exception 'Veículo não encontrado.' using errcode = 'P0001';
  end if;
  if v.status = 'vendido' then
    raise exception 'Carro vendido: para desfazer, cancele a venda.' using errcode = 'P0001';
  end if;
  if p_status = 'vendido' then
    raise exception 'Para marcar como vendido, registre a venda.' using errcode = 'P0001';
  end if;
  if v.status = 'devolvido' and v.tipo = 'consignado' then
    raise exception 'Carro devolvido ao dono: cadastre uma nova consignação para ele voltar ao estoque.' using errcode = 'P0001';
  end if;

  update public.veiculos
     set status = p_status,
         data_saida = case when p_status = 'devolvido' then public.hoje() else null end,
         reservado_para_cliente_id = case when p_status = 'reservado' then reservado_para_cliente_id else null end,
         reservado_ate = case when p_status = 'reservado' then reservado_ate else null end
   where id = p_id;

  if p_status = 'devolvido' then
    update public.consignacoes
       set status = 'devolvido', data_devolucao = public.hoje(), motivo_devolucao = p_motivo
     where veiculo_id = p_id and status = 'vigente';
  end if;
end
$$;
grant execute on function public.alterar_status_veiculo(uuid, public.status_veiculo, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Views (security_invoker: respeitam a RLS de quem consulta)
-- -----------------------------------------------------------------------------
create or replace view public.v_veiculos with (security_invoker = true) as
select
  v.*,
  (coalesce(v.data_saida, public.hoje()) - v.data_entrada) as dias_em_estoque,
  (select a.path from public.arquivos a
    where a.entidade = 'veiculo' and a.entidade_id = v.id and a.categoria = 'foto'
    order by a.capa desc, a.ordem, a.criado_em limit 1) as foto_capa,
  (select count(*) from public.arquivos a
    where a.entidade = 'veiculo' and a.entidade_id = v.id and a.categoria = 'foto')::int as qtd_fotos
from public.veiculos v;

-- Existe regra de comissão da loja aplicável ao consignante? (redefinida na migration de comissões)
create or replace function public.existe_regra_loja(p_consignante uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select false $$;

create or replace view public.v_veiculos_gestao with (security_invoker = true) as
with custos as (
  select c.veiculo_id,
         sum(c.valor) as total,
         sum(c.valor) filter (where c.cobrar_do_consignante) as cobrado_consignante
    from public.custos_veiculo c
   group by c.veiculo_id
)
select
  v.*,
  s.valor_compra,
  s.data_compra,
  s.fornecedor_id,
  f.nome as fornecedor_nome,
  s.preco_minimo,
  s.observacoes_internas,
  coalesce(cu.total, 0)::numeric(12, 2) as custos_total,
  coalesce(cu.cobrado_consignante, 0)::numeric(12, 2) as custos_cobrados_consignante,
  case
    when v.tipo = 'proprio' then (coalesce(s.valor_compra, 0) + coalesce(cu.total, 0))::numeric(12, 2)
    else (coalesce(cu.total, 0) - coalesce(cu.cobrado_consignante, 0))::numeric(12, 2)
  end as custo_total,
  case
    when v.tipo = 'proprio' and v.preco_anunciado is not null and s.valor_compra is not null
      then (v.preco_anunciado - s.valor_compra - coalesce(cu.total, 0))::numeric(12, 2)
  end as margem_prevista,
  cs.id as consignacao_id,
  cs.consignante_id,
  cg.nome as consignante_nome,
  cs.valor_minimo_dono,
  cs.data_inicio as consignacao_inicio,
  cs.data_fim as consignacao_fim,
  cs.contrato_arquivo_id,
  cs.regra_comissao_id,
  cs.recebimento_padrao,
  array_remove(array[
    case when v.placa is null then 'placa' end,
    case when v.chassi is null then 'chassi' end,
    case when v.renavam is null then 'renavam' end,
    case when v.km is null then 'km' end,
    case when v.cambio is null then 'câmbio' end,
    case when v.combustivel is null then 'combustível' end,
    case when v.cor is null then 'cor' end,
    case when v.ano_fabricacao is null or v.ano_modelo is null then 'ano fab./modelo' end,
    case when v.preco_anunciado is null then 'preço anunciado' end,
    case when v.qtd_fotos = 0 then 'fotos' end,
    case when v.tipo = 'proprio' and s.valor_compra is null then 'valor de compra' end,
    case when v.tipo = 'proprio' and v.origem = 'compra' and s.fornecedor_id is null then 'fornecedor' end,
    case when v.tipo = 'consignado' and cs.id is not null and cs.contrato_arquivo_id is null then 'contrato de consignação' end,
    case when v.tipo = 'consignado' and cs.id is not null and cs.valor_minimo_dono is null then 'valor mínimo do dono' end,
    case when v.tipo = 'consignado' and cs.id is not null and cs.data_fim is null then 'prazo do contrato' end,
    case when v.tipo = 'consignado' and cs.id is not null and cs.regra_comissao_id is null and not public.existe_regra_loja(cs.consignante_id) then 'regra de comissão' end
  ], null) as pendencias
from public.v_veiculos v
left join public.veiculos_sigilo s on s.veiculo_id = v.id
left join public.fornecedores f on f.id = s.fornecedor_id
left join custos cu on cu.veiculo_id = v.id
left join lateral (
  select c2.* from public.consignacoes c2
   where c2.veiculo_id = v.id
   order by (c2.status = 'vigente') desc, c2.criado_em desc
   limit 1
) cs on true
left join public.consignantes cg on cg.id = cs.consignante_id
where public.is_gestor();

grant select on public.v_veiculos, public.v_veiculos_gestao to authenticated;

-- -----------------------------------------------------------------------------
-- Arquivos: vendedor vê fotos e documentos não sigilosos de veículos
-- -----------------------------------------------------------------------------
-- (pode_ver_entidade da fundação já cobre: veículo + não sigiloso)

-- -----------------------------------------------------------------------------
-- Storage: buckets e políticas
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos-veiculos', 'fotos-veiculos', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('documentos', 'documentos', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('fiscal', 'fiscal', false, 10485760, array['application/xml', 'text/xml', 'application/pdf']),
  ('extratos', 'extratos', false, 10485760, array['application/x-ofx', 'application/ofx', 'text/csv', 'text/plain', 'application/octet-stream', 'application/vnd.ms-excel'])
on conflict (id) do nothing;

-- Fotos: leitura pública (anúncios); só gestor envia, altera e remove.
create policy fotos_gestor_envia on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-veiculos' and (select public.is_gestor()));
create policy fotos_gestor_altera on storage.objects for update to authenticated
  using (bucket_id = 'fotos-veiculos' and (select public.is_gestor()));
create policy fotos_gestor_remove on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-veiculos' and (select public.is_gestor()));

-- Documentos privados: leitura conforme a tabela `arquivos` (mesma regra de quem vê a entidade).
create policy documentos_ler on storage.objects for select to authenticated
  using (
    bucket_id in ('documentos', 'fiscal', 'extratos')
    and exists (
      select 1 from public.arquivos a
       where a.bucket = storage.objects.bucket_id and a.path = storage.objects.name
         and public.pode_ver_entidade(a.entidade, a.entidade_id, a.sigiloso)
    )
  );
create policy documentos_gestor_envia on storage.objects for insert to authenticated
  with check (bucket_id in ('documentos', 'fiscal', 'extratos') and (select public.is_gestor()));
create policy documentos_gestor_remove on storage.objects for delete to authenticated
  using (bucket_id in ('documentos', 'fiscal', 'extratos') and (select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Catálogo inicial de itens (editável pelo dono/gerente)
-- -----------------------------------------------------------------------------
insert into public.itens_catalogo (item, categoria, ordem) values
  ('Ar-condicionado', 'Conforto', 10),
  ('Direção elétrica', 'Conforto', 20),
  ('Direção hidráulica', 'Conforto', 21),
  ('Vidros elétricos', 'Conforto', 30),
  ('Travas elétricas', 'Conforto', 40),
  ('Retrovisores elétricos', 'Conforto', 50),
  ('Piloto automático', 'Conforto', 60),
  ('Bancos de couro', 'Conforto', 70),
  ('Partida por botão', 'Conforto', 80),
  ('Teto solar', 'Conforto', 90),
  ('Central multimídia', 'Tecnologia', 100),
  ('Android Auto / Apple CarPlay', 'Tecnologia', 110),
  ('Câmera de ré', 'Tecnologia', 120),
  ('Sensor de estacionamento', 'Tecnologia', 130),
  ('Painel digital', 'Tecnologia', 140),
  ('Carregador por indução', 'Tecnologia', 150),
  ('Airbags', 'Segurança', 200),
  ('Freios ABS', 'Segurança', 210),
  ('Controle de estabilidade', 'Segurança', 220),
  ('Rodas de liga leve', 'Visual', 300),
  ('Faróis de LED', 'Visual', 310),
  ('Pneus novos', 'Manutenção', 400),
  ('Revisões em dia', 'Procedência', 500),
  ('Revisões na concessionária', 'Procedência', 510),
  ('Único dono', 'Procedência', 520),
  ('Manual e chave reserva', 'Procedência', 530),
  ('IPVA pago', 'Documentação', 600),
  ('Licenciamento em dia', 'Documentação', 610)
on conflict (item) do nothing;

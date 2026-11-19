-- =============================================================================
-- Caetano Auto CRM — 0002 Cadastros: fornecedores, consignantes e parceiros
-- Acesso: somente dono e gerente (vendedor não vê).
-- =============================================================================

create type public.tipo_fornecedor as enum ('locadora', 'lojista', 'particular', 'oficina', 'despachante', 'outro');
create type public.tipo_parceiro as enum ('indicacao', 'corretor', 'outro');

-- Documento sempre só com dígitos: CPF (11) ou CNPJ (14).
create or replace function public.documento_valido(p text)
returns boolean language sql immutable parallel safe set search_path = ''
as $$ select p is null or p ~ '^(\d{11}|\d{14})$' $$;
grant execute on function public.documento_valido(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Fornecedores: locadoras, lojistas, particulares, oficinas e despachantes
-- -----------------------------------------------------------------------------
create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_fornecedor not null,
  nome text not null check (length(trim(nome)) >= 2),
  razao_social text,
  documento text check (public.documento_valido(documento)),
  tipo_pessoa text generated always as (
    case length(documento) when 11 then 'PF' when 14 then 'PJ' end
  ) stored,
  contato_nome text,
  telefone text,
  whatsapp text,
  email text,
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  chave_pix text,
  dados_bancarios text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create unique index fornecedores_documento_unq on public.fornecedores (documento) where documento is not null;
create index fornecedores_busca_idx on public.fornecedores using gin (public.normalizar(nome || ' ' || coalesce(razao_social, '')) extensions.gin_trgm_ops);
create index fornecedores_tipo_idx on public.fornecedores (tipo, ativo);
comment on table public.fornecedores is 'Locadoras, lojistas, particulares, oficinas e despachantes.';

select public.preparar_tabela('public.fornecedores');
create policy fornecedores_gestor on public.fornecedores
  for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Consignantes: donos dos carros consignados
-- -----------------------------------------------------------------------------
create table public.consignantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) >= 2),
  documento text check (public.documento_valido(documento)),
  telefone text,
  whatsapp text,
  email text,
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  endereco text,
  chave_pix text,
  dados_bancarios text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create unique index consignantes_documento_unq on public.consignantes (documento) where documento is not null;
create index consignantes_busca_idx on public.consignantes using gin (public.normalizar(nome) extensions.gin_trgm_ops);
comment on table public.consignantes is 'Donos dos carros deixados em consignação.';

select public.preparar_tabela('public.consignantes');
create policy consignantes_gestor on public.consignantes
  for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Parceiros: indicação e corretagem
-- -----------------------------------------------------------------------------
create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_parceiro not null default 'indicacao',
  nome text not null check (length(trim(nome)) >= 2),
  documento text check (public.documento_valido(documento)),
  telefone text,
  whatsapp text,
  email text,
  cidade text,
  chave_pix text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create unique index parceiros_documento_unq on public.parceiros (documento) where documento is not null;
comment on table public.parceiros is 'Parceiros que indicam clientes ou fazem corretagem (recebem comissão).';

select public.preparar_tabela('public.parceiros');
create policy parceiros_gestor on public.parceiros
  for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

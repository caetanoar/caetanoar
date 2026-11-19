-- =============================================================================
-- Caetano Auto CRM — 0001 Fundação
-- Perfis de acesso, funções de permissão, carimbo (quem/quando), auditoria,
-- configurações da loja, índice de arquivos e log de acesso a dados pessoais.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Defesa em profundidade: o papel anônimo não recebe nada por padrão
-- e funções não são executáveis por PUBLIC sem GRANT explícito.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

-- -----------------------------------------------------------------------------
-- Usuários e papéis
-- -----------------------------------------------------------------------------
create type public.papel_usuario as enum ('dono', 'gerente', 'vendedor');

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  papel public.papel_usuario not null default 'vendedor',
  telefone text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
comment on table public.usuarios is 'Perfil de cada pessoa que acessa o CRM (dono, gerente ou vendedor).';

-- Funções de permissão. SECURITY DEFINER para ler `usuarios` sem recursão de RLS.
create or replace function public.papel()
returns public.papel_usuario
language sql stable security definer set search_path = ''
as $$
  select u.papel from public.usuarios u where u.id = auth.uid() and u.ativo
$$;

create or replace function public.is_ativo()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.papel() is not null $$;

create or replace function public.is_dono()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.papel() = 'dono', false) $$;

create or replace function public.is_gestor()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.papel() in ('dono', 'gerente'), false) $$;

create or replace function public.is_vendedor()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.papel() = 'vendedor', false) $$;

grant execute on function public.papel(), public.is_ativo(), public.is_dono(),
  public.is_gestor(), public.is_vendedor() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Carimbo: quem criou / alterou e quando
-- -----------------------------------------------------------------------------
create or replace function public.carimbar()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.criado_em := coalesce(new.criado_em, now());
    new.criado_por := coalesce(new.criado_por, auth.uid());
  else
    new.criado_em := old.criado_em;
    new.criado_por := old.criado_por;
  end if;
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end
$$;

-- -----------------------------------------------------------------------------
-- Auditoria: registro imutável de criação, alteração e exclusão
-- -----------------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text,
  acao text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  usuario_id uuid,
  ator text,
  antes jsonb,
  depois jsonb,
  campos_alterados text[],
  criado_em timestamptz not null default now()
);
create index auditoria_registro_idx on public.auditoria (tabela, registro_id);
create index auditoria_data_idx on public.auditoria (criado_em desc);
create index auditoria_usuario_idx on public.auditoria (usuario_id);
comment on table public.auditoria is 'Quem criou, alterou ou excluiu cada registro, e quando. Somente leitura (dono).';

-- tg_argv[0] = coluna da chave (padrão "id"); tg_argv[1] = colunas a ocultar, separadas por vírgula
create or replace function public.auditar()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_pk text := coalesce(tg_argv[0], 'id');
  v_ocultar text[] := string_to_array(coalesce(tg_argv[1], ''), ',');
  v_antes jsonb;
  v_depois jsonb;
  v_campos text[];
  v_uid uuid := auth.uid();
  v_ator text;
  v_col text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_antes := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_depois := to_jsonb(new); end if;

  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_campos
      from jsonb_object_keys(v_depois) as k
     where k not in ('atualizado_em', 'atualizado_por')
       and (v_antes -> k) is distinct from (v_depois -> k);
    if v_campos is null then
      return new;
    end if;
  end if;

  foreach v_col in array v_ocultar loop
    if v_col <> '' then
      if v_antes ? v_col then v_antes := jsonb_set(v_antes, array[v_col], '"***"'); end if;
      if v_depois ? v_col then v_depois := jsonb_set(v_depois, array[v_col], '"***"'); end if;
    end if;
  end loop;

  v_ator := nullif(current_setting('app.ator', true), '');
  if v_ator is null and v_uid is not null then
    select u.nome into v_ator from public.usuarios u where u.id = v_uid;
  end if;
  if v_ator is null then
    v_ator := 'sistema';
  end if;

  insert into public.auditoria (tabela, registro_id, acao, usuario_id, ator, antes, depois, campos_alterados)
  values (
    tg_table_name,
    coalesce(v_depois ->> v_pk, v_antes ->> v_pk),
    tg_op,
    v_uid,
    v_ator,
    v_antes,
    v_depois,
    v_campos
  );
  return coalesce(new, old);
end
$$;

-- Prepara uma tabela de negócio: carimbo + auditoria + RLS ligada.
create or replace function public.preparar_tabela(
  p_tabela regclass,
  p_pk text default 'id',
  p_ocultar text default ''
) returns void language plpgsql set search_path = ''
as $$
begin
  execute format('alter table %s enable row level security', p_tabela);
  execute format('drop trigger if exists carimbar on %s', p_tabela);
  execute format('create trigger carimbar before insert or update on %s for each row execute function public.carimbar()', p_tabela);
  execute format('drop trigger if exists auditar on %s', p_tabela);
  execute format('create trigger auditar after insert or update or delete on %s for each row execute function public.auditar(%L, %L)', p_tabela, p_pk, p_ocultar);
  execute format('revoke all on %s from anon', p_tabela);
end
$$;

-- -----------------------------------------------------------------------------
-- Usuários: criação automática do perfil, proteção do último dono
-- -----------------------------------------------------------------------------
create or replace function public.criar_perfil_usuario()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_papel public.papel_usuario;
begin
  begin
    v_papel := coalesce((new.raw_app_meta_data ->> 'papel')::public.papel_usuario, 'vendedor');
  exception when others then
    v_papel := 'vendedor';
  end;
  insert into public.usuarios (id, nome, email, papel)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    v_papel
  )
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger criar_perfil_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_usuario();

create or replace function public.proteger_ultimo_dono()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (tg_op = 'DELETE' and old.papel = 'dono' and old.ativo)
     or (tg_op = 'UPDATE' and old.papel = 'dono' and old.ativo and (new.papel <> 'dono' or not new.ativo)) then
    if not exists (
      select 1 from public.usuarios u
       where u.papel = 'dono' and u.ativo and u.id <> old.id
    ) then
      raise exception 'É preciso manter ao menos um dono ativo.' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end
$$;

create trigger proteger_ultimo_dono
  before update or delete on public.usuarios
  for each row execute function public.proteger_ultimo_dono();

select public.preparar_tabela('public.usuarios');

create policy usuarios_ver on public.usuarios
  for select to authenticated using ((select public.is_ativo()));
create policy usuarios_dono_altera on public.usuarios
  for update to authenticated
  using ((select public.is_dono())) with check ((select public.is_dono()));

-- Cada pessoa pode atualizar o próprio nome e telefone (sem mexer no papel)
create or replace function public.atualizar_meu_perfil(p_nome text, p_telefone text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_ativo() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  update public.usuarios
     set nome = coalesce(nullif(trim(p_nome), ''), nome),
         telefone = nullif(trim(p_telefone), '')
   where id = auth.uid();
end
$$;
grant execute on function public.atualizar_meu_perfil(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Configurações da loja (linha única; só o dono altera)
-- -----------------------------------------------------------------------------
create table public.configuracoes (
  id boolean primary key default true check (id),
  nome_loja text not null default 'Caetano Auto',
  cidade text not null default 'Divinópolis',
  uf text not null default 'MG',
  regiao_anuncio text not null default 'Divinópolis e região',
  whatsapp_numero text not null default '5537991193815',
  telefones_assinatura text not null default '(37) 99119-3815 | (37) 99867-8978',
  assinatura text not null default 'Caetano Auto, carros com procedência e história.',
  garantia_dias_padrao integer not null default 90 check (garantia_dias_padrao >= 0),
  garantia_cobertura_padrao text,
  alerta_garantia_dias integer not null default 15 check (alerta_garantia_dias >= 0),
  estoque_parado_dias integer not null default 45 check (estoque_parado_dias > 0),
  alerta_contas_dias integer not null default 7 check (alerta_contas_dias >= 0),
  recebimento_consignado_padrao text not null default 'loja_repassa'
    check (recebimento_consignado_padrao in ('loja_repassa', 'direto_dono')),
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
comment on column public.configuracoes.garantia_cobertura_padrao is 'Texto da cobertura padrão da garantia — a definir pelo dono.';

select public.preparar_tabela('public.configuracoes');
insert into public.configuracoes (id) values (true);

create policy configuracoes_ver on public.configuracoes
  for select to authenticated using ((select public.is_ativo()));
create policy configuracoes_dono_altera on public.configuracoes
  for update to authenticated
  using ((select public.is_dono())) with check ((select public.is_dono()));

-- -----------------------------------------------------------------------------
-- Auditoria: só o dono lê; ninguém altera nem apaga
-- -----------------------------------------------------------------------------
alter table public.auditoria enable row level security;
revoke all on public.auditoria from anon, authenticated;
grant select on public.auditoria to authenticated;
create policy auditoria_dono_le on public.auditoria
  for select to authenticated using ((select public.is_dono()));

-- -----------------------------------------------------------------------------
-- Log LGPD de acesso a dados pessoais (CPF, RG, endereço)
-- -----------------------------------------------------------------------------
create table public.acessos_dados_pessoais (
  id bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid(),
  tabela text not null,
  registro_id text not null,
  campo text not null,
  motivo text,
  acessado_em timestamptz not null default now()
);
create index acessos_dados_pessoais_registro_idx on public.acessos_dados_pessoais (tabela, registro_id);
alter table public.acessos_dados_pessoais enable row level security;
revoke all on public.acessos_dados_pessoais from anon, authenticated;
grant select on public.acessos_dados_pessoais to authenticated;
create policy acessos_dono_le on public.acessos_dados_pessoais
  for select to authenticated using ((select public.is_dono()));

-- -----------------------------------------------------------------------------
-- Índice de arquivos guardados no Storage
-- -----------------------------------------------------------------------------
create type public.entidade_arquivo as enum
  ('veiculo', 'consignacao', 'cliente', 'venda', 'nota', 'extrato', 'garantia', 'lancamento', 'fornecedor', 'consignante');
create type public.categoria_arquivo as enum
  ('foto', 'crlv', 'laudo', 'contrato', 'nf_xml', 'nf_pdf', 'comprovante', 'documento', 'outro');

create table public.arquivos (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  nome text not null,
  mime text,
  tamanho bigint,
  entidade public.entidade_arquivo not null,
  entidade_id uuid not null,
  categoria public.categoria_arquivo not null default 'outro',
  ordem integer not null default 0,
  capa boolean not null default false,
  sigiloso boolean not null default false,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  unique (bucket, path)
);
create index arquivos_entidade_idx on public.arquivos (entidade, entidade_id, categoria, ordem);

-- Quem pode ver os arquivos de uma entidade. Redefinida nas migrations seguintes
-- conforme novas entidades (clientes, vendas) ganham regras próprias.
create or replace function public.pode_ver_entidade(p_entidade public.entidade_arquivo, p_id uuid, p_sigiloso boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when public.is_gestor() then true
    when not public.is_ativo() then false
    when p_sigiloso then false
    when p_entidade = 'veiculo' then true
    else false
  end
$$;
grant execute on function public.pode_ver_entidade(public.entidade_arquivo, uuid, boolean) to authenticated;

select public.preparar_tabela('public.arquivos');

create policy arquivos_ver on public.arquivos
  for select to authenticated
  using (public.pode_ver_entidade(entidade, entidade_id, sigiloso));
create policy arquivos_gestor_insere on public.arquivos
  for insert to authenticated with check ((select public.is_gestor()));
create policy arquivos_gestor_altera on public.arquivos
  for update to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));
create policy arquivos_gestor_exclui on public.arquivos
  for delete to authenticated using ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Utilitário: normaliza texto para busca (sem acento, minúsculo)
-- -----------------------------------------------------------------------------
create or replace function public.normalizar(p text)
returns text language sql immutable parallel safe set search_path = ''
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p, ''))) $$;
grant execute on function public.normalizar(text) to authenticated, service_role;

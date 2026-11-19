-- =============================================================================
-- Caetano Auto CRM — 0005 Clientes e funil de vendas
-- Vendedor vê e edita só os próprios clientes. CPF/RG não podem ser lidos
-- diretamente: só pela função revelar_dado_pessoal(), que grava log (LGPD).
-- =============================================================================

create type public.origem_lead as enum ('instagram', 'marketplace', 'olx', 'indicacao', 'loja', 'site', 'whatsapp', 'outro');
create type public.etapa_funil as enum ('lead', 'negociacao', 'ganho', 'perdido');
create type public.motivo_perda as enum
  ('preco', 'financiamento_negado', 'comprou_outro_lugar', 'desistiu', 'sem_contato', 'carro_vendido', 'outro');
create type public.canal_contato as enum ('whatsapp', 'ligacao', 'loja', 'instagram', 'email', 'outro');

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) >= 2),
  telefone text check (telefone is null or telefone ~ '^\d{10,11}$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\d{10,11}$'),
  email text,
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  origem public.origem_lead not null default 'loja',
  parceiro_id uuid references public.parceiros (id) on delete set null,
  vendedor_id uuid references public.usuarios (id) on delete set null,
  etapa public.etapa_funil not null default 'lead',
  motivo_perda public.motivo_perda,
  motivo_perda_detalhe text,
  aceita_marketing boolean not null default false,
  ultimo_contato_em timestamptz,
  proximo_contato_em date,
  observacoes text,
  anonimizado_em timestamptz,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint clientes_perda_com_motivo check (etapa <> 'perdido' or motivo_perda is not null)
);
create index clientes_vendedor_idx on public.clientes (vendedor_id, etapa);
create index clientes_telefone_idx on public.clientes (telefone);
create index clientes_whatsapp_idx on public.clientes (whatsapp);
create index clientes_proximo_idx on public.clientes (proximo_contato_em) where etapa in ('lead', 'negociacao');
create index clientes_busca_idx on public.clientes using gin (public.normalizar(nome) extensions.gin_trgm_ops);

-- Quem pode ver um cliente: gestão ou o vendedor responsável.
create or replace function public.pode_ver_cliente(p_cliente uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_gestor()
      or exists (select 1 from public.clientes c where c.id = p_cliente and c.vendedor_id = auth.uid() and public.is_ativo())
$$;
grant execute on function public.pode_ver_cliente(uuid) to authenticated;

select public.preparar_tabela('public.clientes');
create policy clientes_ver on public.clientes for select to authenticated
  using ((select public.is_gestor()) or vendedor_id = (select auth.uid()));
create policy clientes_inserir on public.clientes for insert to authenticated
  with check ((select public.is_gestor()) or ((select public.is_vendedor()) and vendedor_id = (select auth.uid())));
create policy clientes_alterar on public.clientes for update to authenticated
  using ((select public.is_gestor()) or vendedor_id = (select auth.uid()))
  with check ((select public.is_gestor()) or vendedor_id = (select auth.uid()));
create policy clientes_excluir on public.clientes for delete to authenticated using ((select public.is_gestor()));

-- -----------------------------------------------------------------------------
-- Dados pessoais (CPF, RG, nascimento, endereço) — LGPD
-- -----------------------------------------------------------------------------
create table public.clientes_dados_pessoais (
  cliente_id uuid primary key references public.clientes (id) on delete cascade,
  cpf text check (cpf is null or cpf ~ '^\d{11}$'),
  cpf_mascarado text generated always as (
    case when cpf is null then null else '***.' || substr(cpf, 4, 3) || '.' || substr(cpf, 7, 3) || '-**' end
  ) stored,
  rg text,
  data_nascimento date,
  cep text check (cep is null or cep ~ '^\d{8}$'),
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create unique index clientes_cpf_unq on public.clientes_dados_pessoais (cpf) where cpf is not null;
select public.preparar_tabela('public.clientes_dados_pessoais', 'cliente_id', 'cpf,rg,cpf_mascarado');

-- Leitura direta de CPF/RG bloqueada para todos (inclusive gestão): só via função com log.
revoke select on public.clientes_dados_pessoais from authenticated;
grant select (cliente_id, cpf_mascarado, data_nascimento, cep, logradouro, numero, complemento, bairro, cidade, uf,
              criado_em, criado_por, atualizado_em, atualizado_por)
  on public.clientes_dados_pessoais to authenticated;
grant insert, update, delete on public.clientes_dados_pessoais to authenticated;

create policy dados_pessoais_ver on public.clientes_dados_pessoais for select to authenticated
  using (public.pode_ver_cliente(cliente_id));
create policy dados_pessoais_inserir on public.clientes_dados_pessoais for insert to authenticated
  with check (public.pode_ver_cliente(cliente_id));
create policy dados_pessoais_alterar on public.clientes_dados_pessoais for update to authenticated
  using (public.pode_ver_cliente(cliente_id)) with check (public.pode_ver_cliente(cliente_id));
create policy dados_pessoais_excluir on public.clientes_dados_pessoais for delete to authenticated
  using ((select public.is_gestor()));

-- Revela CPF ou RG para quem pode ver o cliente e registra o acesso.
create or replace function public.revelar_dado_pessoal(p_cliente uuid, p_campo text, p_motivo text default null)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_valor text;
begin
  if p_campo not in ('cpf', 'rg') then
    raise exception 'Campo inválido.' using errcode = 'P0001';
  end if;
  if not public.pode_ver_cliente(p_cliente) then
    raise exception 'Você não tem acesso aos dados deste cliente.' using errcode = '42501';
  end if;
  execute format('select %I from public.clientes_dados_pessoais where cliente_id = $1', p_campo) into v_valor using p_cliente;
  insert into public.acessos_dados_pessoais (usuario_id, tabela, registro_id, campo, motivo)
  values (auth.uid(), 'clientes_dados_pessoais', p_cliente::text, p_campo, p_motivo);
  return v_valor;
end
$$;
grant execute on function public.revelar_dado_pessoal(uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Interesses e histórico de contatos
-- -----------------------------------------------------------------------------
create table public.clientes_interesses (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  veiculo_id uuid references public.veiculos (id) on delete set null,
  descricao text,
  preco_max numeric(12, 2) check (preco_max >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint interesse_preenchido check (veiculo_id is not null or length(trim(coalesce(descricao, ''))) >= 2)
);
create index clientes_interesses_cliente_idx on public.clientes_interesses (cliente_id);
create index clientes_interesses_veiculo_idx on public.clientes_interesses (veiculo_id) where ativo;
select public.preparar_tabela('public.clientes_interesses');
create policy interesses_cliente on public.clientes_interesses for all to authenticated
  using (public.pode_ver_cliente(cliente_id)) with check (public.pode_ver_cliente(cliente_id));

create table public.clientes_contatos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  usuario_id uuid references public.usuarios (id) on delete set null default auth.uid(),
  data_hora timestamptz not null default now(),
  canal public.canal_contato not null default 'whatsapp',
  resumo text not null check (length(trim(resumo)) >= 2),
  proximo_passo text,
  proximo_contato_em date,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index clientes_contatos_cliente_idx on public.clientes_contatos (cliente_id, data_hora desc);
select public.preparar_tabela('public.clientes_contatos');
create policy contatos_ver on public.clientes_contatos for select to authenticated using (public.pode_ver_cliente(cliente_id));
create policy contatos_inserir on public.clientes_contatos for insert to authenticated
  with check (public.pode_ver_cliente(cliente_id) and usuario_id = (select auth.uid()));
create policy contatos_gestor_altera on public.clientes_contatos for update to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));
create policy contatos_gestor_exclui on public.clientes_contatos for delete to authenticated using ((select public.is_gestor()));

-- Atualiza último/próximo contato do cliente e tira do "lead" quando houver conversa.
create or replace function public.registrar_contato_cliente()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.clientes c
     set ultimo_contato_em = greatest(coalesce(c.ultimo_contato_em, new.data_hora), new.data_hora),
         proximo_contato_em = new.proximo_contato_em
   where c.id = new.cliente_id;
  return new;
end
$$;
create trigger registrar_contato_cliente after insert on public.clientes_contatos
  for each row execute function public.registrar_contato_cliente();

-- -----------------------------------------------------------------------------
-- Antiduplicidade sem expor clientes de outro vendedor
-- -----------------------------------------------------------------------------
create or replace function public.cliente_existe(p_telefone text)
returns table (cliente_id uuid, primeiro_nome text, vendedor text, e_meu boolean)
language sql stable security definer set search_path = ''
as $$
  select
    case when public.pode_ver_cliente(c.id) then c.id end,
    split_part(c.nome, ' ', 1),
    coalesce(u.nome, 'sem vendedor'),
    c.vendedor_id = auth.uid()
  from public.clientes c
  left join public.usuarios u on u.id = c.vendedor_id
  where public.is_ativo()
    and length(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g')) >= 10
    and regexp_replace(p_telefone, '\D', '', 'g') in (c.telefone, c.whatsapp)
    and c.anonimizado_em is null
  limit 3
$$;
grant execute on function public.cliente_existe(text) to authenticated;

-- Parceiros ativos (nome) para o vendedor indicar a origem do lead.
create or replace function public.listar_parceiros_ativos()
returns table (id uuid, nome text) language sql stable security definer set search_path = ''
as $$ select p.id, p.nome from public.parceiros p where p.ativo and public.is_ativo() order by p.nome $$;
grant execute on function public.listar_parceiros_ativos() to authenticated;

-- Vendedores ativos (para atribuir clientes)
create or replace function public.listar_vendedores()
returns table (id uuid, nome text, papel public.papel_usuario) language sql stable security definer set search_path = ''
as $$ select u.id, u.nome, u.papel from public.usuarios u where u.ativo and public.is_ativo() order by u.nome $$;
grant execute on function public.listar_vendedores() to authenticated;

-- LGPD: anonimiza um cliente a pedido (só o dono). Mantém vendas e números, remove identificação.
create or replace function public.anonimizar_cliente(p_cliente uuid)
returns void language plpgsql set search_path = ''
as $$
begin
  if not public.is_dono() then
    raise exception 'Somente o dono pode anonimizar clientes.' using errcode = '42501';
  end if;
  update public.clientes
     set nome = 'Cliente anonimizado', telefone = null, whatsapp = null, email = null,
         observacoes = null, aceita_marketing = false, anonimizado_em = now(),
         etapa = case when etapa in ('lead', 'negociacao') then 'perdido' else etapa end,
         motivo_perda = case when etapa in ('lead', 'negociacao') then 'outro' else motivo_perda end
   where id = p_cliente;
  delete from public.clientes_dados_pessoais where cliente_id = p_cliente;
  update public.clientes_contatos set resumo = '[removido a pedido do cliente]', proximo_passo = null where cliente_id = p_cliente;
end
$$;
grant execute on function public.anonimizar_cliente(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Vínculos com estoque e arquivos
-- -----------------------------------------------------------------------------
alter table public.veiculos_sigilo
  add constraint veiculos_sigilo_cliente_origem_fk foreign key (cliente_origem_id) references public.clientes (id) on delete set null;
alter table public.veiculos
  add constraint veiculos_reservado_cliente_fk foreign key (reservado_para_cliente_id) references public.clientes (id) on delete set null;

create or replace function public.pode_ver_entidade(p_entidade public.entidade_arquivo, p_id uuid, p_sigiloso boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when public.is_gestor() then true
    when not public.is_ativo() then false
    when p_sigiloso then false
    when p_entidade = 'veiculo' then true
    when p_entidade = 'cliente' then public.pode_ver_cliente(p_id)
    else false
  end
$$;

create or replace view public.v_clientes with (security_invoker = true) as
select
  c.*,
  u.nome as vendedor_nome,
  p.nome as parceiro_nome,
  (select string_agg(coalesce(v.marca || ' ' || v.modelo, i.descricao), ', ')
     from public.clientes_interesses i
     left join public.veiculos v on v.id = i.veiculo_id
    where i.cliente_id = c.id and i.ativo) as interesses,
  (c.proximo_contato_em is not null and c.proximo_contato_em <= public.hoje() and c.etapa in ('lead', 'negociacao')) as followup_pendente
from public.clientes c
left join public.usuarios u on u.id = c.vendedor_id
left join public.parceiros p on p.id = c.parceiro_id;
grant select on public.v_clientes to authenticated;

-- -----------------------------------------------------------------------------
-- Gravação atômica: cliente + dados pessoais (SECURITY INVOKER: RLS vale)
-- -----------------------------------------------------------------------------
create or replace function public.salvar_cliente(p_id uuid, p_cliente jsonb, p_pessoais jsonb default null)
returns uuid language plpgsql set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_existe boolean;
begin
  if not public.is_ativo() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if v_id is null then
    v_id := interno.inserir('public.clientes', p_cliente);
  else
    perform interno.atualizar('public.clientes', 'id', v_id, p_cliente);
  end if;
  if p_pessoais is not null and p_pessoais <> '{}'::jsonb then
    select exists (select 1 from public.clientes_dados_pessoais d where d.cliente_id = v_id) into v_existe;
    if v_existe then
      perform interno.atualizar('public.clientes_dados_pessoais', 'cliente_id', v_id, p_pessoais);
    else
      perform interno.inserir('public.clientes_dados_pessoais', p_pessoais, jsonb_build_object('cliente_id', v_id));
    end if;
  end if;
  return v_id;
end
$$;
grant execute on function public.salvar_cliente(uuid, jsonb, jsonb) to authenticated;

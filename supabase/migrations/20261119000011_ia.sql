-- =============================================================================
-- Caetano Auto CRM — 0011 Assistente de IA
-- Registro das gerações (anúncios de veículo e resumo/follow-up de cliente).
-- A IA nunca recebe CPF, telefone ou e-mail; a entrada gravada aqui é a mesma
-- que foi enviada ao modelo, para auditoria.
-- =============================================================================

create type public.tipo_geracao_ia as enum ('anuncio', 'cliente');

create table public.ia_geracoes (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_geracao_ia not null,
  veiculo_id uuid references public.veiculos (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete cascade,
  entrada jsonb not null,
  saida jsonb not null,
  avisos text[] not null default '{}',
  modelo text not null,
  simulado boolean not null default false,
  tokens_entrada integer,
  tokens_saida integer,
  usuario_id uuid not null default auth.uid() references public.usuarios (id),
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint ia_geracoes_alvo check (
    (tipo = 'anuncio' and veiculo_id is not null and cliente_id is null)
    or (tipo = 'cliente' and cliente_id is not null and veiculo_id is null)
  )
);
create index ia_geracoes_veiculo_idx on public.ia_geracoes (veiculo_id, criado_em desc) where veiculo_id is not null;
create index ia_geracoes_cliente_idx on public.ia_geracoes (cliente_id, criado_em desc) where cliente_id is not null;
create index ia_geracoes_usuario_dia_idx on public.ia_geracoes (usuario_id, criado_em);
select public.preparar_tabela('public.ia_geracoes');

-- Anúncios: qualquer usuário ativo (todos veem o estoque).
-- Cliente: só quem pode ver o cliente (gestor, ou o vendedor responsável).
create policy ia_select on public.ia_geracoes for select to authenticated
  using (
    (select public.is_ativo())
    and (
      (tipo = 'anuncio')
      or (tipo = 'cliente' and public.pode_ver_entidade('cliente', cliente_id, false))
    )
  );

create policy ia_insert on public.ia_geracoes for insert to authenticated
  with check (
    (select public.is_ativo())
    and usuario_id = (select auth.uid())
    and (
      (tipo = 'anuncio' and exists (select 1 from public.veiculos v where v.id = veiculo_id))
      or (tipo = 'cliente' and public.pode_ver_entidade('cliente', cliente_id, false))
    )
  );

-- Histórico imutável: ninguém altera; só o dono apaga.
create policy ia_delete on public.ia_geracoes for delete to authenticated
  using ((select public.is_dono()));

-- Quantas gerações o usuário fez hoje (limite diário de custo).
create or replace function public.ia_geracoes_hoje()
returns integer language sql stable security invoker set search_path = ''
as $$
  select count(*)::int from public.ia_geracoes
   where usuario_id = auth.uid()
     and criado_em >= (public.hoje()::timestamp at time zone 'America/Sao_Paulo')
$$;
grant execute on function public.ia_geracoes_hoje() to authenticated;

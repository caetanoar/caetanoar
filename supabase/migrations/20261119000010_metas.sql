-- =============================================================================
-- Caetano Auto CRM — 0010 Metas mensais e indicadores
-- Metas da loja (vendedor nulo) e por vendedor. O dono define; gerente vê;
-- vendedor vê só a própria meta e o próprio resultado (sem lucro).
-- =============================================================================

create table public.metas (
  id uuid primary key default gen_random_uuid(),
  mes date not null check (extract(day from mes) = 1),
  vendedor_id uuid references public.usuarios (id) on delete cascade,
  meta_faturamento numeric(14, 2) check (meta_faturamento >= 0),
  meta_lucro numeric(14, 2) check (meta_lucro >= 0),
  meta_qtd_vendas integer check (meta_qtd_vendas >= 0),
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create unique index metas_mes_vendedor_unq on public.metas (mes, coalesce(vendedor_id, '00000000-0000-0000-0000-000000000000'::uuid));
select public.preparar_tabela('public.metas');
create policy metas_ver on public.metas for select to authenticated
  using ((select public.is_gestor()) or vendedor_id = (select auth.uid()));
create policy metas_dono_insere on public.metas for insert to authenticated with check ((select public.is_dono()));
create policy metas_dono_altera on public.metas for update to authenticated
  using ((select public.is_dono())) with check ((select public.is_dono()));
create policy metas_dono_exclui on public.metas for delete to authenticated using ((select public.is_dono()));

-- Resultado do vendedor no mês (sem lucro nem custos).
create or replace function public.meu_dashboard(p_mes date)
returns jsonb language sql stable security definer set search_path = ''
as $$
  with m as (select date_trunc('month', p_mes)::date as ini, (date_trunc('month', p_mes) + interval '1 month - 1 day')::date as fim),
  v as (
    select vd.* from public.vendas vd, m
     where vd.vendedor_id = auth.uid() and vd.status = 'fechada' and vd.data_venda between m.ini and m.fim
  )
  select jsonb_build_object(
    'meta_faturamento', (select meta_faturamento from public.metas, m where vendedor_id = auth.uid() and mes = m.ini),
    'meta_qtd_vendas', (select meta_qtd_vendas from public.metas, m where vendedor_id = auth.uid() and mes = m.ini),
    'qtd_vendas', (select count(*) from v),
    'faturamento', (select coalesce(sum(valor_venda), 0) from v),
    'ticket_medio', (select coalesce(round(avg(valor_venda), 2), 0) from v),
    'comissoes', (select coalesce(sum(c.valor), 0) from public.comissoes c join v on v.id = c.venda_id where c.tipo = 'vendedor' and c.usuario_id = auth.uid() and c.status <> 'cancelada'),
    'aguardando', (select count(*) from public.vendas where vendedor_id = auth.uid() and status = 'aguardando_aprovacao'),
    'clientes_ativos', (select count(*) from public.clientes where vendedor_id = auth.uid() and etapa in ('lead', 'negociacao')),
    'retornos_pendentes', (select count(*) from public.clientes where vendedor_id = auth.uid() and etapa in ('lead', 'negociacao') and proximo_contato_em <= public.hoje())
  )
  where public.is_ativo()
$$;
grant execute on function public.meu_dashboard(date) to authenticated;

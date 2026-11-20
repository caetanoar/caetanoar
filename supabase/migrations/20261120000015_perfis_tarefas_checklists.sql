-- =============================================================================
-- Caetano Auto CRM — 0015 Permissões dos perfis novos, tarefas e checklists
-- Perfis novos: atendimento/pós-venda, preparador, administrativo/despachante.
-- Por padrão eles só herdam o que já é aberto a qualquer usuário ativo (dados
-- públicos do carro, catálogo, FIPE, nomes de usuários, configurações da loja).
-- Tudo o mais é liberado aqui, política por política, só no que cada um precisa.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funções de perfil
-- -----------------------------------------------------------------------------
create or replace function public.is_atendimento()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.papel() = 'atendimento', false) $$;

create or replace function public.is_preparador()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.papel() = 'preparador', false) $$;

create or replace function public.is_administrativo()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.papel() = 'administrativo', false) $$;

create or replace function public.tem_papel(variadic p_papeis public.papel_usuario[])
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.papel() = any (p_papeis), false) $$;

grant execute on function public.is_atendimento(), public.is_preparador(), public.is_administrativo(),
  public.tem_papel(public.papel_usuario[]) to authenticated, service_role;

-- Venda fechada? (usada pelas regras do administrativo)
create or replace function public.venda_fechada(p_venda uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.vendas v where v.id = p_venda and v.status = 'fechada') $$;
grant execute on function public.venda_fechada(uuid) to authenticated;

-- Cliente que comprou (venda fechada)?
create or replace function public.cliente_comprador(p_cliente uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.vendas v where v.cliente_id = p_cliente and v.status = 'fechada') $$;
grant execute on function public.cliente_comprador(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Clientes: atendimento vê e edita todos; administrativo vê só quem comprou.
-- -----------------------------------------------------------------------------
create or replace function public.pode_ver_cliente(p_cliente uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_gestor()
      or public.is_atendimento()
      or exists (select 1 from public.clientes c where c.id = p_cliente and c.vendedor_id = auth.uid() and public.is_ativo())
      or (public.is_administrativo() and public.cliente_comprador(p_cliente))
$$;

drop policy clientes_ver on public.clientes;
create policy clientes_ver on public.clientes for select to authenticated
  using (
    (select public.is_gestor())
    or vendedor_id = (select auth.uid())
    or (select public.is_atendimento())
    or ((select public.is_administrativo()) and public.cliente_comprador(id))
  );

drop policy clientes_alterar on public.clientes;
create policy clientes_alterar on public.clientes for update to authenticated
  using ((select public.is_gestor()) or vendedor_id = (select auth.uid()) or (select public.is_atendimento()))
  with check ((select public.is_gestor()) or vendedor_id = (select auth.uid()) or (select public.is_atendimento()));

-- Atendimento atualiza contato e acompanhamento, mas não troca o vendedor do cliente.
create or replace function public.proteger_vendedor_cliente()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if public.is_atendimento() and new.vendedor_id is distinct from old.vendedor_id then
    raise exception 'O atendimento não altera o vendedor responsável pelo cliente.' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger clientes_proteger_vendedor before update on public.clientes
  for each row execute function public.proteger_vendedor_cliente();

-- CPF/RG: atendimento não revela; administrativo revela só de quem comprou (pode_ver_cliente já limita).
create or replace function public.revelar_dado_pessoal(p_cliente uuid, p_campo text, p_motivo text default null)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_valor text;
begin
  if p_campo not in ('cpf', 'rg') then
    raise exception 'Campo inválido.' using errcode = 'P0001';
  end if;
  if public.is_atendimento() or public.is_preparador() or not public.pode_ver_cliente(p_cliente) then
    raise exception 'Você não tem acesso aos dados deste cliente.' using errcode = '42501';
  end if;
  execute format('select %I from public.clientes_dados_pessoais where cliente_id = $1', p_campo) into v_valor using p_cliente;
  insert into public.acessos_dados_pessoais (usuario_id, tabela, registro_id, campo, motivo)
  values (auth.uid(), 'clientes_dados_pessoais', p_cliente::text, p_campo, p_motivo);
  return v_valor;
end
$$;

-- -----------------------------------------------------------------------------
-- Vendas: administrativo lê as fechadas (dados da transferência: carro, cliente, data, valor).
-- Não ganha escrita em vendas, pagamentos ou trocas (pode_ver_venda segue igual).
-- -----------------------------------------------------------------------------
create policy vendas_ver_administrativo on public.vendas for select to authenticated
  using ((select public.is_administrativo()) and status = 'fechada');

-- -----------------------------------------------------------------------------
-- Garantias: atendimento vê garantias e cuida dos acionamentos (não altera prazo/cobertura).
-- -----------------------------------------------------------------------------
create policy garantias_atendimento_ver on public.garantias for select to authenticated
  using ((select public.is_atendimento()));
create policy acionamentos_atendimento_ver on public.garantias_acionamentos for select to authenticated
  using ((select public.is_atendimento()));
create policy acionamentos_atendimento_insere on public.garantias_acionamentos for insert to authenticated
  with check ((select public.is_atendimento()));
create policy acionamentos_atendimento_altera on public.garantias_acionamentos for update to authenticated
  using ((select public.is_atendimento())) with check ((select public.is_atendimento()));

-- O custo do acionamento vira conta a pagar mesmo quando quem registra não vê o financeiro.
alter function public.acionamento_para_financeiro() security definer;

-- Número da venda para quem pode ver a garantia (o atendimento não lê a tabela de vendas).
create or replace function public.numero_venda(p_venda uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select v.numero from public.vendas v
   where v.id = p_venda
     and (public.is_gestor() or public.is_atendimento() or public.pode_ver_venda(p_venda)
          or (public.is_administrativo() and v.status = 'fechada'))
$$;
grant execute on function public.numero_venda(uuid) to authenticated;

create or replace view public.v_garantias with (security_invoker = true) as
select
  g.*,
  public.numero_venda(g.venda_id) as venda_numero,
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
join public.veiculos ve on ve.id = g.veiculo_id
join public.clientes cl on cl.id = g.cliente_id;
grant select on public.v_garantias to authenticated;

-- -----------------------------------------------------------------------------
-- Preparador: vê só os custos que ele lançou; lança custo por função própria
-- (o custo vira conta a pagar pendente, que o gerente confere).
-- -----------------------------------------------------------------------------
create policy custos_preparador_ver on public.custos_veiculo for select to authenticated
  using ((select public.is_preparador()) and criado_por = (select auth.uid()));

create or replace function public.lancar_custo_preparador(
  p_veiculo uuid, p_tipo public.tipo_custo, p_valor numeric, p_descricao text default null, p_data date default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not (public.is_preparador() or public.is_gestor()) then
    raise exception 'Somente preparador, gerente ou dono lançam custos de preparação.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.veiculos where id = p_veiculo and status = 'em_preparacao') then
    raise exception 'Custos de preparação só para carro em preparação.' using errcode = 'P0001';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'Informe um valor maior que zero.' using errcode = '23514';
  end if;
  insert into public.custos_veiculo (veiculo_id, tipo, descricao, valor, data, observacoes)
  values (p_veiculo, p_tipo, nullif(trim(p_descricao), ''), round(p_valor, 2), coalesce(p_data, public.hoje()),
          case when public.is_preparador() then 'Lançado pelo preparador' end)
  returning id into v_id;
  return v_id;
end
$$;
grant execute on function public.lancar_custo_preparador(uuid, public.tipo_custo, numeric, text, date) to authenticated;

-- -----------------------------------------------------------------------------
-- Arquivos: quem anexa o quê
-- -----------------------------------------------------------------------------
-- Pode anexar documento à venda: gestão; administrativo (venda fechada);
-- vendedor da venda enquanto ela não fecha (ex.: Termo de Ciência assinado).
create or replace function public.pode_anexar_venda(p_venda uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_gestor()
      or (public.is_administrativo() and public.venda_fechada(p_venda))
      or exists (select 1 from public.vendas v where v.id = p_venda and v.vendedor_id = auth.uid()
                  and v.status in ('rascunho', 'aguardando_aprovacao') and public.is_vendedor())
$$;
grant execute on function public.pode_anexar_venda(uuid) to authenticated;

create or replace function public.pode_ver_entidade(p_entidade public.entidade_arquivo, p_id uuid, p_sigiloso boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when public.is_gestor() then true
    when not public.is_ativo() then false
    when p_sigiloso then false
    when p_entidade = 'veiculo' then true
    when p_entidade = 'cliente' then public.pode_ver_cliente(p_id)
    when p_entidade = 'venda' then public.pode_ver_venda(p_id) or (public.is_administrativo() and public.venda_fechada(p_id))
    when p_entidade = 'garantia' then public.is_atendimento()
    else false
  end
$$;

create policy arquivos_colaboradores_insere on public.arquivos for insert to authenticated
  with check (
    not sigiloso and (
      (entidade = 'venda' and public.pode_anexar_venda(entidade_id))
      or (entidade = 'garantia' and (select public.is_atendimento()))
      or (entidade = 'veiculo' and categoria = 'foto' and (select public.is_preparador())
          and exists (select 1 from public.veiculos v where v.id = entidade_id and v.status = 'em_preparacao'))
    )
  );

create policy documentos_colaboradores_envia on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos' and (
      ((storage.foldername(name))[1] = 'vendas' and public.pode_anexar_venda(((storage.foldername(name))[2])::uuid))
      or ((storage.foldername(name))[1] = 'garantias' and (select public.is_atendimento()))
    )
  );

create policy fotos_preparador_envia on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-veiculos' and (select public.is_preparador())
    and exists (select 1 from public.veiculos v where v.id::text = (storage.foldername(name))[1] and v.status = 'em_preparacao')
  );

-- -----------------------------------------------------------------------------
-- Tarefas (por carro, venda, cliente, garantia ou orçamento)
-- -----------------------------------------------------------------------------
create type public.entidade_tarefa as enum ('veiculo', 'venda', 'cliente', 'garantia', 'orcamento');
create type public.status_tarefa as enum ('pendente', 'em_andamento', 'concluida', 'cancelada');

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) >= 3),
  descricao text,
  entidade public.entidade_tarefa,
  entidade_id uuid,
  responsavel_id uuid references public.usuarios (id) on delete set null,
  prazo date,
  status public.status_tarefa not null default 'pendente',
  origem text not null default 'manual' check (origem in ('manual', 'automatica')),
  chave_automatica text unique,
  concluida_em timestamptz,
  concluida_por uuid references public.usuarios (id) on delete set null,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint tarefas_entidade check ((entidade is null) = (entidade_id is null))
);
create index tarefas_responsavel_idx on public.tarefas (responsavel_id, status, prazo);
create index tarefas_entidade_idx on public.tarefas (entidade, entidade_id);
select public.preparar_tabela('public.tarefas');

create policy tarefas_ver on public.tarefas for select to authenticated
  using ((select public.is_gestor()) or responsavel_id = (select auth.uid()) or criado_por = (select auth.uid()));
-- Gestão atribui a qualquer um; os demais criam tarefas para si mesmos.
create policy tarefas_inserir on public.tarefas for insert to authenticated
  with check ((select public.is_ativo()) and ((select public.is_gestor()) or responsavel_id = (select auth.uid())));
create policy tarefas_alterar on public.tarefas for update to authenticated
  using ((select public.is_gestor()) or responsavel_id = (select auth.uid()) or criado_por = (select auth.uid()))
  with check ((select public.is_gestor()) or responsavel_id = (select auth.uid()) or criado_por = (select auth.uid()));
create policy tarefas_excluir on public.tarefas for delete to authenticated
  using ((select public.is_gestor()) or (criado_por = (select auth.uid()) and origem = 'manual'));

create or replace function public.carimbar_conclusao_tarefa()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    new.concluida_em := now();
    new.concluida_por := auth.uid();
  elsif new.status <> 'concluida' then
    new.concluida_em := null;
    new.concluida_por := null;
  end if;
  if tg_op = 'UPDATE' and not public.is_gestor() and new.responsavel_id is distinct from old.responsavel_id
     and new.responsavel_id is distinct from auth.uid() then
    raise exception 'Só a gestão reatribui tarefas para outra pessoa.' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger tarefas_conclusao before insert or update on public.tarefas
  for each row execute function public.carimbar_conclusao_tarefa();

-- -----------------------------------------------------------------------------
-- Checklists: preparação (por carro) e documentação/transferência (por venda)
-- -----------------------------------------------------------------------------
create type public.tipo_checklist as enum ('preparacao', 'documentacao');

create table public.checklist_modelos (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_checklist not null,
  item text not null check (length(trim(item)) >= 2),
  ordem integer not null default 0,
  prazo_dias integer check (prazo_dias >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  unique (tipo, item)
);
select public.preparar_tabela('public.checklist_modelos');
create policy checklist_modelos_ver on public.checklist_modelos for select to authenticated using ((select public.is_ativo()));
create policy checklist_modelos_dono on public.checklist_modelos for all to authenticated
  using ((select public.is_dono())) with check ((select public.is_dono()));

insert into public.checklist_modelos (tipo, item, ordem) values
  ('documentacao', 'CRLV', 10),
  ('documentacao', 'ATPV-e', 20),
  ('documentacao', 'Vistoria', 30),
  ('documentacao', 'Comunicação de venda', 40),
  ('documentacao', 'Pagamento de débitos', 50),
  ('preparacao', 'Lavagem', 10),
  ('preparacao', 'Polimento', 20),
  ('preparacao', 'Revisão mecânica', 30),
  ('preparacao', 'Elétrica', 40),
  ('preparacao', 'Pneus', 50),
  ('preparacao', 'Fotos', 60),
  ('preparacao', 'Documentação', 70);

create table public.checklist_itens (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_checklist not null,
  veiculo_id uuid references public.veiculos (id) on delete cascade,
  venda_id uuid references public.vendas (id) on delete cascade,
  item text not null check (length(trim(item)) >= 2),
  ordem integer not null default 0,
  feito boolean not null default false,
  feito_por uuid references public.usuarios (id) on delete set null,
  feito_em timestamptz,
  prazo date,
  responsavel_id uuid references public.usuarios (id) on delete set null,
  observacao text,
  arquivo_id uuid references public.arquivos (id) on delete set null,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint checklist_alvo check (
    (tipo = 'preparacao' and veiculo_id is not null and venda_id is null)
    or (tipo = 'documentacao' and venda_id is not null)
  ),
  unique nulls not distinct (tipo, veiculo_id, venda_id, item)
);
create index checklist_itens_veiculo_idx on public.checklist_itens (veiculo_id) where veiculo_id is not null;
create index checklist_itens_venda_idx on public.checklist_itens (venda_id) where venda_id is not null;
select public.preparar_tabela('public.checklist_itens');

create policy checklist_itens_ver on public.checklist_itens for select to authenticated
  using (
    (select public.is_gestor())
    or (tipo = 'preparacao' and (select public.is_preparador()))
    or (tipo = 'documentacao' and (select public.is_administrativo()))
    or responsavel_id = (select auth.uid())
  );
create policy checklist_itens_inserir on public.checklist_itens for insert to authenticated
  with check (
    (select public.is_gestor())
    or (tipo = 'preparacao' and (select public.is_preparador()))
    or (tipo = 'documentacao' and (select public.is_administrativo()))
  );
create policy checklist_itens_alterar on public.checklist_itens for update to authenticated
  using (
    (select public.is_gestor())
    or (tipo = 'preparacao' and (select public.is_preparador()))
    or (tipo = 'documentacao' and (select public.is_administrativo()))
    or responsavel_id = (select auth.uid())
  )
  with check (
    (select public.is_gestor())
    or (tipo = 'preparacao' and (select public.is_preparador()))
    or (tipo = 'documentacao' and (select public.is_administrativo()))
    or responsavel_id = (select auth.uid())
  );
create policy checklist_itens_excluir on public.checklist_itens for delete to authenticated
  using ((select public.is_gestor()));

create or replace function public.carimbar_item_checklist()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.feito and (tg_op = 'INSERT' or not old.feito) then
    new.feito_em := now();
    new.feito_por := auth.uid();
  elsif not new.feito then
    new.feito_em := null;
    new.feito_por := null;
  end if;
  return new;
end
$$;
create trigger checklist_itens_carimbo before insert or update on public.checklist_itens
  for each row execute function public.carimbar_item_checklist();

-- Gera o checklist a partir do modelo (não duplica itens já existentes).
create or replace function public.gerar_checklist(p_tipo public.tipo_checklist, p_veiculo uuid, p_venda uuid)
returns void language sql security definer set search_path = ''
as $$
  insert into public.checklist_itens (tipo, veiculo_id, venda_id, item, ordem, prazo)
  select p_tipo, p_veiculo, p_venda, m.item, m.ordem,
         case when m.prazo_dias is not null then public.hoje() + m.prazo_dias end
    from public.checklist_modelos m
   where m.tipo = p_tipo and m.ativo
  on conflict (tipo, veiculo_id, venda_id, item) do nothing
$$;

create or replace function public.checklist_ao_preparar()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'em_preparacao' and (tg_op = 'INSERT' or old.status is distinct from 'em_preparacao') then
    perform public.gerar_checklist('preparacao', new.id, null);
  end if;
  return new;
end
$$;
create trigger veiculos_checklist_preparacao after insert or update of status on public.veiculos
  for each row execute function public.checklist_ao_preparar();

create or replace function public.checklist_ao_fechar_venda()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'fechada' and old.status is distinct from 'fechada' then
    perform public.gerar_checklist('documentacao', new.veiculo_id, new.id);
  end if;
  return new;
end
$$;
create trigger vendas_checklist_documentacao after update of status on public.vendas
  for each row execute function public.checklist_ao_fechar_venda();

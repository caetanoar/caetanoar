-- =============================================================================
-- Caetano Auto CRM — 0018 Venda verificada
-- Antes de ir para aprovação e antes de fechar, o banco confere os alertas do
-- carro (consulta da placa + cadastro), com as mesmas regras do orçamento:
--   vermelho (roubo/furto, restrição, gravame sem baixa, chassi divergente)
--     → bloqueia; só o dono libera, com justificativa escrita;
--   pendente (placa sem consulta ou consulta mais antiga que o prazo)
--     → pede nova consulta (ou liberação do dono);
--   amarelo e os demais → exige registrar que o cliente foi informado e, para
--     fechar, o Termo de Ciência assinado anexado à venda.
-- Nenhum alerta é ocultado do comprador: a ciência cobre todos os alertas
-- (inclusive os liberados pelo dono). A venda pode existir como rascunho.
-- =============================================================================

-- Identidade de um alerta (para conferir se ciência ou liberação cobrem o alerta atual).
create or replace function public.chave_alerta(p_alerta jsonb)
returns text language sql immutable set search_path = ''
as $$ select coalesce(p_alerta ->> 'codigo', '') || '|' || coalesce(p_alerta ->> 'descricao', '') $$;

-- Alertas de "a" que não aparecem em "b" (pela chave).
create or replace function public.alertas_nao_cobertos(a jsonb, b jsonb)
returns jsonb language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_agg(x), '[]')
    from jsonb_array_elements(coalesce(a, '[]')) x
   where not exists (select 1 from jsonb_array_elements(coalesce(b, '[]')) y where public.chave_alerta(y) = public.chave_alerta(x))
$$;

-- -----------------------------------------------------------------------------
-- Liberação de bloqueio: só o dono grava (RLS), com justificativa. Imutável.
-- -----------------------------------------------------------------------------
create table public.liberacoes_bloqueio (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  alertas jsonb not null check (jsonb_typeof(alertas) = 'array' and jsonb_array_length(alertas) > 0),
  justificativa text not null check (length(trim(justificativa)) >= 15),
  liberado_por uuid not null default auth.uid() references public.usuarios (id),
  liberado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index liberacoes_bloqueio_venda_idx on public.liberacoes_bloqueio (venda_id, liberado_em desc);
select public.preparar_tabela('public.liberacoes_bloqueio');
create policy liberacoes_ver on public.liberacoes_bloqueio for select to authenticated using (public.pode_ver_venda(venda_id));
create policy liberacoes_dono_insere on public.liberacoes_bloqueio for insert to authenticated
  with check ((select public.is_dono()) and liberado_por = (select auth.uid()));
revoke update, delete on public.liberacoes_bloqueio from authenticated;

-- -----------------------------------------------------------------------------
-- Ciência do cliente: alertas informados (copiados pelo banco, não pela tela).
-- -----------------------------------------------------------------------------
create table public.vendas_ciencias (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  alertas jsonb not null check (jsonb_typeof(alertas) = 'array' and jsonb_array_length(alertas) > 0),
  declaracao text not null,
  informado_por uuid not null default auth.uid() references public.usuarios (id),
  informado_em timestamptz not null default now(),
  termo_gerado_em timestamptz,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index vendas_ciencias_venda_idx on public.vendas_ciencias (venda_id, informado_em desc);
select public.preparar_tabela('public.vendas_ciencias');
create policy ciencias_ver on public.vendas_ciencias for select to authenticated using (public.pode_ver_venda(venda_id));
revoke insert, update, delete on public.vendas_ciencias from authenticated;

-- -----------------------------------------------------------------------------
-- Registro de cada verificação (ao enviar para aprovação e ao fechar).
-- -----------------------------------------------------------------------------
create table public.verificacoes_veiculo (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  veiculo_id uuid not null references public.veiculos (id) on delete cascade,
  momento text not null check (momento in ('aprovacao', 'fechamento')),
  nivel text not null,
  alertas jsonb not null,
  consulta_id uuid references public.consultas_veiculares (id) on delete set null,
  ciencia_id uuid references public.vendas_ciencias (id) on delete set null,
  liberacao_id uuid references public.liberacoes_bloqueio (id) on delete set null,
  verificado_por uuid default auth.uid() references public.usuarios (id),
  verificado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index verificacoes_veiculo_venda_idx on public.verificacoes_veiculo (venda_id, verificado_em desc);
select public.preparar_tabela('public.verificacoes_veiculo');
create policy verificacoes_ver on public.verificacoes_veiculo for select to authenticated
  using (public.pode_ver_venda(venda_id) or ((select public.is_administrativo()) and public.venda_fechada(venda_id)));
revoke insert, update, delete on public.verificacoes_veiculo from authenticated;

-- -----------------------------------------------------------------------------
-- Situação da verificação de uma venda (para a tela e para as regras).
-- -----------------------------------------------------------------------------
create or replace function public.verificacao_venda(p_venda uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  vd public.vendas;
  v_placa text;
  c public.consultas_veiculares;
  lib public.liberacoes_bloqueio;
  cie public.vendas_ciencias;
  v_alertas jsonb;
  v_informar jsonb;
  v_bloqueios jsonb;
  v_sem_ciencia jsonb;
  v_termo boolean := false;
  v_pend text[] := '{}';
begin
  select * into vd from public.vendas where id = p_venda;
  if vd.id is null or not public.pode_ver_venda(p_venda) then
    return null;
  end if;
  select placa into v_placa from public.veiculos where id = vd.veiculo_id;
  if v_placa is not null then
    select * into c from public.consultas_veiculares where placa = v_placa and status <> 'erro' order by consultado_em desc limit 1;
  end if;
  select * into lib from public.liberacoes_bloqueio where venda_id = p_venda order by liberado_em desc limit 1;
  select * into cie from public.vendas_ciencias where venda_id = p_venda order by informado_em desc limit 1;

  v_alertas := public.alertas_veiculo(vd.veiculo_id);
  select coalesce(jsonb_agg(x), '[]') into v_informar from jsonb_array_elements(v_alertas) x where x ->> 'nivel' <> 'info';
  select coalesce(jsonb_agg(x), '[]') into v_bloqueios
    from jsonb_array_elements(public.alertas_nao_cobertos(v_informar, lib.alertas)) x where x ->> 'nivel' in ('vermelho', 'pendente');
  v_sem_ciencia := public.alertas_nao_cobertos(v_informar, cie.alertas);
  if cie.id is not null then
    select exists (select 1 from public.arquivos a where a.entidade = 'venda' and a.entidade_id = p_venda
                     and a.categoria = 'termo_ciencia' and a.criado_em >= cie.informado_em) into v_termo;
  end if;

  if exists (select 1 from jsonb_array_elements(v_bloqueios) x where x ->> 'nivel' = 'vermelho') then
    v_pend := v_pend || 'Há alerta impeditivo: só o dono pode liberar a venda, com justificativa.'::text;
  end if;
  if exists (select 1 from jsonb_array_elements(v_bloqueios) x where x ->> 'nivel' = 'pendente') then
    v_pend := v_pend || 'Faça uma nova consulta da placa (ou peça a liberação ao dono).'::text;
  end if;
  if jsonb_array_length(v_sem_ciencia) > 0 then
    v_pend := v_pend || 'Registre que o cliente foi informado de todos os alertas.'::text;
  elsif jsonb_array_length(v_informar) > 0 and not v_termo then
    v_pend := v_pend || 'Anexe o Termo de Ciência assinado pelo cliente.'::text;
  end if;

  return jsonb_build_object(
    'nivel', public.nivel_alertas(v_alertas),
    'alertas', v_alertas,
    'bloqueios', v_bloqueios,
    'sem_ciencia', v_sem_ciencia,
    'precisa_ciencia', jsonb_array_length(v_informar) > 0,
    'termo_assinado', v_termo,
    'consulta', case when c.id is null then null else jsonb_build_object(
      'id', c.id, 'consultado_em', c.consultado_em, 'provedor', c.provedor, 'simulado', c.simulado, 'selo', c.selo, 'status', c.status) end,
    'liberacao', case when lib.id is null then null else jsonb_build_object(
      'id', lib.id, 'em', lib.liberado_em, 'justificativa', lib.justificativa, 'alertas', lib.alertas,
      'por', (select u.nome from public.usuarios u where u.id = lib.liberado_por)) end,
    'ciencia', case when cie.id is null then null else jsonb_build_object(
      'id', cie.id, 'em', cie.informado_em, 'declaracao', cie.declaracao, 'alertas', cie.alertas, 'termo_gerado_em', cie.termo_gerado_em,
      'por', (select u.nome from public.usuarios u where u.id = cie.informado_por)) end,
    'pode_aprovar', jsonb_array_length(v_bloqueios) = 0 and jsonb_array_length(v_sem_ciencia) = 0,
    'pode_fechar', jsonb_array_length(v_bloqueios) = 0 and jsonb_array_length(v_sem_ciencia) = 0 and (jsonb_array_length(v_informar) = 0 or v_termo),
    'pendencias', to_jsonb(v_pend)
  );
end
$$;
grant execute on function public.verificacao_venda(uuid) to authenticated;

-- Grava o registro da verificação (uso interno das regras).
create or replace function public.registrar_verificacao(p_venda uuid, p_momento text, p_verif jsonb)
returns void language sql security definer set search_path = ''
as $$
  insert into public.verificacoes_veiculo (venda_id, veiculo_id, momento, nivel, alertas, consulta_id, ciencia_id, liberacao_id)
  select vd.id, vd.veiculo_id, p_momento, p_verif ->> 'nivel', p_verif -> 'alertas',
         nullif(p_verif #>> '{consulta,id}', '')::uuid, nullif(p_verif #>> '{ciencia,id}', '')::uuid, nullif(p_verif #>> '{liberacao,id}', '')::uuid
    from public.vendas vd where vd.id = p_venda
$$;
revoke execute on function public.registrar_verificacao(uuid, text, jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Regras na própria tabela de vendas (valem para tela, API e conversão do orçamento)
-- -----------------------------------------------------------------------------
create or replace function public.verificar_venda()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r jsonb;
begin
  -- Venda nova (ou carro trocado): com qualquer alerta a informar, nasce/volta como rascunho.
  if new.status = 'aguardando_aprovacao' and (tg_op = 'INSERT' or new.veiculo_id <> old.veiculo_id) then
    if exists (select 1 from jsonb_array_elements(public.alertas_veiculo(new.veiculo_id)) x where x ->> 'nivel' <> 'info') then
      new.status := 'rascunho';
    end if;
    return new;
  end if;
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;
  -- Rascunho → aguardando aprovação: sem bloqueio e com a ciência registrada.
  if new.status = 'aguardando_aprovacao' then
    r := public.verificacao_venda(new.id);
    if r is null or not (r ->> 'pode_aprovar')::boolean then
      raise exception 'Verificação do veículo: %', coalesce((select string_agg(p, ' ') from jsonb_array_elements_text(r -> 'pendencias') p), 'pendente.')
        using errcode = 'P0001';
    end if;
    perform public.registrar_verificacao(new.id, 'aprovacao', r);
  -- Fechamento: confere de novo (a consulta pode ter vencido) e exige o termo assinado.
  elsif new.status = 'fechada' then
    r := public.verificacao_venda(new.id);
    if r is null or not (r ->> 'pode_fechar')::boolean then
      raise exception 'Verificação do veículo: %', coalesce((select string_agg(p, ' ') from jsonb_array_elements_text(r -> 'pendencias') p), 'pendente.')
        using errcode = 'P0001';
    end if;
    perform public.registrar_verificacao(new.id, 'fechamento', r);
  end if;
  return new;
end
$$;
create trigger verificar_venda before insert or update of status, veiculo_id on public.vendas
  for each row execute function public.verificar_venda();

-- Impeditivo numa venda: tarefa para o dono analisar (some quando liberar ou a venda sair).
create or replace function public.tarefa_bloqueio_venda()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_dono uuid;
  v_chave text := 'venda:' || new.id || ':bloqueio';
begin
  if new.status = 'rascunho'
     and exists (select 1 from jsonb_array_elements(public.alertas_veiculo(new.veiculo_id)) x where x ->> 'nivel' = 'vermelho')
     and not exists (select 1 from public.liberacoes_bloqueio l where l.venda_id = new.id) then
    select id into v_dono from public.usuarios where papel = 'dono' and ativo order by criado_em limit 1;
    insert into public.tarefas (titulo, descricao, entidade, entidade_id, responsavel_id, prazo, origem, chave_automatica)
    values ('Analisar impeditivo da venda ' || new.numero,
            'O carro tem alerta impeditivo. A venda só segue se o dono liberar, com justificativa.',
            'venda', new.id, v_dono, public.hoje(), 'automatica', v_chave)
    on conflict (chave_automatica) do update set status = 'pendente', prazo = excluded.prazo;
  elsif new.status in ('fechada', 'cancelada') then
    update public.tarefas set status = 'cancelada' where chave_automatica = v_chave and status in ('pendente', 'em_andamento');
  end if;
  return new;
end
$$;
create trigger vendas_tarefa_bloqueio after insert or update of status on public.vendas
  for each row execute function public.tarefa_bloqueio_venda();

-- -----------------------------------------------------------------------------
-- Ações
-- -----------------------------------------------------------------------------
-- Vendedor (ou gestão) registra que informou o cliente. Os alertas vêm do banco.
create or replace function public.registrar_ciencia(p_venda uuid, p_declaracao text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  vd public.vendas;
  v_alertas jsonb;
  v_id uuid;
begin
  select * into vd from public.vendas where id = p_venda for update;
  if vd.id is null or not (public.is_gestor() or (vd.vendedor_id = auth.uid() and public.is_ativo())) then
    raise exception 'Venda não encontrada.' using errcode = '42501';
  end if;
  if vd.status not in ('rascunho', 'aguardando_aprovacao') then
    raise exception 'Venda fechada ou cancelada.' using errcode = 'P0001';
  end if;
  select jsonb_agg(x) into v_alertas from jsonb_array_elements(public.alertas_veiculo(vd.veiculo_id)) x where x ->> 'nivel' <> 'info';
  if v_alertas is null then
    raise exception 'Este carro não tem alertas a informar.' using errcode = 'P0001';
  end if;
  insert into public.vendas_ciencias (venda_id, alertas, declaracao)
  values (p_venda, v_alertas, coalesce(nullif(trim(p_declaracao), ''),
    'O cliente foi informado, antes da compra, de todos os alertas listados, encontrados na consulta da placa e no cadastro do veículo, e recebeu a recomendação de laudo cautelar independente.'))
  returning id into v_id;
  return v_id;
end
$$;
grant execute on function public.registrar_ciencia(uuid, text) to authenticated;

-- Marca quando o Termo de Ciência foi gerado (o PDF sai da tela).
create or replace function public.marcar_termo_gerado(p_ciencia uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.vendas_ciencias set termo_gerado_em = coalesce(termo_gerado_em, now())
   where id = p_ciencia and public.pode_ver_venda(venda_id)
$$;
grant execute on function public.marcar_termo_gerado(uuid) to authenticated;

-- Dono libera o bloqueio (impeditivo ou consulta pendente). SECURITY INVOKER: a RLS exige o dono.
create or replace function public.liberar_bloqueio(p_venda uuid, p_justificativa text)
returns uuid language plpgsql set search_path = ''
as $$
declare
  r jsonb;
  v_id uuid;
  vd public.vendas;
begin
  if not public.is_dono() then
    raise exception 'Somente o dono libera venda com impeditivo.' using errcode = '42501';
  end if;
  select * into vd from public.vendas where id = p_venda;
  if vd.id is null or vd.status not in ('rascunho', 'aguardando_aprovacao') then
    raise exception 'Venda não encontrada ou já encerrada.' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_justificativa, ''))) < 15 then
    raise exception 'Escreva a justificativa da liberação (pelo menos 15 caracteres).' using errcode = 'P0001';
  end if;
  r := public.verificacao_venda(p_venda);
  if jsonb_array_length(r -> 'bloqueios') = 0 then
    raise exception 'Esta venda não tem bloqueio a liberar.' using errcode = 'P0001';
  end if;
  insert into public.liberacoes_bloqueio (venda_id, alertas, justificativa)
  values (p_venda, (select jsonb_agg(x) from jsonb_array_elements(r -> 'alertas') x where x ->> 'nivel' in ('vermelho', 'pendente')), trim(p_justificativa))
  returning id into v_id;
  update public.tarefas set status = 'concluida', concluida_por = auth.uid(), concluida_em = now()
   where chave_automatica = 'venda:' || p_venda || ':bloqueio' and status in ('pendente', 'em_andamento');
  perform public.registrar_evento('venda.bloqueio_liberado', jsonb_build_object('venda_id', vd.id, 'numero', vd.numero, 'liberacao_id', v_id));
  return v_id;
end
$$;
grant execute on function public.liberar_bloqueio(uuid, text) to authenticated;

-- Rascunho → aguardando aprovação do gerente (as regras do gatilho se aplicam).
create or replace function public.enviar_venda_para_aprovacao(p_venda uuid)
returns void language plpgsql set search_path = ''
as $$
begin
  update public.vendas set status = 'aguardando_aprovacao' where id = p_venda and status = 'rascunho';
  if not found then
    raise exception 'Só venda em rascunho vai para aprovação.' using errcode = 'P0001';
  end if;
end
$$;
grant execute on function public.enviar_venda_para_aprovacao(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Eventos novos para webhooks: orçamento aceito e bloqueio liberado
-- -----------------------------------------------------------------------------
alter table public.webhooks drop constraint if exists webhooks_eventos_check;
alter table public.webhooks add constraint webhooks_eventos_check check (cardinality(eventos) > 0 and eventos <@ array[
  'venda.fechada', 'venda.cancelada', 'venda.bloqueio_liberado', 'veiculo.criado', 'veiculo.status_alterado', 'veiculo.preco_alterado',
  'cliente.criado', 'nota.autorizada', 'orcamento.aceito']);

create or replace function public.evento_orcamento_aceito()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'aceito' and old.status is distinct from 'aceito' then
    perform public.registrar_evento('orcamento.aceito', jsonb_build_object(
      'orcamento_id', new.id, 'numero', new.numero, 'veiculo_id', new.veiculo_id, 'valor_final', new.valor_final));
  end if;
  return new;
end
$$;
create trigger orcamentos_evento_aceito after update of status on public.orcamentos
  for each row execute function public.evento_orcamento_aceito();

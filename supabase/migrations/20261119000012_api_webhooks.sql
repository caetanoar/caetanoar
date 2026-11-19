-- =============================================================================
-- Caetano Auto CRM — 0012 API REST (chaves) e webhooks
-- Chaves: só o hash (HMAC com pepper do servidor) fica no banco; a chave aparece
-- uma única vez ao ser criada. Webhooks: o segredo de assinatura não é legível
-- pela interface depois de criado. Tudo isso é exclusivo do dono.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Chaves de API
-- -----------------------------------------------------------------------------
create table public.api_chaves (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) >= 2),
  prefixo text not null,
  hash text not null unique,
  escopos text[] not null check (cardinality(escopos) > 0 and escopos <@ array['estoque:ler', 'leads:criar', 'vendas:ler']),
  ultimo_uso_em timestamptz,
  expira_em date,
  revogada_em timestamptz,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
select public.preparar_tabela('public.api_chaves', 'id', 'hash');
create policy api_chaves_dono on public.api_chaves for all to authenticated
  using ((select public.is_dono())) with check ((select public.is_dono()));
-- O hash nunca volta para a interface.
revoke select on public.api_chaves from authenticated;
grant select (id, nome, prefixo, escopos, ultimo_uso_em, expira_em, revogada_em, criado_em, criado_por, atualizado_em, atualizado_por)
  on public.api_chaves to authenticated;

-- -----------------------------------------------------------------------------
-- Webhooks
-- -----------------------------------------------------------------------------
create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) >= 2),
  url text not null check (url ~ '^https://' or url ~ '^http://(localhost|127\.0\.0\.1)(:\d+)?(/|$)'),
  eventos text[] not null check (cardinality(eventos) > 0 and eventos <@ array[
    'venda.fechada', 'venda.cancelada', 'veiculo.criado', 'veiculo.status_alterado', 'veiculo.preco_alterado',
    'cliente.criado', 'nota.autorizada']),
  segredo text not null,
  ativo boolean not null default true,
  falhas_consecutivas integer not null default 0,
  ultimo_envio_em timestamptz,
  ultimo_status integer,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
select public.preparar_tabela('public.webhooks', 'id', 'segredo');
create policy webhooks_dono on public.webhooks for all to authenticated
  using ((select public.is_dono())) with check ((select public.is_dono()));
revoke select on public.webhooks from authenticated;
grant select (id, nome, url, eventos, ativo, falhas_consecutivas, ultimo_envio_em, ultimo_status, criado_em, criado_por, atualizado_em, atualizado_por)
  on public.webhooks to authenticated;

create type public.status_entrega as enum ('pendente', 'entregue', 'falhou', 'desistiu');

create table public.webhook_entregas (
  id bigint generated always as identity primary key,
  webhook_id uuid not null references public.webhooks (id) on delete cascade,
  evento_id bigint not null references public.eventos_saida (id) on delete cascade,
  evento_tipo text not null,
  status public.status_entrega not null default 'pendente',
  tentativas integer not null default 0,
  proxima_tentativa_em timestamptz not null default now(),
  ultimo_status_http integer,
  ultimo_erro text,
  entregue_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (webhook_id, evento_id)
);
create index webhook_entregas_fila_idx on public.webhook_entregas (proxima_tentativa_em) where status in ('pendente', 'falhou');
alter table public.webhook_entregas enable row level security;
revoke all on public.webhook_entregas from anon, authenticated;
grant select on public.webhook_entregas to authenticated;
create policy entregas_dono on public.webhook_entregas for select to authenticated using ((select public.is_dono()));

-- Cada evento novo vira uma entrega para cada webhook ativo inscrito nele.
create or replace function public.distribuir_evento()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.tipo = 'webhook.teste' then
    insert into public.webhook_entregas (webhook_id, evento_id, evento_tipo)
    select w.id, new.id, new.tipo from public.webhooks w where w.id = (new.payload ->> 'webhook_id')::uuid;
  else
    insert into public.webhook_entregas (webhook_id, evento_id, evento_tipo)
    select w.id, new.id, new.tipo from public.webhooks w where w.ativo and new.tipo = any (w.eventos);
  end if;
  return new;
end
$$;
create trigger eventos_saida_distribuir after insert on public.eventos_saida
  for each row execute function public.distribuir_evento();

-- Reserva um lote de entregas vencidas (vários processos em paralelo não pegam a mesma).
create or replace function public.webhooks_reservar(p_limite integer default 20)
returns table (entrega_id bigint, tentativas integer, webhook_id uuid, url text, segredo text, evento_id bigint, tipo text, payload jsonb, evento_em timestamptz)
language sql security definer set search_path = ''
as $$
  with lote as (
    select e.id from public.webhook_entregas e
     where e.status in ('pendente', 'falhou') and e.proxima_tentativa_em <= now()
     order by e.proxima_tentativa_em
     limit greatest(1, least(p_limite, 100))
     for update skip locked
  ), reservadas as (
    update public.webhook_entregas e
       set proxima_tentativa_em = now() + interval '2 minutes'
      from lote where e.id = lote.id
    returning e.id, e.tentativas, e.webhook_id, e.evento_id
  )
  select r.id, r.tentativas, w.id, w.url, w.segredo, ev.id, ev.tipo, ev.payload, ev.criado_em
    from reservadas r
    join public.webhooks w on w.id = r.webhook_id
    join public.eventos_saida ev on ev.id = r.evento_id
$$;
revoke all on function public.webhooks_reservar(integer) from public, anon, authenticated;
grant execute on function public.webhooks_reservar(integer) to service_role;

-- Resultado de uma tentativa; reenvio com espera crescente, desiste após 8 tentativas.
create or replace function public.webhooks_registrar(p_entrega bigint, p_ok boolean, p_status integer, p_erro text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  e public.webhook_entregas;
  v_espera interval[] := array['1 minute', '5 minutes', '30 minutes', '2 hours', '6 hours', '12 hours', '24 hours']::interval[];
begin
  select * into e from public.webhook_entregas where id = p_entrega for update;
  if e.id is null then return; end if;
  if p_ok then
    update public.webhook_entregas
       set status = 'entregue', tentativas = e.tentativas + 1, ultimo_status_http = p_status, ultimo_erro = null, entregue_em = now()
     where id = p_entrega;
    update public.webhooks set falhas_consecutivas = 0, ultimo_envio_em = now(), ultimo_status = p_status where id = e.webhook_id;
  else
    update public.webhook_entregas
       set status = case when e.tentativas + 1 >= 8 then 'desistiu'::public.status_entrega else 'falhou'::public.status_entrega end,
           tentativas = e.tentativas + 1,
           ultimo_status_http = p_status,
           ultimo_erro = left(p_erro, 500),
           proxima_tentativa_em = now() + v_espera[least(e.tentativas + 1, array_length(v_espera, 1))]
     where id = p_entrega;
    update public.webhooks set falhas_consecutivas = falhas_consecutivas + 1, ultimo_envio_em = now(), ultimo_status = p_status where id = e.webhook_id;
  end if;
end
$$;
revoke all on function public.webhooks_registrar(bigint, boolean, integer, text) from public, anon, authenticated;
grant execute on function public.webhooks_registrar(bigint, boolean, integer, text) to service_role;

-- Dono: reenviar uma entrega manualmente.
create or replace function public.reenviar_entrega(p_entrega bigint)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_dono() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  update public.webhook_entregas set status = 'pendente', proxima_tentativa_em = now() where id = p_entrega;
end
$$;
grant execute on function public.reenviar_entrega(bigint) to authenticated;

-- Dono: dispara um evento de teste para um webhook.
create or replace function public.testar_webhook(p_webhook uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_dono() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  perform public.registrar_evento('webhook.teste', jsonb_build_object('webhook_id', p_webhook, 'mensagem', 'Teste de webhook da Caetano Auto'));
end
$$;
grant execute on function public.testar_webhook(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Novos eventos (só dados públicos: nada de custo, mínimo, lucro ou CPF)
-- -----------------------------------------------------------------------------
create or replace function public.eventos_veiculo()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.registrar_evento('veiculo.criado', jsonb_build_object(
      'veiculo_id', new.id, 'tipo', new.tipo, 'marca', new.marca, 'modelo', new.modelo, 'versao', new.versao,
      'ano_modelo', new.ano_modelo, 'status', new.status, 'preco_anunciado', new.preco_anunciado));
  else
    if new.status is distinct from old.status then
      perform public.registrar_evento('veiculo.status_alterado', jsonb_build_object(
        'veiculo_id', new.id, 'de', old.status, 'para', new.status, 'marca', new.marca, 'modelo', new.modelo));
    end if;
    if new.preco_anunciado is distinct from old.preco_anunciado then
      perform public.registrar_evento('veiculo.preco_alterado', jsonb_build_object(
        'veiculo_id', new.id, 'de', old.preco_anunciado, 'para', new.preco_anunciado, 'marca', new.marca, 'modelo', new.modelo));
    end if;
  end if;
  return new;
end
$$;
create trigger veiculos_eventos after insert or update of status, preco_anunciado on public.veiculos
  for each row execute function public.eventos_veiculo();

create or replace function public.eventos_cliente()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.registrar_evento('cliente.criado', jsonb_build_object(
    'cliente_id', new.id, 'nome', split_part(new.nome, ' ', 1), 'origem', new.origem, 'vendedor_id', new.vendedor_id));
  return new;
end
$$;
create trigger clientes_eventos after insert on public.clientes
  for each row execute function public.eventos_cliente();

create or replace function public.eventos_nota()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'autorizada' and (tg_op = 'INSERT' or old.status is distinct from 'autorizada') then
    perform public.registrar_evento('nota.autorizada', jsonb_build_object(
      'nota_id', new.id, 'direcao', new.direcao, 'numero', new.numero, 'serie', new.serie,
      'chave_acesso', new.chave_acesso, 'valor_total', new.valor_total, 'venda_id', new.venda_id));
  end if;
  return new;
end
$$;
create trigger notas_eventos after insert or update of status on public.notas_fiscais
  for each row execute function public.eventos_nota();

-- -----------------------------------------------------------------------------
-- Lead pela API (site, landing page, formulário): cria o cliente ou, se o
-- telefone já existir, registra o novo contato no cliente existente.
-- Só o servidor (chave de serviço) chama; a auditoria registra "API: <chave>".
-- -----------------------------------------------------------------------------
create or replace function public.api_registrar_lead(p_chave text, p_dados jsonb)
returns jsonb language plpgsql set search_path = ''
as $$
declare
  v_tel text := regexp_replace(coalesce(p_dados ->> 'telefone', ''), '\D', '', 'g');
  v_nome text := left(trim(coalesce(p_dados ->> 'nome', '')), 120);
  v_msg text := left(trim(coalesce(p_dados ->> 'mensagem', '')), 1000);
  v_origem public.origem_lead := coalesce(nullif(p_dados ->> 'origem', '')::public.origem_lead, 'site');
  v_veiculo uuid := nullif(p_dados ->> 'veiculo_id', '')::uuid;
  v_cliente uuid;
  v_novo boolean := false;
begin
  perform set_config('app.ator', 'API: ' || p_chave, true);
  if v_tel like '55%' and length(v_tel) in (12, 13) then v_tel := substr(v_tel, 3); end if;
  if length(v_nome) < 2 then raise exception 'Informe o nome.' using errcode = '22023'; end if;
  if v_tel !~ '^\d{10,11}$' then raise exception 'Telefone inválido.' using errcode = '22023'; end if;
  if v_veiculo is not null and not exists (select 1 from public.veiculos where id = v_veiculo) then v_veiculo := null; end if;

  select c.id into v_cliente from public.clientes c
   where v_tel in (c.telefone, c.whatsapp) and c.anonimizado_em is null
   order by c.criado_em limit 1;

  if v_cliente is null then
    insert into public.clientes (nome, telefone, whatsapp, email, origem)
    values (v_nome, v_tel, v_tel, nullif(left(trim(coalesce(p_dados ->> 'email', '')), 200), ''), v_origem)
    returning id into v_cliente;
    v_novo := true;
  end if;

  if v_veiculo is not null and not exists (
    select 1 from public.clientes_interesses i where i.cliente_id = v_cliente and i.veiculo_id = v_veiculo and i.ativo) then
    insert into public.clientes_interesses (cliente_id, veiculo_id) values (v_cliente, v_veiculo);
  end if;

  insert into public.clientes_contatos (cliente_id, canal, resumo)
  values (v_cliente, 'outro', 'Contato recebido pela API (' || p_chave || ')' || case when v_msg <> '' then ': ' || v_msg else '' end);

  return jsonb_build_object('cliente_id', v_cliente, 'novo', v_novo);
end
$$;
revoke all on function public.api_registrar_lead(text, jsonb) from public, anon, authenticated;
grant execute on function public.api_registrar_lead(text, jsonb) to service_role;

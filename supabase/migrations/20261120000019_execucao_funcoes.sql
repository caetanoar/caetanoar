-- =============================================================================
-- Caetano Auto CRM — 0019 Quem pode executar funções do banco
-- O Postgres libera EXECUTE de toda função nova para todos. Aqui:
--   1) quem não está logado não executa nenhuma função do schema public, exceto
--      a do link público do orçamento (orcamento_publico);
--   2) funções internas (gatilhos, registro de eventos de webhook, geração de
--      checklist) não podem ser chamadas diretamente por usuários logados.
-- As demais funções continuam conferindo o perfil por dentro, como antes.
-- =============================================================================

-- O evento "bloqueio liberado" passa a sair por gatilho, para que a função que
-- registra eventos de webhook não precise ficar aberta a usuários.
create or replace function public.evento_bloqueio_liberado()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.registrar_evento('venda.bloqueio_liberado', jsonb_build_object(
    'venda_id', new.venda_id, 'numero', (select v.numero from public.vendas v where v.id = new.venda_id), 'liberacao_id', new.id));
  return new;
end
$$;
create trigger liberacoes_evento after insert on public.liberacoes_bloqueio
  for each row execute function public.evento_bloqueio_liberado();

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
  return v_id;
end
$$;

-- 1) Sem login: nenhuma função, exceto o link público do orçamento.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.orcamento_publico(text) to anon;
-- Funções futuras do schema public não ganham mais o acesso explícito do Supabase ao anônimo.
-- (O padrão do Postgres para PUBLIC não é alterado globalmente: isso afetaria funções de outros
-- schemas. O teste 0099_rls_global falha se alguma função nova ficar executável sem login.)
alter default privileges in schema public revoke execute on functions from anon;

-- 2) Funções internas: só o próprio banco as usa (gatilhos e funções protegidas).
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and (p.prorettype = 'trigger'::regtype
            or p.proname in ('registrar_evento', 'gerar_checklist', 'registrar_verificacao', 'cancelar_lembretes_orcamento'))
  loop
    execute format('revoke execute on function %s from authenticated', f.assinatura);
  end loop;
end
$$;

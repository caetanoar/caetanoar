-- =============================================================================
-- Seed de DESENVOLVIMENTO LOCAL (não roda em produção).
-- Cria usuários de teste para cada perfil. Senha de todos: caetano123
-- Os dados reais da loja (carros consignados, categorias) ficam nas migrations.
-- =============================================================================

create or replace function pg_temp.criar_usuario_dev(p_id uuid, p_email text, p_nome text, p_papel text)
returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('caetano123', extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'papel', p_papel),
    jsonb_build_object('nome', p_nome), now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, 'email',
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          now(), now(), now());
end $$;

select pg_temp.criar_usuario_dev('a0000000-0000-4000-8000-000000000001', 'arthur@caetanoauto.local', 'Arthur', 'dono');
select pg_temp.criar_usuario_dev('a0000000-0000-4000-8000-000000000002', 'gerente@caetanoauto.local', 'Gerente Teste', 'gerente');
select pg_temp.criar_usuario_dev('a0000000-0000-4000-8000-000000000003', 'vendedor1@caetanoauto.local', 'Vendedor Um', 'vendedor');
select pg_temp.criar_usuario_dev('a0000000-0000-4000-8000-000000000004', 'vendedor2@caetanoauto.local', 'Vendedor Dois', 'vendedor');
select pg_temp.criar_usuario_dev('a0000000-0000-4000-8000-000000000005', 'atendimento@caetanoauto.local', 'Atendimento Teste', 'atendimento');
select pg_temp.criar_usuario_dev('a0000000-0000-4000-8000-000000000006', 'preparador@caetanoauto.local', 'Preparador Teste', 'preparador');
select pg_temp.criar_usuario_dev('a0000000-0000-4000-8000-000000000007', 'administrativo@caetanoauto.local', 'Administrativo Teste', 'administrativo');

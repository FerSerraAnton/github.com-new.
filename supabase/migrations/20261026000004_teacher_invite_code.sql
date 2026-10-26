-- Código de invitación de un solo uso para el alta de profesores
-- (evita que alguien que conozca el correo autorizado cree la cuenta antes).
alter table public.teacher_allowlist
  add column if not exists invite_code text not null default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  add column if not exists used_at timestamptz;

drop function if exists public.register_teacher(text, text);

create or replace function public.register_teacher(p_email text, p_password text, p_code text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_uid uuid := gen_random_uuid();
begin
  perform pg_sleep(0.3); -- frena los intentos por fuerza bruta
  if not exists (
    select 1 from public.teacher_allowlist
    where email = v_email and used_at is null and invite_code = upper(btrim(coalesce(p_code, '')))
  ) then
    raise exception 'TEACHER_NOT_ALLOWED';
  end if;
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'WEAK_PASSWORD';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'TEACHER_EXISTS';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_uid, v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );
  insert into public.teachers (user_id, name) values (v_uid, split_part(v_email, '@', 1));
  update public.teacher_allowlist set used_at = now() where email = v_email;
end $$;

revoke all on function public.register_teacher(text, text, text) from public;
grant execute on function public.register_teacher(text, text, text) to anon, authenticated;

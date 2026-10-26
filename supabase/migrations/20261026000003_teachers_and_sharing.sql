-- =====================================================================
-- UAX Journey Lab · Alta de profesores y enlace de solo lectura sin service role
-- =====================================================================

-- Correos autorizados como profesor. Sin políticas RLS: invisible para los clientes.
create table if not exists public.teacher_allowlist (
  email text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);
alter table public.teacher_allowlist enable row level security;

-- ---------- RPC: crear la cuenta de un profesor autorizado ----------
-- Crea el usuario de Supabase Auth ya confirmado (sin depender del envío de correos)
-- y su fila en teachers. Solo funciona para correos de la lista y si aún no existen.
create or replace function public.register_teacher(p_email text, p_password text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_uid uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.teacher_allowlist where email = v_email) then
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
end $$;

-- ---------- RPC: un usuario autorizado reclama su perfil de profesor ----------
-- (por si la cuenta existía antes de añadir su correo a la lista)
create or replace function public.claim_teacher()
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text;
  v_id uuid;
begin
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null or not exists (select 1 from public.teacher_allowlist where email = v_email) then
    return null;
  end if;
  insert into public.teachers (user_id, name) values (auth.uid(), split_part(v_email, '@', 1))
    on conflict (user_id) do nothing;
  select id into v_id from public.teachers where user_id = auth.uid();
  return v_id;
end $$;

-- ---------- RPC pública: sesión compartida en solo lectura ----------
-- Solo si el profesor activó share_enabled. Sin token, teacher_id, user_id ni alias reales.
create or replace function public.get_shared_session(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s public.classroom_sessions;
begin
  select * into s from public.classroom_sessions where share_token = p_token and share_enabled;
  if s.id is null then return null; end if;
  return jsonb_build_object(
    'session', to_jsonb(s) - 'share_token' - 'teacher_id',
    'teams', coalesce((select jsonb_agg(to_jsonb(t) order by t.position) from public.teams t where t.session_id = s.id), '[]'),
    'activities', coalesce((select jsonb_agg(to_jsonb(a) order by a.position) from public.activities a where a.session_id = s.id), '[]'),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'session_id', p.session_id, 'team_id', p.team_id, 'user_id', null, 'is_demo', p.is_demo,
        'joined_at', p.joined_at, 'alias', 'Participante ' || row_number
      ) order by row_number)
      from (select *, row_number() over (order by joined_at) from public.participants where session_id = s.id) p
    ), '[]'),
    'work', jsonb_build_object(
      'states', coalesce((select jsonb_agg(to_jsonb(x)) from public.team_activity_states x where x.session_id = s.id), '[]'),
      'contributions', coalesce((select jsonb_agg(to_jsonb(x)) from public.contributions x where x.session_id = s.id), '[]'),
      'touchpoints', coalesce((select jsonb_agg(to_jsonb(x)) from public.touchpoints x where x.session_id = s.id), '[]'),
      'emotionVotes', coalesce((select jsonb_agg(to_jsonb(x)) from public.emotion_votes x where x.session_id = s.id), '[]'),
      'emotionSelections', coalesce((select jsonb_agg(to_jsonb(x)) from public.team_emotion_selections x where x.session_id = s.id), '[]'),
      'frictions', coalesce((select jsonb_agg(to_jsonb(x)) from public.frictions x where x.session_id = s.id), '[]'),
      'improvements', coalesce((select jsonb_agg(to_jsonb(x)) from public.improvements x where x.session_id = s.id), '[]'),
      'improvementVotes', coalesce((select jsonb_agg(to_jsonb(x)) from public.improvement_votes x where x.session_id = s.id), '[]'),
      'kpis', coalesce((select jsonb_agg(to_jsonb(x)) from public.kpis x where x.session_id = s.id), '[]'),
      'summaries', coalesce((select jsonb_agg(to_jsonb(x)) from public.team_journey_summaries x where x.session_id = s.id), '[]')
    )
  );
end $$;

revoke all on function public.register_teacher(text, text) from public;
grant execute on function public.register_teacher(text, text) to anon, authenticated;
revoke all on function public.claim_teacher() from public, anon;
grant execute on function public.claim_teacher() to authenticated;
revoke all on function public.get_shared_session(text) from public;
grant execute on function public.get_shared_session(text) to anon, authenticated;

-- Funciones internas: no deben exponerse por la API a anónimos.
revoke all on function public.generate_session_code() from public, anon, authenticated;
revoke execute on function public.current_teacher_id(), public.is_session_owner(uuid), public.is_session_member(uuid),
  public.is_team_member(uuid), public.owns_participant(uuid, uuid), public.can_view_team(uuid),
  public.activity_open(uuid), public.team_session_live(uuid) from public, anon;
grant execute on function public.current_teacher_id(), public.is_session_owner(uuid), public.is_session_member(uuid),
  public.is_team_member(uuid), public.owns_participant(uuid, uuid), public.can_view_team(uuid),
  public.activity_open(uuid), public.team_session_live(uuid) to authenticated;
revoke execute on function public.tg_session_from_team(), public.tg_activity_same_session(), public.tg_vote_team(),
  public.tg_touch_updated_at() from public, anon, authenticated;

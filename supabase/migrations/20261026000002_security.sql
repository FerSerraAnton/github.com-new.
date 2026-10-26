-- =====================================================================
-- UAX Journey Lab · Funciones auxiliares, triggers, RPC y Row Level Security
-- Principios:
--   * El código público de la sesión SOLO permite consultar datos básicos y unirse.
--   * Los alumnos (usuarios anónimos de Supabase Auth) solo leen y escriben su equipo.
--   * El profesor (fila en teachers) solo gestiona sus propias sesiones.
-- =====================================================================

-- ---------- Funciones de autorización (security definer, sin recursión RLS) ----------
create or replace function public.current_teacher_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.teachers where user_id = auth.uid()
$$;

create or replace function public.is_session_owner(p_session_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classroom_sessions s
    join public.teachers t on t.id = s.teacher_id
    where s.id = p_session_id and t.user_id = auth.uid()
  )
$$;

create or replace function public.is_session_member(p_session_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.participants p
    where p.session_id = p_session_id and p.user_id = auth.uid()
  )
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.participants p
    where p.team_id = p_team_id and p.user_id = auth.uid()
  )
$$;

-- El participante pertenece al usuario actual y está en ese equipo.
create or replace function public.owns_participant(p_participant_id uuid, p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.participants p
    where p.id = p_participant_id and p.team_id = p_team_id and p.user_id = auth.uid()
  )
$$;

-- Puede ver los datos de un equipo: el profesor de la sesión, sus miembros,
-- o cualquier miembro de la sesión si el profesor activó la comparación.
create or replace function public.can_view_team(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams t
    join public.classroom_sessions s on s.id = t.session_id
    where t.id = p_team_id and (
      public.is_session_owner(s.id)
      or public.is_team_member(t.id)
      or (s.comparison_enabled and public.is_session_member(s.id))
    )
  )
$$;

-- La actividad admite escritura de alumnos: actividad activa y sesión en curso.
create or replace function public.activity_open(p_activity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.activities a
    join public.classroom_sessions s on s.id = a.session_id
    where a.id = p_activity_id and a.status = 'active' and s.status = 'live'
  )
$$;

create or replace function public.team_session_live(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams t
    join public.classroom_sessions s on s.id = t.session_id
    where t.id = p_team_id and s.status = 'live'
  )
$$;

-- ---------- Triggers de coherencia ----------
-- session_id siempre se deriva del equipo (no se puede falsear desde el cliente).
create or replace function public.tg_session_from_team()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select session_id into new.session_id from public.teams where id = new.team_id;
  if new.session_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;
  return new;
end $$;

-- La actividad debe pertenecer a la misma sesión que el equipo.
create or replace function public.tg_activity_same_session()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.activities where id = new.activity_id and session_id = new.session_id) then
    raise exception 'ACTIVITY_SESSION_MISMATCH';
  end if;
  return new;
end $$;

create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Un voto solo puede referirse a una mejora del mismo equipo.
create or replace function public.tg_vote_team()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select team_id, session_id into new.team_id, new.session_id from public.improvements where id = new.improvement_id;
  if new.team_id is null then raise exception 'IMPROVEMENT_NOT_FOUND'; end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['team_activity_states','contributions','touchpoints','emotion_votes',
                           'team_emotion_selections','frictions','improvements','kpis','team_journey_summaries']
  loop
    execute format('drop trigger if exists a_session_from_team on public.%I', t);
    execute format('create trigger a_session_from_team before insert or update of team_id on public.%I
                    for each row execute function public.tg_session_from_team()', t);
  end loop;
  foreach t in array array['team_activity_states','contributions','touchpoints','emotion_votes','frictions','improvements','kpis']
  loop
    execute format('drop trigger if exists b_activity_same_session on public.%I', t);
    execute format('create trigger b_activity_same_session before insert or update of activity_id, team_id on public.%I
                    for each row execute function public.tg_activity_same_session()', t);
  end loop;
  foreach t in array array['classroom_sessions','contributions','emotion_votes']
  loop
    execute format('drop trigger if exists c_touch_updated_at on public.%I', t);
    execute format('create trigger c_touch_updated_at before update on public.%I
                    for each row execute function public.tg_touch_updated_at()', t);
  end loop;
end $$;

drop trigger if exists a_vote_team on public.improvement_votes;
create trigger a_vote_team before insert or update on public.improvement_votes
  for each row execute function public.tg_vote_team();

-- ---------- Código de sesión ----------
create or replace function public.generate_session_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classroom_sessions where code = candidate);
  end loop;
  return candidate;
end $$;

-- ---------- RPC: crear sesión completa (solo profesor) ----------
-- p: { title, subtitle?, company, scenario, instructions?, max_per_team, is_demo?,
--      teams: [{name, color}], activities: [{position,key,kind,phase_key,title,objective,
--      instructions,question,example,recommended_minutes,slide_number,config}] }
create or replace function public.create_session(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := public.current_teacher_id();
  v_session uuid;
  v_team jsonb;
  v_act jsonb;
  v_pos int := 0;
begin
  if v_teacher is null then raise exception 'NOT_TEACHER'; end if;
  if jsonb_array_length(coalesce(p->'teams', '[]'::jsonb)) < 1 then raise exception 'TEAMS_REQUIRED'; end if;

  insert into public.classroom_sessions (teacher_id, code, title, subtitle, company, scenario, instructions, max_per_team, is_demo)
  values (
    v_teacher, public.generate_session_code(),
    p->>'title', coalesce(nullif(p->>'subtitle', ''), 'Construyendo la experiencia del cliente'),
    p->>'company', p->>'scenario', coalesce(p->>'instructions', ''),
    coalesce((p->>'max_per_team')::int, 5), coalesce((p->>'is_demo')::boolean, false)
  ) returning id into v_session;

  for v_team in select * from jsonb_array_elements(p->'teams') loop
    v_pos := v_pos + 1;
    insert into public.teams (session_id, name, color, position)
    values (v_session, v_team->>'name', coalesce(v_team->>'color', '#0A5FB4'), v_pos);
  end loop;

  for v_act in select * from jsonb_array_elements(coalesce(p->'activities', '[]'::jsonb)) loop
    insert into public.activities (session_id, position, key, kind, phase_key, title, objective, instructions,
                                   question, example, recommended_minutes, slide_number, config)
    values (
      v_session, (v_act->>'position')::int, v_act->>'key', v_act->>'kind', nullif(v_act->>'phase_key', ''),
      v_act->>'title', coalesce(v_act->>'objective', ''), coalesce(v_act->>'instructions', ''),
      coalesce(v_act->>'question', ''), coalesce(v_act->>'example', ''),
      coalesce((v_act->>'recommended_minutes')::int, 10), coalesce(v_act->>'slide_number', ''),
      coalesce(v_act->'config', '{}'::jsonb)
    );
  end loop;

  return v_session;
end $$;

-- ---------- RPC pública: datos mínimos de una sesión por código ----------
create or replace function public.get_session_by_code(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id, 'code', s.code, 'title', s.title, 'subtitle', s.subtitle, 'company', s.company,
    'scenario', s.scenario, 'status', s.status, 'max_per_team', s.max_per_team, 'is_demo', s.is_demo,
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'color', t.color, 'position', t.position,
        'count', (select count(*) from public.participants p where p.team_id = t.id)
      ) order by t.position)
      from public.teams t where t.session_id = s.id
    ), '[]'::jsonb)
  )
  from public.classroom_sessions s
  where s.code = upper(btrim(p_code))
$$;

-- ---------- RPC: unirse (o recuperar) la participación del usuario actual ----------
create or replace function public.join_session(p_code text, p_alias text, p_team_id uuid default null)
returns public.participants language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_session public.classroom_sessions;
  v_existing public.participants;
  v_team uuid := p_team_id;
  v_count int;
  v_alias text := btrim(coalesce(p_alias, ''));
  v_result public.participants;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if char_length(v_alias) < 1 or char_length(v_alias) > 40 then raise exception 'INVALID_ALIAS'; end if;

  select * into v_session from public.classroom_sessions where code = upper(btrim(p_code)) for update;
  if v_session.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_session.status = 'finished' then raise exception 'SESSION_FINISHED'; end if;

  select * into v_existing from public.participants where session_id = v_session.id and user_id = v_uid;

  -- Ya estaba dentro y no pide cambiar de equipo: recuperar sesión.
  if v_existing.id is not null and (v_team is null or v_team = v_existing.team_id) then
    update public.participants set alias = v_alias, last_seen_at = now()
      where id = v_existing.id returning * into v_result;
    return v_result;
  end if;

  if v_team is not null then
    if not exists (select 1 from public.teams where id = v_team and session_id = v_session.id) then
      raise exception 'TEAM_NOT_FOUND';
    end if;
    select count(*) into v_count from public.participants where team_id = v_team;
    if v_count >= v_session.max_per_team then raise exception 'TEAM_FULL'; end if;
  else
    -- Asignación automática equilibrada: equipo con menos personas (desempate por orden).
    select t.id into v_team
    from public.teams t
    left join public.participants p on p.team_id = t.id
    where t.session_id = v_session.id
    group by t.id, t.position
    having count(p.id) < v_session.max_per_team
    order by count(p.id), t.position
    limit 1;
    if v_team is null then raise exception 'SESSION_FULL'; end if;
  end if;

  if v_existing.id is not null then
    update public.participants set team_id = v_team, alias = v_alias, last_seen_at = now()
      where id = v_existing.id returning * into v_result;
  else
    insert into public.participants (session_id, team_id, user_id, alias)
      values (v_session.id, v_team, v_uid, v_alias) returning * into v_result;
  end if;
  return v_result;
end $$;

-- ---------- RPC: marcar una aportación para el mapa final (cualquier miembro del equipo) ----------
create or replace function public.set_contribution_selected(p_contribution_id uuid, p_selected boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_session uuid;
begin
  select team_id, session_id into v_team, v_session from public.contributions where id = p_contribution_id;
  if v_team is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_session_owner(v_session) or (public.is_team_member(v_team) and public.team_session_live(v_team))) then
    raise exception 'NOT_ALLOWED';
  end if;
  update public.contributions set selected = p_selected where id = p_contribution_id;
end $$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.teachers enable row level security;
alter table public.journey_phases enable row level security;
alter table public.classroom_sessions enable row level security;
alter table public.teams enable row level security;
alter table public.participants enable row level security;
alter table public.activities enable row level security;
alter table public.team_activity_states enable row level security;
alter table public.contributions enable row level security;
alter table public.touchpoints enable row level security;
alter table public.emotion_votes enable row level security;
alter table public.team_emotion_selections enable row level security;
alter table public.frictions enable row level security;
alter table public.improvements enable row level security;
alter table public.improvement_votes enable row level security;
alter table public.kpis enable row level security;
alter table public.team_journey_summaries enable row level security;

-- Profesores: solo su propia fila (el alta se hace en servidor con service role).
drop policy if exists teachers_self on public.teachers;
create policy teachers_self on public.teachers for select to authenticated using (user_id = auth.uid());

-- Fases: catálogo de lectura.
drop policy if exists phases_read on public.journey_phases;
create policy phases_read on public.journey_phases for select to anon, authenticated using (true);

-- Sesiones
drop policy if exists sessions_select on public.classroom_sessions;
create policy sessions_select on public.classroom_sessions for select to authenticated
  using (public.is_session_owner(id) or public.is_session_member(id));
drop policy if exists sessions_insert on public.classroom_sessions;
create policy sessions_insert on public.classroom_sessions for insert to authenticated
  with check (teacher_id = public.current_teacher_id());
drop policy if exists sessions_update on public.classroom_sessions;
create policy sessions_update on public.classroom_sessions for update to authenticated
  using (public.is_session_owner(id)) with check (teacher_id = public.current_teacher_id());
drop policy if exists sessions_delete on public.classroom_sessions;
create policy sessions_delete on public.classroom_sessions for delete to authenticated
  using (public.is_session_owner(id));

-- Equipos
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (public.is_session_owner(session_id) or public.is_session_member(session_id));
drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for all to authenticated
  using (public.is_session_owner(session_id)) with check (public.is_session_owner(session_id));

-- Participantes: el profesor ve a todos; el alumno, a sí mismo y a su equipo.
drop policy if exists participants_select on public.participants;
create policy participants_select on public.participants for select to authenticated
  using (public.is_session_owner(session_id) or user_id = auth.uid() or public.is_team_member(team_id));
drop policy if exists participants_teacher_write on public.participants;
create policy participants_teacher_write on public.participants for all to authenticated
  using (public.is_session_owner(session_id)) with check (public.is_session_owner(session_id));

-- Actividades
drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities for select to authenticated
  using (public.is_session_owner(session_id) or public.is_session_member(session_id));
drop policy if exists activities_write on public.activities;
create policy activities_write on public.activities for all to authenticated
  using (public.is_session_owner(session_id)) with check (public.is_session_owner(session_id));

-- Tablas de trabajo por equipo con autor individual
do $$
declare t text;
begin
  foreach t in array array['contributions','touchpoints','emotion_votes','frictions','improvements','kpis']
  loop
    execute format('drop policy if exists %1$s_select on public.%1$I', t);
    execute format('create policy %1$s_select on public.%1$I for select to authenticated
                    using (public.can_view_team(team_id))', t);

    execute format('drop policy if exists %1$s_insert on public.%1$I', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated
                    with check (public.is_session_owner(session_id)
                      or (public.owns_participant(participant_id, team_id) and public.activity_open(activity_id)))', t);

    execute format('drop policy if exists %1$s_update on public.%1$I', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated
                    using (public.is_session_owner(session_id)
                      or (public.owns_participant(participant_id, team_id) and public.activity_open(activity_id)))
                    with check (public.is_session_owner(session_id)
                      or (public.owns_participant(participant_id, team_id) and public.activity_open(activity_id)))', t);

    execute format('drop policy if exists %1$s_delete on public.%1$I', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated
                    using (public.is_session_owner(session_id)
                      or (public.owns_participant(participant_id, team_id) and public.activity_open(activity_id)))', t);
  end loop;
end $$;

-- Los votos emocionales se pueden revisar más tarde (actividad "Revisión del mapa emocional"):
-- basta con que la actividad desde la que se revisan esté abierta.
drop policy if exists emotion_votes_update on public.emotion_votes;
create policy emotion_votes_update on public.emotion_votes for update to authenticated
  using (public.is_session_owner(session_id)
    or (public.owns_participant(participant_id, team_id) and public.team_session_live(team_id)))
  with check (public.is_session_owner(session_id)
    or (public.owns_participant(participant_id, team_id) and public.activity_open(activity_id)));

-- Votos de mejoras: cada alumno vota/desvota con su propio participante.
drop policy if exists improvement_votes_select on public.improvement_votes;
create policy improvement_votes_select on public.improvement_votes for select to authenticated
  using (public.can_view_team(team_id));
drop policy if exists improvement_votes_insert on public.improvement_votes;
create policy improvement_votes_insert on public.improvement_votes for insert to authenticated
  with check (public.owns_participant(participant_id, team_id) and public.team_session_live(team_id));
drop policy if exists improvement_votes_delete on public.improvement_votes;
create policy improvement_votes_delete on public.improvement_votes for delete to authenticated
  using (public.owns_participant(participant_id, team_id) or public.is_session_owner(session_id));

-- Decisiones de equipo (cualquier miembro, queda registrado quién las tomó)
drop policy if exists tes_select on public.team_emotion_selections;
create policy tes_select on public.team_emotion_selections for select to authenticated
  using (public.can_view_team(team_id));
drop policy if exists tes_write on public.team_emotion_selections;
create policy tes_write on public.team_emotion_selections for all to authenticated
  using (public.is_session_owner(session_id) or (public.is_team_member(team_id) and public.team_session_live(team_id)))
  with check (public.is_session_owner(session_id)
    or (public.owns_participant(chosen_by, team_id) and public.team_session_live(team_id)));

drop policy if exists tas_select on public.team_activity_states;
create policy tas_select on public.team_activity_states for select to authenticated
  using (public.can_view_team(team_id));
drop policy if exists tas_write on public.team_activity_states;
create policy tas_write on public.team_activity_states for all to authenticated
  using (public.is_session_owner(session_id) or (public.is_team_member(team_id) and public.team_session_live(team_id)))
  with check (public.is_session_owner(session_id)
    or (public.owns_participant(updated_by, team_id) and public.team_session_live(team_id)));

drop policy if exists tjs_select on public.team_journey_summaries;
create policy tjs_select on public.team_journey_summaries for select to authenticated
  using (public.can_view_team(team_id));
drop policy if exists tjs_write on public.team_journey_summaries;
create policy tjs_write on public.team_journey_summaries for all to authenticated
  using (public.is_session_owner(session_id) or (public.is_team_member(team_id) and public.team_session_live(team_id)))
  with check (public.is_session_owner(session_id)
    or (public.owns_participant(updated_by, team_id) and public.team_session_live(team_id)));

-- ---------- Permisos de ejecución ----------
revoke all on function public.create_session(jsonb) from public, anon;
grant execute on function public.create_session(jsonb) to authenticated;
revoke all on function public.join_session(text, text, uuid) from public, anon;
grant execute on function public.join_session(text, text, uuid) to authenticated;
revoke all on function public.set_contribution_selected(uuid, boolean) from public, anon;
grant execute on function public.set_contribution_selected(uuid, boolean) to authenticated;
grant execute on function public.get_session_by_code(text) to anon, authenticated;

grant select on public.journey_phases to anon, authenticated;
grant select, insert, update, delete on
  public.teachers, public.classroom_sessions, public.teams, public.participants, public.activities,
  public.team_activity_states, public.contributions, public.touchpoints, public.emotion_votes,
  public.team_emotion_selections, public.frictions, public.improvements, public.improvement_votes,
  public.kpis, public.team_journey_summaries
to authenticated;

-- ---------- Supabase Realtime ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['classroom_sessions','teams','participants','activities','team_activity_states',
                             'contributions','touchpoints','emotion_votes','team_emotion_selections','frictions',
                             'improvements','improvement_votes','kpis','team_journey_summaries']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

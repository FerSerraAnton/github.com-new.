-- =====================================================================
-- Protousuarios / buyer personas: el profesor carga una lista por sesión
-- y cada equipo elige el perfil cuyo recorrido va a analizar.
-- =====================================================================
alter table public.classroom_sessions add column if not exists personas jsonb not null default '[]'::jsonb;
alter table public.teams add column if not exists persona_key text;

-- Cualquier miembro del equipo (o el profesor) elige o cambia el perfil del equipo.
create or replace function public.set_team_persona(p_team_id uuid, p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare v_session public.classroom_sessions;
begin
  select s.* into v_session from public.classroom_sessions s join public.teams t on t.session_id = s.id where t.id = p_team_id;
  if v_session.id is null then raise exception 'TEAM_NOT_FOUND'; end if;
  if not (public.is_session_owner(v_session.id)
          or (public.is_team_member(p_team_id) and v_session.status <> 'finished')) then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_key is not null and not exists (
    select 1 from jsonb_array_elements(v_session.personas) e where e->>'key' = p_key
  ) then
    raise exception 'PERSONA_NOT_FOUND';
  end if;
  update public.teams set persona_key = p_key where id = p_team_id;
end $$;

revoke all on function public.set_team_persona(uuid, text) from public, anon;
grant execute on function public.set_team_persona(uuid, text) to authenticated;

-- El profesor también puede registrar votos de mejoras (lo necesita la sesión de demostración).
drop policy if exists improvement_votes_insert on public.improvement_votes;
create policy improvement_votes_insert on public.improvement_votes for insert to authenticated
  with check (public.is_session_owner(session_id)
    or (public.owns_participant(participant_id, team_id) and public.team_session_live(team_id)));

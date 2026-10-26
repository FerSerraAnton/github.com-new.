-- =====================================================================
-- UAX Journey Lab · Esquema relacional
-- Soporta varios profesores, varias sesiones de clase y varios equipos.
-- Todos los datos de trabajo llevan session_id y team_id.
-- =====================================================================

-- ---------- Profesores ----------
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null default 'Profesor',
  created_at timestamptz not null default now()
);

-- ---------- Fases del Customer Journey (catálogo común) ----------
create table if not exists public.journey_phases (
  key text primary key,
  position int not null unique,
  name text not null,
  short_name text not null,
  color text not null,
  icon text not null,
  description text not null default ''
);

insert into public.journey_phases (key, position, name, short_name, color, icon, description) values
  ('descubrimiento', 1, 'Descubrimiento', 'Descubrir', '#0E9FB8', 'search', 'Aparece la necesidad y el cliente busca soluciones.'),
  ('consideracion', 2, 'Consideración', 'Considerar', '#6D5BD0', 'scale', 'Compara alternativas, resuelve dudas y decide qué opción le conviene.'),
  ('compra', 3, 'Compra', 'Comprar', '#E08A00', 'shopping-bag', 'Elige canal, método y completa la transacción.'),
  ('retencion', 4, 'Retención / Experiencia', 'Experiencia', '#12946B', 'repeat', 'Usa el producto, interactúa con la marca y valora si repetiría.'),
  ('recomendacion', 5, 'Recomendación', 'Recomendar', '#D9475F', 'megaphone', 'Comparte su experiencia y se convierte (o no) en prescriptor.')
on conflict (key) do update set
  position = excluded.position, name = excluded.name, short_name = excluded.short_name,
  color = excluded.color, icon = excluded.icon, description = excluded.description;

-- ---------- Sesiones de clase ----------
create table if not exists public.classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{4,10}$'),
  title text not null check (char_length(title) between 1 and 140),
  subtitle text not null default 'Construyendo la experiencia del cliente',
  company text not null check (char_length(company) between 1 and 80),
  scenario text not null check (char_length(scenario) between 1 and 2000),
  instructions text not null default '',
  max_per_team int not null default 5 check (max_per_team between 1 and 50),
  status text not null default 'draft' check (status in ('draft', 'live', 'finished')),
  current_activity_id uuid,
  timer_ends_at timestamptz,
  timer_paused_remaining int,
  auto_lock_on_timeout boolean not null default false,
  comparison_enabled boolean not null default false,
  share_enabled boolean not null default false,
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Equipos ----------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#0A5FB4',
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, name)
);
create index if not exists teams_session_idx on public.teams (session_id);

-- ---------- Participantes (solo alias, sin datos personales) ----------
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  alias text not null check (char_length(btrim(alias)) between 1 and 40),
  is_demo boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (session_id, user_id)
);
create index if not exists participants_team_idx on public.participants (team_id);
create index if not exists participants_user_idx on public.participants (user_id);

-- ---------- Actividades (configuración editable por sesión) ----------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  position int not null,
  key text not null,
  kind text not null check (kind in ('welcome', 'need', 'phase', 'emotions', 'frictions', 'improvements', 'kpis', 'pitch')),
  phase_key text references public.journey_phases (key),
  title text not null,
  objective text not null default '',
  instructions text not null default '',
  question text not null default '',
  example text not null default '',
  recommended_minutes int not null default 10 check (recommended_minutes between 0 and 240),
  slide_number text not null default '',
  config jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'active', 'locked', 'completed')),
  created_at timestamptz not null default now(),
  unique (session_id, position),
  unique (session_id, key)
);
create index if not exists activities_session_idx on public.activities (session_id);

alter table public.classroom_sessions
  drop constraint if exists classroom_sessions_current_activity_fk;
alter table public.classroom_sessions
  add constraint classroom_sessions_current_activity_fk
  foreign key (current_activity_id) references public.activities (id) on delete set null;

-- ---------- Estado de cada actividad por equipo ----------
create table if not exists public.team_activity_states (
  team_id uuid not null references public.teams (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  status text not null default 'working' check (status in ('working', 'done')),
  updated_by uuid references public.participants (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (team_id, activity_id)
);

-- ---------- Aportaciones individuales (tarjetas) ----------
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  field_key text not null check (char_length(field_key) between 1 and 60),
  phase_key text references public.journey_phases (key),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contributions_team_idx on public.contributions (team_id);
create index if not exists contributions_session_idx on public.contributions (session_id);

-- ---------- Puntos de contacto ----------
create table if not exists public.touchpoints (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  phase_key text not null references public.journey_phases (key),
  channel text not null check (char_length(btrim(channel)) between 1 and 60),
  channel_type text not null default 'digital' check (channel_type in ('digital', 'fisico')),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists touchpoints_team_idx on public.touchpoints (team_id);
create index if not exists touchpoints_session_idx on public.touchpoints (session_id);

-- ---------- Votos emocionales individuales ----------
create table if not exists public.emotion_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  phase_key text not null references public.journey_phases (key),
  value int not null check (value between 1 and 5),
  reason text not null check (char_length(btrim(reason)) between 3 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, phase_key)
);
create index if not exists emotion_votes_team_idx on public.emotion_votes (team_id);
create index if not exists emotion_votes_session_idx on public.emotion_votes (session_id);

-- ---------- Emoción acordada por el equipo ----------
create table if not exists public.team_emotion_selections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  phase_key text not null references public.journey_phases (key),
  value int not null check (value between 1 and 5),
  reason text not null default '' check (char_length(reason) <= 600),
  chosen_by uuid references public.participants (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (team_id, phase_key)
);
create index if not exists team_emotion_session_idx on public.team_emotion_selections (session_id);

-- ---------- Puntos de fricción ----------
create table if not exists public.frictions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  phase_key text not null references public.journey_phases (key),
  severity text not null check (severity in ('baja', 'media', 'alta')),
  customer_impact text not null default '' check (char_length(customer_impact) <= 600),
  business_impact text not null default '' check (char_length(business_impact) <= 600),
  created_at timestamptz not null default now()
);
create index if not exists frictions_team_idx on public.frictions (team_id);
create index if not exists frictions_session_idx on public.frictions (session_id);

-- ---------- Propuestas de mejora ----------
create table if not exists public.improvements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  friction_id uuid references public.frictions (id) on delete set null,
  problem text not null check (char_length(btrim(problem)) between 2 and 600),
  solution text not null check (char_length(btrim(solution)) between 2 and 1000),
  channel text not null default '' check (char_length(channel) <= 80),
  phase_key text not null references public.journey_phases (key),
  benefit text not null default '' check (char_length(benefit) <= 600),
  priority text not null default 'media' check (priority in ('baja', 'media', 'alta')),
  created_at timestamptz not null default now()
);
create index if not exists improvements_team_idx on public.improvements (team_id);
create index if not exists improvements_session_idx on public.improvements (session_id);

create table if not exists public.improvement_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  improvement_id uuid not null references public.improvements (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (improvement_id, participant_id)
);
create index if not exists improvement_votes_team_idx on public.improvement_votes (team_id);

-- ---------- KPIs propuestos (propuestas de medición, no resultados) ----------
create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  is_custom boolean not null default false,
  measure_what text not null check (char_length(btrim(measure_what)) between 2 and 600),
  phase_key text not null references public.journey_phases (key),
  data_source text not null default '' check (char_length(data_source) <= 300),
  decision text not null default '' check (char_length(decision) <= 600),
  improvement_id uuid references public.improvements (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists kpis_team_idx on public.kpis (team_id);
create index if not exists kpis_session_idx on public.kpis (session_id);

-- ---------- Síntesis / pitch final del equipo ----------
create table if not exists public.team_journey_summaries (
  team_id uuid primary key references public.teams (id) on delete cascade,
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  detected text not null default '' check (char_length(detected) <= 600),
  detected_phase text not null default '',
  proposal text not null default '' check (char_length(proposal) <= 600),
  because text not null default '' check (char_length(because) <= 600),
  measure_with text not null default '' check (char_length(measure_with) <= 300),
  conclusion text not null default '' check (char_length(conclusion) <= 1500),
  updated_by uuid references public.participants (id) on delete set null,
  updated_at timestamptz not null default now()
);

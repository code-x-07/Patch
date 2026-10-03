-- Patch Live Mode. Applied to Supabase project "patch" (segvfwkcwqctbsjqmkkj).
-- All access goes through Patch's server (secret key). RLS is enabled with no
-- policies, so the public anon/publishable key can read or write nothing.

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  teacher_key_hash text not null,
  objective_skill_id text not null default 'S17',
  mode text not null default 'whole_class' check (mode in ('whole_class')),
  state text not null default 'lobby' check (state in ('lobby', 'live', 'finished')),
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  token_hash text not null,
  -- Server-side flow state. Contains answer keys; never returned to clients as-is.
  state jsonb not null,
  stage text not null default 'intro',
  version integer not null default 0,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (class_id, nickname)
);
create index students_class_idx on public.students (class_id);

-- One row per answer, with m_before / m_after so every score is auditable.
create table public.attempts (
  id bigint generated always as identity primary key,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  seq integer not null,
  question_id text not null,
  skill_id text not null,
  phase text not null check (phase in ('quiz', 'probe', 'mission', 'boss')),
  chosen_index integer not null,
  correct boolean not null,
  confidence text not null check (confidence in ('sure', 'guess')),
  hints_used integer not null default 0,
  m_before real not null,
  m_after real not null,
  baseline real not null,
  misconception_id text,
  created_at timestamptz not null default now(),
  unique (student_id, seq)
);
create index attempts_class_idx on public.attempts (class_id);
create index attempts_student_idx on public.attempts (student_id);

-- Rate limiting for AI generation on the public site (hashed IPs only).
create table public.generation_log (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index generation_log_recent_idx on public.generation_log (created_at desc, ip_hash);

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.attempts enable row level security;
alter table public.generation_log enable row level security;

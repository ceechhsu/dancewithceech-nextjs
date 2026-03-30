-- BeatFirst game schema
-- Run this in Supabase > SQL Editor

-- ── game_sessions ──────────────────────────────────────────────────────────
create table if not exists game_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  beat_id     text not null,
  score_pct   integer not null check (score_pct >= 0 and score_pct <= 100),
  perfect     integer not null default 0,
  good        integer not null default 0,
  ok          integer not null default 0,
  miss        integer not null default 0,
  played_at   timestamptz not null default now()
);

create index if not exists game_sessions_user_email_idx on game_sessions (user_email);
create index if not exists game_sessions_beat_idx on game_sessions (user_email, beat_id);

-- Row-level security: users can only read their own rows (service role bypasses RLS)
alter table game_sessions enable row level security;

create policy "users read own sessions"
  on game_sessions for select
  using (user_email = auth.jwt() ->> 'email');

-- ── beat_masteries ──────────────────────────────────────────────────────────
create table if not exists beat_masteries (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  beat_id     text not null,
  mastered_at timestamptz not null default now(),
  unique (user_email, beat_id)
);

create index if not exists beat_masteries_user_email_idx on beat_masteries (user_email);

alter table beat_masteries enable row level security;

create policy "users read own masteries"
  on beat_masteries for select
  using (user_email = auth.jwt() ->> 'email');

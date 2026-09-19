create table public.beatfirst_preview_attempts (
  user_id text not null,
  attempt_id uuid not null,
  level_id smallint not null check (level_id between 1 and 6),
  score smallint not null check (score between 0 and 100),
  hits integer not null check (hits >= 0 and hits <= total),
  total integer not null check (total between 1 and 250),
  best_streak integer not null check (best_streak >= 0 and best_streak <= hits),
  completed_at timestamptz not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, attempt_id)
);

create index beatfirst_preview_attempts_user_saved_idx
  on public.beatfirst_preview_attempts (user_id, saved_at desc, attempt_id desc);

-- NextAuth verifies the Google identity; the server API filters every read by it.
-- Browser database roles have no direct access, and saved results are append-only.
alter table public.beatfirst_preview_attempts enable row level security;
revoke all on table public.beatfirst_preview_attempts from public, anon, authenticated, service_role;
grant select, insert on table public.beatfirst_preview_attempts to service_role;

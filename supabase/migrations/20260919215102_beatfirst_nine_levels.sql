-- Expand the private preview catalog without changing scores or access grants.
alter table public.beatfirst_preview_attempts
  drop constraint beatfirst_preview_attempts_level_id_check,
  add constraint beatfirst_preview_attempts_level_id_check check (level_id between 1 and 9);

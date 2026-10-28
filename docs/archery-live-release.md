# Archery classroom release — October 27, 2026

## Release state

All eight reviewed additive migrations are installed in the existing attendance database, `dance-with-ceech-academy` (`ywianppupnxduthvyeyb`). Mission Archery, Fall 2026, is configured with `progress_tool=archery`. No roster assignments or historical attendance were changed.

The classroom source is based on exact live website commit `dfbf741fa16e247b847807da89dc34fd9039d583`, which includes the newer main-branch work and subsequent live reviews/Halloween updates. This preserves existing trainer, owner, profile, homepage and QR features. The original working directory and unrelated uncommitted dance/video work remain untouched.

## Validation

- 150 automated tests pass on this checkout. TypeScript and lint of the release sources pass.
- The identical production-based candidate passed an optimized build and local browser flows for desktop/mobile access, enrollment filtering, signed-in classroom/QR actions and save retries after refresh/response failure.
- A data-free snapshot of the actual attendance table definitions accepts all eight migrations transactionally.
- All eight live classroom tables use RLS and deny direct anon/authenticated access. Only the trusted service role can execute the archery RPC.
- The existing `rls_auto_enable` event-trigger advisor warnings remain outside this change; no new callable archery SECURITY DEFINER functions were introduced. See the existing [anonymous](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) advisor descriptions.

## Deployment plan

Build reviewed source with the production environment, normal attendance enabled and demo-only mode disabled. Stage without changing domains, check the staged deployment, then promote that exact deployment. The local fixture build and synthetic cookie secret must never be published as production settings.

Real Google sign-in with instructor/student accounts and a physical two-phone class acceptance test remain manual checks; local signed-session browser tests do not establish a real OAuth exchange. The public sample preview continues to keep fictional data in one browser; the signed-in class app uses the shared attendance database.

## Rollback

Previous live deployment: `dpl_8eQji9aPDJ7Nh38o9MHNa8s1yuYG` (`dancewithceech-nextjs-c8nd8r310-ceechhsus-projects.vercel.app`). Restore that deployment if necessary while retaining the additive tables and records. Do not drop schema, delete student records, replay demo SQL, or push all unrelated pending migrations. The older website ignores the new fields.

Migration history uses the timestamps assigned by the connected migration service. Match the eight files by name and the explicit map below; do not replay them simply because their original local timestamps differ.

| Migration name | Installed version |
| --- | --- |
| attendance_class_progress | 20261028010052 |
| archery_rounds_and_competitions | 20261028010057 |
| archery_calendar_registration | 20261028010105 |
| archery_score_wheel | 20261028010711 |
| archery_instructor_practice | 20261028010729 |
| archery_tournament_formats | 20261028010938 |
| archery_result_disputes | 20261028010957 |
| archery_history_visibility | 20261028011011 |

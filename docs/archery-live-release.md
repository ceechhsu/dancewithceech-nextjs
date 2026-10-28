# Archery classroom release — October 27, 2026

## Release state

**Live at https://dancewithceech.com/attendance/archery.** Vercel production deployment `dpl_56zZ5SmoaGKNqHQutwSh8P8tZJbh` (`dancewithceech-nextjs-p20ri9vei-ceechhsus-projects.vercel.app`) is READY and serves both production domains. Feature commit `2c366cfb17304d4f65185ba731f4f56645ce581c` is pushed to GitHub main and `release/archery-classroom-2026-10-27`. The latest navigation correction is commit `d92f1cfec2fa3e7a270d6acea4c3e577246ec3f6`; its optimized Next.js production build completed in approximately 35 seconds.

All eight reviewed additive migrations are installed in the existing attendance database, `dance-with-ceech-academy` (`ywianppupnxduthvyeyb`). Mission Archery, Fall 2026, is configured with `progress_tool=archery`. No roster assignments or historical attendance were changed.

The classroom source is based on exact live website commit `dfbf741fa16e247b847807da89dc34fd9039d583`, which includes the newer main-branch work and subsequent live reviews/Halloween updates. This preserves existing trainer, owner, profile, homepage and QR features. The original working directory and unrelated uncommitted dance/video work were preserved. The clean release checkout is `/tmp/dwc-archery-production-release`; the original checkout remains on its older local main with pending work, so do not deploy that older checkout wholesale. Use GitHub main or the clean release checkout for further releases.

## Validation

- 150 automated tests pass on this checkout. TypeScript and lint of the release sources pass.
- The identical production-based candidate passed an optimized build and local browser flows for desktop/mobile access, enrollment filtering, signed-in classroom/QR actions and save retries after refresh/response failure.
- A data-free snapshot of the actual attendance table definitions accepts all eight migrations transactionally.
- All eight live classroom tables use RLS and deny direct anon/authenticated access. Only the trusted service role can execute the archery RPC.
- The existing `rls_auto_enable` event-trigger advisor warnings remain outside this change; no new callable archery SECURITY DEFINER functions were introduced. See the existing [anonymous](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) advisor descriptions.

## Deployment verification

Built reviewed source remotely with the production environment, `ATTENDANCE_ENABLED=true` and `ARCHERY_DEMO_ONLY=false`; the deployment was staged with `--skip-domain`, verified, then promoted without rebuilding. Public apex and www aliases point to the exact tested deployment. No local fixture credentials or prebuilt fixture output were deployed.

Live service-role smoke transactions passed M/X student practice, separate instructor practice, signup, draw, player report/dispute, instructor ruling and champion advancement. All fictional inserts were rolled back; no release-test records remain.

Live Chromium checks at desktop and phone sizes passed hidden guest menu links, protected class pages, Google sign-in prompts, three private/no-store API denials, responsive layout and existing home/lessons/BeatFirst/trainer/profile routes, with no browser runtime errors. These checks used an empty browser session and performed no sign-in or classroom writes.

Post-deploy observability: the Archery runtime-error scan and deployment-scoped error/fatal log counts were empty. Continuous drain configuration could not be confirmed because the drain endpoint returned 404; no monitoring settings were changed.

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


## Homepage navigation correction — October 27, 2026

The homepage, dance tutorials and online/San Jose lesson pages use separate `approved-pages` navigation components. The initial release added the membership-scoped link to the older public navigation and classroom header but missed these components. The omission was reproduced in the real instructor browser and by a failing local browser regression. Both approved desktop and phone menus now use the existing race-safe membership controller and link directly to the authorized class. Logged-out/unrelated accounts remain excluded.

The expanded browser regression passes homepage, lesson, older-page and classroom navigation for the instructor, enrolled student, unrelated students and guests, including direct-route denial and existing sign-out/API-failure protections. Seventeen focused navigation/homepage tests, scoped lint, TypeScript and optimized build pass. This correction requires no database or roster changes.

Navigation correction publication: deployment `dpl_56zZ5SmoaGKNqHQutwSh8P8tZJbh` is READY on the production domains, source commit `d92f1cf`. The existing real instructor browser now shows Archery in the homepage menu; clicking it opens Mission Archery and its instructor calendar directly. Guest membership requests remain 401/private/no-store, and the new deployment’s error/fatal log scan is empty. The real instructor menu screenshot is retained outside the repository in the chat’s visualization folder.

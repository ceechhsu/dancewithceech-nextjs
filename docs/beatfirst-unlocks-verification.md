# BeatFirst nine-level unlock update — 2026-09-19

## Private delivery

- Short URL: https://beatfirst-ceech.vercel.app
- Final deployment: https://dancewithceech-nextjs-2ug3tmuoc-ceechhsus-projects.vercel.app (preview).
- Production verified unchanged: `dpl_FWFzp2tk7wfiQGKuDHBQAoUGj2wY`.
- Existing Vercel authentication and app passcode retained: unauthenticated 302, missing app passcode 401, correct credentials 200. Progress API without account session 401.
- Alias HTML verified to contain the nine-level catalog, sign-in reward, and correct game-before-journey source order. No local test harness deployed.

## Behavior

- Levels 1–3 unchanged and free. Signing in immediately opens levels 4–6 without completing samples or reaching a score first.
- Level 4: 15 seconds steady, level 5: 20 seconds steady, level 6: 20 seconds with one gap each eight beats.
- Level 7: 25 seconds of the same pattern; level 8: 25 seconds with occasional doubles; level 9: 15 seconds alternating two lanes. All remain 90 BPM and use the clap sound.
- Personal best 80 in level 6 opens 7; 80 in 7 opens 8; 80 in 8 opens 9. Lower replays do not revoke access.
- Prominent sign-in reward and action; requirements on every locked card; personal-best goal progress; new-unlock celebration and play action in the results and journey.
- Selecting the currently selected level prepares a fresh round. Active rounds cannot be interrupted by level selection.

## Verification

- 65 node tests pass, including exact score boundaries, signed-in access without intros, full catalog replay, API ownership and duplicate-race checks, permanent best-score unlocks, storage/retry recovery, and both migrations.
- Scoped ESLint, full local TypeScript, whitespace check, and final Vercel optimized build/TypeScript pass.
- Plan, spec, and quality reviews complete. Review findings fixed: same-level replay action and mobile source/focus ordering.
- Browser at 375×667: sign-in reward, direct locked-card keyboard activation, new account state, 65/80 goal display, per-card requirements, all-levels-open state, error/retry messaging. Error state kept free play available. Desktop checked at 1280×900; no horizontal overflow.
- Actual local game component in a temporary account-state fixture: level 6 hit 27/27 for 100 and opened 7; level 7 intentionally missed its first note, completed 33/34 for 97, and opened 8; level 8 hit 38/38 for 100 and opened 9; level 9 intentionally missed its first note, completed 22/23 for 96. Misses did not interrupt either longer or two-lane rounds. Same-level selection then returned to idle with a start button.
- Actual guest page retained three stored sample bests after reload. Mobile Tab order verified: brand, Back, Let’s play, then journey actions. Temporary fixture route/tab removed and viewport override reset.
- Actual final deployed API with isolated signed test identity: fresh account received 1–6; level 7 before level 6 rejected; levels 4–6 saved without intros and opened 7; ordered 7–9 saved; altered retries stayed immutable; lower level 6 replay retained every unlock; account mismatch returned 409 and another identity saw no rounds. Seven created test rows deleted, token/header files removed. This validates deployed persistence, not the Google OAuth exchange.

## Database and compatibility

Migration `20260919215102_beatfirst_nine_levels.sql` applied to `ywianppupnxduthvyeyb`, extending only the preview table’s level constraint to 1–9. Verified RLS and existing append-only grants remain intact. Browser roles cannot read the table; service role can insert and cannot update. Migration regression confirms existing records survive and levels 0/10 remain rejected.

Security advisor remains unchanged: [RLS without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) is intentional for this server-only table. Previously inspected `rls_auto_enable()` event-trigger notices remain outside this change; see the [existing advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

The table was verified empty before this revision, and Google sign-in has not yet been enabled. Guest samples are unchanged. Old developer-only advanced-level queues are not migrated to the redesigned catalog; after real account rollout, catalog changes will need versioned attempts.

## Remaining action

The prepared Google return address `https://beatfirst-ceech.vercel.app/api/auth/callback/google` still requires explicit approval to save in the existing Google client. Browser policy requires confirmation for expanding an authorized authentication destination. No Google scopes, credentials, or other client settings were changed. After approval, verify real Google sign-in, guest transfer, reload, and cross-device progress before calling the login flow complete.

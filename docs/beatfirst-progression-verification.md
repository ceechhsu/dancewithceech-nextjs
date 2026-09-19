# BeatFirst progression verification — initial six-level revision

Historical evidence for the initial version. The current nine-level revision and unlock rules are documented in `beatfirst-unlocks-verification.md`.

## Delivered privately
- URL: https://beatfirst-ceech.vercel.app
- Final deployment: https://dancewithceech-nextjs-ki0b9v1ye-ceechhsus-projects.vercel.app
- Production remains dpl_FWFzp2tk7wfiQGKuDHBQAoUGj2wY.
- Existing Vercel Authentication and app passcode retained; unauthenticated request 302, Vercel-authenticated without app passcode 401, correct app credentials 200. Final HTML contains all six level names and Save my progress.

## Checks
- 59 node tests pass. Changed-file ESLint passes. Full repository TypeScript passes after installing the exact locked dependencies in this isolated worktree.
- Vercel optimized build and full TypeScript pass.
- Engine and backend each passed separate spec and quality reviews. UI/persistence passed spec and quality review after fixing ownership/readiness, request byte-size batching, durable guest binding, concurrent-tab writes, and response-body timeout issues.
- Actual deployed API tested with a temporary signed test session: unauthenticated 401; locked level 403; ordered six-level import succeeded with 100 scores and all unlocks; conflicting retries did not overwrite scores or increase count; mismatched account header 409; a second identity saw zero attempts. This tests the API, not the Google OAuth exchange. The six temporary database rows were deleted; token/header files removed.
- Browser 375×667: level 1 15/15, level 2 12/12, level 3 18/18, all timing score 100. Level 3 tested with pointer taps. Correct sign-in invitation after completing all introductions; guest bests restored after reload.
- Temporary local component harness: level 5 mixed 20-second pattern 27/27 and level 6 alternating two-lane round 30/30, timing score 100 with pointer taps. Harness and browser overrides removed before the final deployment. Longer levels have not yet been reached through a real signed-in browser account.
- Desktop layout inspected. No new runtime browser errors after restarting the dev server following dependency installation.

## Database
- Additive migration applied to active academy project ywianppupnxduthvyeyb, separate table public.beatfirst_preview_attempts.
- Verified RLS enabled, anon read denied, authenticated insert denied, service_role SELECT/INSERT permitted and UPDATE denied.
- Live transaction successfully inserted/read a result as service_role then rolled back.
- Security advisor's [RLS-without-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) is intentional: browser roles have no table grants, and verified NextAuth identity is enforced by the server API.
- Existing public.rls_auto_enable security-definer notices were inspected; the function returns event_trigger. No existing attendance functions or permissions were changed. [Advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## Remaining Google setup
The existing Google client lacks https://beatfirst-ceech.vercel.app/api/auth/callback/google. The field is prepared but Save has not been clicked because adding an authorized OAuth return address requires browser-policy confirmation. The pending user question requests exactly that approval. Once approved: save the staged Google change, verify the redirect-mismatch error is gone, complete Google sign-in in the private preview, confirm guest results import once and unlocks survive reload/sign-out/sign-in. Only then is real account sign-in considered verified.

## Limits
- Guest practice keeps personal best attempts plus the latest 20 rounds locally; accounts keep all server-acknowledged results. Offline account queue is bounded to 200 attempts with an explicit error if full.
- Cross-tab mutation locking uses Web Locks where supported; older browsers without Web Locks retain per-tab serialization. Modern target browsers support the tested flow.
- No production merge/promotion or new public links.

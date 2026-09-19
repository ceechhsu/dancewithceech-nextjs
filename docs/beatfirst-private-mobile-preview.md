# Private mobile preview — 2026-09-19

URL: https://beatfirst-ceech.vercel.app

The short address redirects directly to `/beat-first/preview`. Password updated to the owner's requested value, stored only in the deployment environment and ignored local backup.

Vercel project: `dancewithceech-nextjs`. Deployment: `https://dancewithceech-nextjs-2ug3tmuoc-ceechhsus-projects.vercel.app`. Target: **preview**.

## Access

- Existing Vercel Authentication remains enabled. An unauthenticated browser redirects to Vercel sign-in.
- This route also requires HTTP Basic authentication with username `ceech` and the owner's chosen passcode.
- The passcode is provided through the deployment-only `BEATFIRST_PREVIEW_PASSWORD` runtime variable. It is not in source, client JavaScript, URLs, or this document. Local backup is in the ignored `.vercel` directory with owner-only file permissions.
- The deployed route fails closed without its password and returns 404 if deployed to production. Local development remains accessible.
- The extra passcode is necessary because the existing Vercel project has two authorized accounts; no team permissions were changed.

## Verification

- All 65 gameplay, access-control, progress, and recovery tests pass, including preview-only root redirection; modified-file ESLint passes.
- Vercel remote build and full-site TypeScript check pass. This supersedes the previous local-only build limitation (the deployment environment has the missing attendance dependencies installed).
- Vercel-authenticated request without passcode: 401 and authentication challenge, no game HTML.
- Vercel-authenticated request with wrong passcode: 401, no game HTML.
- Vercel-authenticated request with correct passcode: 200 with the game HTML.
- Unauthenticated browser: Vercel sign-in screen.
- Production deployment remains `dpl_FWFzp2tk7wfiQGKuDHBQAoUGj2wY`; no production promotion, domain changes, or merge.
- The original one-lane sample was tested on the owner's phone successfully. Expanded levels were verified in a 375×667 browser viewport; a new physical-phone pass remains useful.

## Progression update

Nine levels are implemented, all at 90 BPM and clap-only. Levels 1–3 remain free 10-second samples. Signing in immediately opens level 4 (15 seconds steady), level 5 (20 seconds steady), and level 6 (20 seconds with simple gaps). A personal best of 80 in level 6 opens level 7 (25 seconds of the same pattern); 80 in level 7 opens level 8 (25 seconds adding occasional doubles); 80 in level 8 opens level 9 (15 seconds alternating two lanes). The journey now includes an explicit sign-in reward, requirements on every locked card, personal-best progress, and a play button when a level opens. See `beatfirst-unlocks-verification.md` for this revision’s evidence.

Preview runtime overrides `NEXTAUTH_URL=https://beatfirst-ceech.vercel.app` and `ATTENDANCE_ENABLED=false`. Existing production and attendance-preview configuration is preserved. BeatFirst uses the paired attendance Supabase configuration for the active academy database, in its own `beatfirst_preview_attempts` table; it does not read or modify attendance records.

**Pending external action:** Google OAuth currently rejects the new preview callback. The exact URI `https://beatfirst-ceech.vercel.app/api/auth/callback/google` is staged in the existing DanceWithCeech Google client but has NOT been saved. Browser safety confirmation was requested and remains unanswered. This must be approved/saved, then real Google sign-in, guest import, reload and cross-device progress tested before claiming end-to-end login works. No new Google scopes or secrets are needed.

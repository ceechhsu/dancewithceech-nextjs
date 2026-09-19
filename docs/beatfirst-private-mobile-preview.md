# Private mobile preview — 2026-09-19

URL: https://beatfirst-ceech.vercel.app

The short address redirects directly to `/beat-first/preview`. Password updated to the owner's requested value, stored only in the deployment environment and ignored local backup.

Vercel project: `dancewithceech-nextjs`. Deployment: `https://dancewithceech-nextjs-ki0b9v1ye-ceechhsus-projects.vercel.app`. Target: **preview**.

## Access

- Existing Vercel Authentication remains enabled. An unauthenticated browser redirects to Vercel sign-in.
- This route also requires HTTP Basic authentication with username `ceech` and the owner's chosen passcode.
- The passcode is provided through the deployment-only `BEATFIRST_PREVIEW_PASSWORD` runtime variable. It is not in source, client JavaScript, URLs, or this document. Local backup is in the ignored `.vercel` directory with owner-only file permissions.
- The deployed route fails closed without its password and returns 404 if deployed to production. Local development remains accessible.
- The extra passcode is necessary because the existing Vercel project has two authorized accounts; no team permissions were changed.

## Verification

- All 59 gameplay, access-control, progress, and recovery tests pass, including preview-only root redirection; modified-file ESLint passes.
- Vercel remote build and full-site TypeScript check pass. This supersedes the previous local-only build limitation (the deployment environment has the missing attendance dependencies installed).
- Vercel-authenticated request without passcode: 401 and authentication challenge, no game HTML.
- Vercel-authenticated request with wrong passcode: 401, no game HTML.
- Vercel-authenticated request with correct passcode: 200 with the game HTML.
- Unauthenticated browser: Vercel sign-in screen.
- Production deployment remains `dpl_FWFzp2tk7wfiQGKuDHBQAoUGj2wY`; no production promotion, domain changes, or merge.
- The original one-lane sample was tested on the owner's phone successfully. Expanded levels were verified in a 375×667 browser viewport; a new physical-phone pass remains useful.

## Progression update

Three free 10-second introductions and three earned 20-second challenges are implemented. All remain 90 BPM and clap-only. The later challenges add duration, a mixed pattern, then alternating left/right tracks. Logged-in users earn level 4 with scores of at least 80 on each introduction, then earn levels 5 and 6 by reaching 80 on the preceding level.

Preview runtime overrides `NEXTAUTH_URL=https://beatfirst-ceech.vercel.app` and `ATTENDANCE_ENABLED=false`. Existing production and attendance-preview configuration is preserved. BeatFirst uses the paired attendance Supabase configuration for the active academy database, in its own `beatfirst_preview_attempts` table; it does not read or modify attendance records.

**Pending external action:** Google OAuth currently rejects the new preview callback. The exact URI `https://beatfirst-ceech.vercel.app/api/auth/callback/google` is staged in the existing DanceWithCeech Google client but has NOT been saved. Browser safety confirmation was requested and remains unanswered. This must be approved/saved, then real Google sign-in, guest import, reload and cross-device progress tested before claiming end-to-end login works. No new Google scopes or secrets are needed.

# Private mobile preview — 2026-09-19

**Live release:** The approved 18-level version now replaces the public game at https://dancewithceech.com/beat-first. See [the live release verification](beatfirst-live-release-verification.md) for production, sign-in, and saved-progress evidence. The information below records the private preview deployment, which remains available separately.

URL: https://beatfirst-ceech.vercel.app

The short address redirects directly to `/beat-first/preview`. Password updated to the owner's requested value, stored only in the deployment environment and ignored local backup.

Vercel project: `dancewithceech-nextjs`. Deployment: `https://dancewithceech-nextjs-2thfonio0-ceechhsus-projects.vercel.app`. Target: **preview**.

## Access

- Existing Vercel Authentication remains enabled. An unauthenticated browser redirects to Vercel sign-in.
- This route also requires HTTP Basic authentication with username `ceech` and the owner's chosen passcode.
- The passcode is provided through the deployment-only `BEATFIRST_PREVIEW_PASSWORD` runtime variable. It is not in source, client JavaScript, URLs, or this document. Local backup is in the ignored `.vercel` directory with owner-only file permissions.
- The deployed route fails closed without its password and returns 404 if deployed to production. Local development remains accessible.
- The extra passcode is necessary because the existing Vercel project has two authorized accounts; no team permissions were changed.

## Verification

- All 76 gameplay, access-control, progress, and recovery tests pass, including preview-only root redirection; modified-file ESLint passes.
- Vercel remote build and full-site TypeScript check pass. This supersedes the previous local-only build limitation (the deployment environment has the missing attendance dependencies installed).
- Vercel-authenticated request without passcode: 401 and authentication challenge, no game HTML.
- Vercel-authenticated request with wrong passcode: 401, no game HTML.
- Vercel-authenticated request with correct passcode: 200 with the game HTML.
- Unauthenticated browser: Vercel sign-in screen.
- At this preview verification, production remained `dpl_FWFzp2tk7wfiQGKuDHBQAoUGj2wY` without promotion or domain changes. The subsequent live release is recorded in the linked document above.
- The owner successfully tested the previous nine levels. The new kick/clap patterns and 100/110 BPM rounds were verified in a 375×667 browser viewport; physical-phone listening and difficulty feedback remain useful.

## Progression update

Eighteen levels are implemented. Levels 1–8 retain their original clap timing and patterns. Level 9 introduces left kick/right clap at the original 90 BPM timing; levels 10–12 gradually add duration, paired hands, and a gap. Levels 13–15 introduce 100 BPM and an extra kick; levels 16–18 introduce 110 BPM, an extra clap, and a 30-second round. Existing scores remain valid. Guests have three free samples, sign-in immediately opens 4–6, and personal best 80 in each preceding level opens the next through 18.

Mastery stars at 80/90/95 and a signed-in three-round daily goal provide replay targets. Six expandable chapters and explicit lock requirements keep the longer journey readable. See `beatfirst-patterns-tempos-verification.md` for this revision’s evidence.

Preview runtime overrides `NEXTAUTH_URL=https://beatfirst-ceech.vercel.app` and `ATTENDANCE_ENABLED=false`. Existing production and attendance-preview configuration is preserved. BeatFirst uses the paired attendance Supabase configuration for the active academy database, in its own `beatfirst_preview_attempts` table; it does not read or modify attendance records.

**Google return address saved:** The owner explicitly approved adding `https://beatfirst-ceech.vercel.app/api/auth/callback/google`. Google Cloud confirmed “OAuth client saved” after a transient first-save error. No scopes, credentials, or other client settings changed. A direct authorization request using the exact saved client and callback now opens Google’s normal account chooser for `beatfirst-ceech.vercel.app`, rather than `redirect_uri_mismatch`. The owner selected `ceechhsu@gmail.com` for testing; automatic account-selection approval was resolved, but the test browser stalled at Vercel’s separate Google sign-in after two attempts. That browser did not complete the full OAuth flow. Afterward, the owner reported successfully testing all nine levels. This user confirmation is separate from automated fixture and deployed API verification. No authentication configuration changed for the eighteen-level update.

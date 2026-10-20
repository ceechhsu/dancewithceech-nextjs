# Owner sign-in directory release — October 20, 2026

Scope: owner-only /admin and /api/admin/overview; Google sign-in directory independent of gameplay; account-data notice and self-erasure. Excludes social reports and editable profiles from the earlier preview.

Base: GitHub main and live Vercel production both verified at be9ecca4240cc4804f59e34c81107d1ed24eb3bd. Isolated clone preserves unrelated local work. The previous dashboard chat was idle before changes.

Security: signed, server-verified Google subject/email with sole owner dancewithceech@gmail.com before constructing read clients. No browser role access to directory or RPC. Private CSP, no-store, noindex, no-referrer, analytics suppression and full-document admin navigation. Account erasure uses only the session subject, same-origin DELETE, no selector/body.

Coverage: Google OAuth completion triggers recording from every site's Auth.js entry point, including practice. Existing sessions are not retroactively a sign-in. No historical sign-in-only backfill; existing saved practice can show an unidentified account until its next recorded sign-in. Directory pages are fully loaded; practice snapshots retain explicit source caps. Active time is not measured. Recording failures are logged without identity and do not prevent site sign-in; this directory is operational reporting, not a guaranteed audit log.

Retention: expiry at 90 days after last recorded sign-in; dashboard excludes expired rows immediately. Supabase cron owner-directory-expiry runs 04:17 UTC daily. Own-account deletion immediately removes the directory row; later Google sign-in recreates it. Provider backup rotation and separately stored practice/results are disclosed in /privacy. To handle a verified operator erasure request, use a parameterized delete by exact user_id; never infer identity from display name. Restores require reapplying verified erasures before access resumes.

Verification before release: 11 focused tests passed; TypeScript and changed-file ESLint passed; optimized build passed with inert service credentials and normal font downloads. Production HTTP/SDK fixture flow passed owner 200, guest 401, ordinary/unverified 403, zero backend reads for denied requests, sign-in-only account inclusion, stable subject join, unknown-email preservation, exact-count cap detection, independent source errors, expiry filter and production preview 404. Independent plan and code reviews found no blocking issues.

Live database: project ywianppupnxduthvyeyb. Applied owner_account_directory migration. Verified RLS=true, anon/authenticated table SELECT and RPC EXECUTE=false, both functions SECURITY INVOKER, cron active at 17 4 * * *. Rollback-only synthetic sign-in/repeat/expiry purge transaction succeeded, leaving zero directory records. Security advisor's only finding for the directory is informational RLS-without-policy, intentionally denying browser access. Existing rls_auto_enable warnings are unrelated and unchanged.

Production flags: OWNER_DASHBOARD_ENABLED, OWNER_SIGNIN_RECORDING_ENABLED and OWNER_SIGNIN_PRIVACY_REVIEWED are true. Uses existing server Supabase configuration; no new secrets exported or copied.

Live owner OAuth and the final promoted deployment are verified separately after staging; do not interpret fixture HTTP checks as Google OAuth validation.

Browser follow-up: owner-denied sessions now have the existing Google account chooser on /admin, with fixed /admin callback and select-account prompt. Live migration history uses version 20261020162031; the generated local file is aligned to that recorded version to prevent a duplicate future push.

## Final live verification

- Final runtime release b6915f6a3c90b2473c5725ce686acbea7ae49f56 is READY as deployment dpl_3TD8eC8quZAiQz4yaik1t8gYPM4z. Vercel lookup for dancewithceech.com resolves to that deployment. GitHub main and the scoped release branch contain the runtime commit.
- Live guest /api/admin/overview returns 401 with private/no-store, no-referrer, noindex and strict private CSP. Staged privacy notice loads; synthetic preview is 404. Actual nonowner/unverified browser session was denied before changing accounts.
- Actual Google OAuth account chooser selected the already-signed-in authorized owner, returned to /admin, and displayed the real dashboard. No fixture cookie, new credential, consent expansion or account list export was used. SQL boolean verification confirms the live owner directory entry and 90-day expiry; first live recorded sign-in was October 20, 2026 at 09:28:44 America/Los_Angeles (16:28:44 UTC).
- Real dashboard refresh succeeded; DOM inspection found zero Google/Meta analytics script elements, no synthetic banner, and viewport/page width both 1280px. Owner first recorded sign-in was expanded for verification and collapsed again. The tab remains open as a deliverable. Its opening is also queued for original chat 01a15a12-c757-75d3-a990-0f7e56600774.
- No remaining user action. Historical sign-in-only users remain unknowable; existing sessions are recorded only on a new completed Google sign-in. Daily cron is active and its scheduler is running; the purge function passed a rollback-only live expiry test. The first scheduled daily run has not yet occurred.

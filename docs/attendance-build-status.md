# Attendance build — September 13, 2026

## Latest preview delivery — calendar and schedule

Follow-up: student calendar Present totals now include confirmed check-ins while the window is open. Absent totals still wait for closure; cancellations remain excluded. Regression tests cover immediate presence, unchanged count on closure, cancellation, and provisional absence. 61 focused tests, TypeScript, and changed-file ESLint pass. This is a student calendar calculation change; instructor completed-session summaries are unchanged.

Deployed to https://attendance-preview.dancewithceech.com using preview deployment `attendance-preview-7a1pce6aq-ceechhsus-projects.vercel.app` (immediate student Present-count fix). Public production website unchanged; working-copy changes remain uncommitted.

- Student per-class Calendar/List, month controls, check-in times, semester Present/Absent/Remaining, date-specific correction request and outcomes.
- Instructor schedule dates/weekdays, holidays, cancellation and undo, correction review with revision protection.
- Applied additive migration `20260913223327_attendance_calendar.sql` to project `ywianppupnxduthvyeyb`. Counts unchanged: 5 classes, 30 enrollment rows, 27 records, 9 meetings. Eight untouched original check-ins safely backfilled; unknown/manual times remain null.
- 59 focused tests pass, TypeScript and changed-file ESLint pass, preview build passes. Independent spec and quality reviews completed; findings fixed.
- Isolated fictional UI verified at 390px and 1280px: calendar/list, stable totals across months, original time, request submission/approval, schedule saving. No horizontal overflow at tested widths.
- Live instructor schedule/requests load without console errors. Unauthenticated calendar endpoint returns 401; browser roles cannot execute calendar RPC directly.
- Supabase advisor retains pre-existing `rls_auto_enable()` execute warnings; new attendance tables intentionally deny direct browser access with RLS and no browser policies. Unrelated function not modified.
- Real student Google-account phone testing is the next acceptance check. Prior September 12 notes below describe the initial build, not current deployment state.

Rollback: restore the prior preview alias; leave additive schema and records intact. No destructive rollback.

## Initial build notes — September 12

## Delivery state

Implemented in the isolated `codex/attendance-nextjs` working copy. This is the Next.js/Vercel implementation, **not ChatGPT Sites**. Changes are local and uncommitted; no production deployment, live database migration, or real roster transfer has occurred.

Implemented: shared Google identity with verified claims; normal public dashboard plus matched classes; instructor class/schedule setup and editing; roster preview/import (CSV/XLS/XLSX), nullable email/college ID, individual edits and dated drops; 10-minute meetings with one five-minute extension; rotating QR, fixed 50-meter location verification; personal history; manual corrections with immutable audit; cached manual attendance and conflict-safe sync; instructor failure alerts and fallback list.

Private pages suppress marketing analytics and referrers. Existing homepage accessibility colors and public-site behavior remain unchanged. The feature is disabled unless explicitly enabled on the server.

## Verified locally

- Production build succeeds with placeholder service settings.
- TypeScript passes.
- Full lint has no errors; one existing warning remains in `public/beatfirst-practice/src/app.mjs`.
- Forty focused attendance/security/homepage/navigation tests pass. Database tests load the actual SQL migration into disposable PGlite PostgreSQL.
- Phone-sized browser test exercises real Next.js handlers and the disposable database: class session, QR, student check-in/history, expiration, outsider isolation, offline page reload, manual marking and reconnect sync.
- Browser login tests use synthetic, locally signed Auth.js cookies. They do **not** verify a real Google OAuth round trip.

## Required before a real-student pilot

1. Confirm the intended Supabase project and inspect its current schema before applying the reviewed migration. Take a backup appropriate to that project. Do not move prototype/student data automatically.
2. Configure the existing Google credentials and server Supabase credentials in the intended preview environment. Set the instructor email allowlist explicitly; never infer instructor access from a roster entry.
3. Set `ATTENDANCE_ENABLED=true` only after the schema exists. Optional push requires its own VAPID configuration; attendance works without push.
4. Test actual instructor and student Google accounts, two independent phones, classroom GPS precision/permission handling, and offline sync. Real simultaneous network clients and physical 50-meter boundaries still require verification.
5. Validate push on supported devices. Delivery is best effort; the on-demand issue list remains the fallback.
6. Agree retention and any prototype import before storing real student records. The old prototype remains untouched.

Rollback: disable `ATTENDANCE_ENABLED`; keep attendance/audit tables intact. Do not drop tables as a feature rollback.

## Local test fixture

`tests/browser/attendance-fixture-server.mjs` binds only to loopback, uses an in-memory database and fictional users, and does not connect to Supabase. `tests/browser/attendance-flow.mjs` targets only localhost:3104. Its fixed signing secret is for this isolated fixture only and must never be configured in deployed environments. Playwright is supplied by the desktop runtime for local verification, not added as an application dependency.

See `attendance-backend.md` for environment variables, API security, location thresholds, and database behavior. Expired meetings finalize on subsequent authorized access; there is no scheduled background finalizer in this build.

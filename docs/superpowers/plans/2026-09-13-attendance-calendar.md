# Attendance Calendar and Schedule Implementation Plan

> **For agentic workers:** Use subagent-driven-development for bounded backend implementation and spec/quality review. Steps use checkboxes for tracking. Do not commit, push, or deploy production; user approved attendance preview only.

**Goal:** Add per-class Calendar/List attendance, immutable check-in times, instructor schedule exceptions, and student correction requests with review.

**Architecture:** Preserve the existing authenticated attendance API and database rows. Add an additive migration and a service-role-only `attendance_calendar_api` RPC for calendar, schedule, and requests; server routes use the existing verified Google identity and same-origin checks. A pure calendar model derives days and semester counts from scheduled days, enrollment periods, exceptions, and actual meeting records. Existing meetings override schedule changes so history is retained.

**Tech Stack:** Next.js, React, CSS modules, Supabase Postgres, node:test/PGlite.

## Approved behavior
- September 13 follow-up supersedes the original completed-only student Present rule: count confirmed student presence immediately during an open window; only absence waits for closure. Instructor completed-session roster totals are unchanged by this follow-up.
- First/last class dates and weekdays are configurable ahead of time; holidays/no-class dates explicit.
- Cancel any class date, especially today, optionally explain; undo without deleting check-ins or silently penalizing students. No attendance window may open/check in on excluded dates.
- Calendar default, List toggle, month chevrons, per-class only, today label. Present green, absent pink, upcoming blue outline, no-class/cancelled grey, unfinalized past neutral Pending.
- Semester Present/Absent count completed noncancelled eligible meetings only; Remaining counts future eligible scheduled dates excluding exceptions and held sessions (today remaining until its start if no session). No total semester line.
- Actual first successful database check-in time is immutable, timezone formatted HH:MM am/pm. Backfill only untouched check-in records; manual rows remain unknown.
- Student can request correction to their own recorded attendance, class/date/status prefilled, desired status + explanation required. Pending blocks duplicate, history/outcome visible, totals unchanged until approval. Instructor reviews by class, approves/keeps with optional response, optimistic revision checks and audit trail.
- Retain shared navigation, Google-only login, 10-minute QR testing window, enrollment and geo gates, offline protections.

## Interface contract
Routes `/api/attendance/calendar` (GET), `/schedule` (GET/POST), `/requests` (GET/POST) call new RPC with authenticated `p_actor,p_sub,p_instructor,p_resource,p_action,p_body`.
- GET calendar?classId: `{class, today, now, enrollments:[{id,effective_from,effective_to}], exceptions:[{date,kind:'holiday'|'cancelled',reason}], meetings:[{id,meeting_date,status,record:{meeting_id,enrollment_id,status,source,revision,updated_at,checked_in_at}|null}], requests:[{id,meeting_id,enrollment_id,requested_status,explanation,status:'pending'|'approved'|'kept',response,created_at,reviewed_at}]}`. Only own student records; class owner may load schedule but not impersonate a student.
- GET schedule?classId: `{class,exceptions}` with class.schedule_revision. POST action `save`: classId,start_date,end_date,days,expectedRevision,confirmShorten boolean. Reject invalid dates/days, overlapping stale saves; warn shortening. POST `exclude`: classId,date,kind,reason. POST `restore`: classId,date. Mutations return refreshed schedule.
- Calendar reads finalize expired OPEN meetings via existing finalizer before returning records. Cancelled meetings never finalize. Undo restores previously closed meetings as closed with their original records; formerly open cancelled meetings become closed without inventing missing absences (show Pending for missing records, instructor can correct explicitly). Never reopen/restore QR tokens. Store pre-cancel status; legacy cancelled meetings have unknown prior state and restore conservatively without generating absences.
- GET requests?classId: `{requests:[...request,student_name,email,meeting_date,current_status,current_revision]}` scoped owner or own requests. POST `create`: classId,meetingId,enrollmentId,requested_status,explanation; capture current status/revision. POST `review`: classId,requestId,decision:'approved'|'kept',response,expectedRevision. Stale record returns conflict; no overwrite.

## Tasks
All four tasks delivered to the attendance preview on September 13. See `docs/attendance-build-status.md` for deployment, test evidence, and remaining real-device acceptance testing.
### 1. Backend and regression tests
Files: new CLI-generated SQL migration, `src/lib/attendance/calendar-server.ts`, new route files, `tests/attendance-calendar-db.test.mjs`.
- [x] Write PGlite tests: immutable timestamp and safe backfill; schedule exception blocks open; cancel/restore preserves rows; unauthorized access; duplicate request; approval revision conflict; retained history outside edited dates.
- [x] Run tests red, implement migration/RPC/routes, rerun green. Do not replace live attendance_api from old baseline.
- [x] Inspect current live definitions for compatibility; apply additive migration only after local tests and independent review. Query row counts before/after, security advisors. No real record mutations for test data.

### 2. Calendar model and student UI
Files: `src/lib/attendance/calendar.ts`, `src/components/attendance/AttendanceHistory.tsx`, `AttendanceCalendar.tsx`, `CorrectionRequest.tsx`, `Calendar.module.css`, `types.ts`, `CheckIn.tsx`, tests.
- [x] Test pure model dates, leap/month boundaries, timezone, enrollment, multiple sessions/day, exceptions, future/pending, counts and timestamp display.
- [x] Implement responsive 7-column calendar with semantic buttons and visible legend, month controls constrained to schedule plus historical records. List same data. Native detail region/form, no custom modal.
- [x] Add correction form/request state; no fabricated check-in times; existing names/photos unaffected.

### 3. Instructor UI and integration
Files: `ScheduleManager.tsx`, `CorrectionRequests.tsx`, `InstructorConsole.tsx`, `ClassSetup.tsx`.
- [x] Schedule first/end/days editor, warning shortening, no-class date input and exception list with restore. Cancel today shortcut. Existing class edit must not bypass schedule invariants.
- [x] Correction review list, current/requested status, explanation, reply, approve/keep controls. Refresh totals after mutation.
- [x] Remove duplicate legacy cancel control or route it through new whole-date cancellation.

### 4. Verification and preview
- [x] Full attendance tests, TypeScript, ESLint, spec review then code-quality review. Fix findings.
- [x] Browser verify Calendar/List, month chevrons, detail/request state, schedule and reviews at desktop and mobile with isolated fixtures; avoid editing real student records.
- [x] Additive schema deployment and read-only smoke, preview build, alias attendance-preview.dancewithceech.com, verify live instructor controls. Public website unchanged.

## Design brief
Community-college students checking attendance between classes; instructor correcting records quickly. Preserve dark Dance With Ceech surfaces, blue site links, pale high-contrast text, green/pink status tints. Vocabulary: class sessions, roster, semester, check-in, holidays, review. Signature: a personal attendance month with check-in details and an embedded correction request. Avoid dense event-calendar chrome, color-only badges, and invented attendance for past scheduled dates. Reuse existing typography, 4px spacing rhythm, 44px controls, high contrast focus rings; calendar dates compact but at least 44px tall.

# Instructor challenges Implementation Plan

> **For agentic workers:** Execute inline using executing-plans, with independent plan and final code review. Steps use checkbox syntax for tracking.

**Goal:** The owning instructor and actively enrolled students can challenge each other, accept/decline, report/confirm results and use the existing explicit instructor dispute decision. Update the live app.

**Architecture:** Add a service-only challenge-player registry with class-scoped composite keys. Student IDs remain their enrollment IDs, preserving every existing challenge. A class instructor gets a separate player ID without a fabricated enrollment; its provider subject is bound only from a verified owner request. A nullable subject permits students to invite their class instructor before the instructor opens the feature. A new top-level RPC wrapper reuses the existing trusted identity/class lock and delegates practice/tournaments unchanged, but handles challenge transitions and serializes challenge players/history/decision names. Personal-round and tournament `me` fields remain unchanged; add `challengeMe` and `challengeRoster`.

**Tech Stack:** Next.js/React/TypeScript, Auth.js verified Google identity, Supabase/PostgreSQL, PGlite tests, Playwright.

## Task 1: Database regression tests first

- [x] Create `tests/archery-instructor-challenges-db.test.mjs` loading the existing eight migrations plus the new migration when present. Run against old behavior and require a real failure for instructor membership/challenge creation.
- [x] Cover student invites instructor before initial owner visit, owner invites student, opponent-only accept/decline, no self/cross-class/inactive invitations, duplicate/rate guards, subject mismatch/owner change, retries, private serialization, and untouched old student IDs/history.
- [x] Cover own instructor result requiring peer confirmation in either direction, immutable result outcomes, student/instructor dispute raising, paused reports, explicit audited owner resolution/cancel, and unchanged third-party instructor refereeing of student games.
- [x] Verify no enrollment is added, practice privacy and tournament advancement stay unchanged, RLS/anon denial, and transactional browser upgrades.

## Task 2: Add migration and shared serialization

- [x] Generate migration with `rtk proxy supabase migration new archery_instructor_challenges`.
- [x] Create `archery_challenge_players`: student entries retain enrollment UUIDs; instructors have separate UUID, class/email and nullable provider subject. Unique instructor per class/email, composite `(id,class_id)` for challenge FKs, RLS and no browser grants. Backfill students and instructor slots without inventing provider claims.
- [x] Replace challenge enrollment FKs with class-scoped player FKs transactionally. Keep historical player rows after drops/removals and owner changes; active picker validates current roster/owner.
- [x] Move prior public wrapper to `archery_private.archery_api_history`, add service-only public wrapper. Authenticate and lock via prior list, bind instructor subject from verified actor, upsert newly enrolled player IDs. Handle challenge create/respond/result/confirm/cancel and challenge dispute resolve directly; delegate all unrelated actions unchanged.
- [x] Ordinary reports by either participant remain proposed until the other player agrees. A nonparticipating owner may still referee student games. Own disputes are resolved only through explicit `dispute_resolve`, consistent with existing tournament policy. Preserve original evidence and idempotent exact decisions; reject conflicting rewrites.
- [x] Lists replace challenge rows/queue player names using only scoped ID/name projections, include all pending/accepted plus latest 100 terminal, and never serialize provider IDs/emails. Keep roster/private round/tournament shape unchanged.

## Task 3: UI and preview upgrade

- [x] Modify `src/lib/archery/types.ts`, `src/components/archery/Challenges.tsx`, `ArcheryHub.tsx`: use challenge-specific actor/picker, instructor Send/Accept/Decline/Report/Confirm controls, separate referee powers from participant role, own incoming notification, instructor label in wheel. Retain student roster count semantics.
- [x] Add new SQL to `src/app/attendance/archery-preview/page.tsx`, `ArcheryPreview.tsx` seed and transactional upgrade guard, `next.config.ts` tracing, browser fixture and actual-live-schema replay test. Never reset existing sample history.
- [x] Create phone HTTP browser flow for both directions, refusal, opponent confirmation, dispute resolution and no outsider access. Existing tournament and practice tests remain meaningful.

## Task 4: Review and publish

- [x] Run targeted then full relevant tests, TypeScript, lint and production build; inspect phone UI. Obtain independent code review and fix important findings.
- [x] Inspect current live DB schema/migration history and actual live commit. Apply only the new reviewed migration to `ywianppupnxduthvyeyb`; verify service-only access and rolled-back synthetic challenge smoke transaction. Never create production student test records that persist.
- [x] Commit/push reviewed source to main, stage remote production build with attendance enabled/demo disabled, verify and promote the tested build. Confirm actual instructor UI supports sending a challenge without sending unsolicited invitations to real students. Record release/rollback and clean fixture services.

**Authorization:** User explicitly requested both challenge directions and live update. Work inline; no execution-choice pause is needed. Preserve unrelated work in the original older root checkout.

Execution: implementation and reviewed migration completed; live publication and final UI confirmation are recorded in archery-live-release.md.

# BeatFirst Clear Unlocks Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the independent catalog task and review; execute the integrated journey and deployment locally. Track steps below.

**Goal:** Make sign-in immediately unlock levels 4–6, explain every lock, and introduce gradual challenges through level 9.

**Architecture:** Keep the shared level catalog and server-replayed scoring. Signed-in players start with levels 1–6; personal best 80 in level 6 opens 7, then 7 opens 8, then 8 opens 9. Use the same rules in API and UI. Extend only the private preview database constraint and deploy only to the existing private alias.

**Tech Stack:** Next.js, React, CSS Modules, Web Audio, NextAuth Google, Supabase/Postgres, node:test.

## Accepted specification

- Levels 1–3 unchanged, free, ten seconds.
- Level 4: 15 seconds steady claps; level 5: 20 seconds steady claps; level 6: 20 seconds simple pattern (one gap each eight beats).
- Level 7: 25 seconds of the same simple pattern; level 8: 25 seconds adds occasional doubles to that pattern.
- Level 9: 15 seconds steady claps alternating two lanes. All levels remain 90 BPM with the same clap.
- Misses never stop a round; verify a missed-note round reaches the end at both the longest duration and the two-lane introduction.
- Signing in alone opens 4–6. Sequential best-score threshold 80 opens 7–9; lower later scores do not revoke access.
- Each locked card states its requirement and, when applicable, the prerequisite personal best. A prominent panel shows sign-in reward or next goal, with an action. After sign-in show the open 4–6 and Start level 4; after new score unlocks show the reward and Play action.
- Keep Google setup pending until explicit approval to save its prepared callback address. Do all other implementation and verification first.

## Task 1: Catalog and progression contract

Files: `src/components/beatfirst-preview/levels.ts`; `tests/beatfirst-preview-levels.test.ts`, `tests/beatfirst-preview-progress.test.ts`, `tests/beatfirst-preview-api.test.ts`, `tests/beatfirst-preview-local.test.ts` if affected.

- [x] Update meaningful catalog/unlock/API tests and run them to observe expected failures.
- [x] Implement nine-level catalog and immediate signed-in 1–6 access, followed by sequential 80 gates.
- [x] Update changed assumptions in regression tests, preserving security and duplicate-race checks at the new 6→7 gate. New signed-in API account must save level 4/5/6 without intros; lower replay cannot remove 7.
- [x] Verify tests; spec review then quality review.

## Task 2: Clear next actions

Files: `src/components/beatfirst-preview/BeatFirstJourney.tsx`, `Journey.module.css`; add a small `journey-guidance.ts` plus test only if useful for state branching.

- [x] Replace old intro-score messaging with explicit sign-in reward and later prerequisite score.
- [x] Add prominent next-step panel above level cards, grouped free/sign-in/earned sections, and readable requirements on cards. Make sign-in cards actionable; keep inaccessible later cards descriptive. Include numeric level labels.
- [x] Use personal-best progress toward 80, concise celebration for new unlocks, correct next/replay actions, and nine-level count.
- [x] Verify guest/new account/partial progress/all open/error states and keyboard/mobile layout. Do not auto-switch or interrupt active rounds.

## Task 3: Persistence and private deployment

Files: generated `supabase/migrations/*_beatfirst_nine_levels.sql`, migration regression test, `docs/beatfirst-progression-verification.md`.

- [x] Generate migration with Supabase CLI; expand named level constraint from 1–6 to 1–9 without touching records, grants, or RLS. Add PGlite regression coverage before implementation and verify.
- [x] Apply verified migration to academy project; confirm constraint and permissions.
- [x] Run `rtk proxy node --import tsx --test tests/beatfirst-preview*.test.ts`, scoped ESLint, and `rtk proxy node_modules/.bin/tsc --noEmit --incremental false --pretty false`.
- [x] Browser-check 375px and desktop, play new longest/two-lane rounds. Review implementation.
- [x] Deploy preview, point beatfirst-ceech.vercel.app to it, verify page/auth/API and database saving using isolated test identity. Delete only created test rows.
- [x] Record evidence and commit the change. Report private preview and the precise outstanding Google approval, if still pending.

## Review and compatibility

Plan, spec, and quality reviews complete. Same-level CTA reset and mobile keyboard ordering were corrected and verified. The preview has never had working Google OAuth, and the live attempts table was verified empty before this revision; guest levels 1–3 are unchanged. Legacy developer-only advanced-level queues are not migrated to the redesigned catalog.

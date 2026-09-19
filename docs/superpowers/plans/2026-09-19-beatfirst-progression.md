# BeatFirst Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Track steps with checkboxes.

**Goal:** Ship six playable preview levels, three free introductions, Google account saves and earned unlocks on the existing private mobile preview.

**Architecture:** A shared, deterministic level catalog drives audio, visuals, score replay and unlocks. The browser keeps unfinished save requests across sign-in; a NextAuth-authenticated API recomputes results from bounded tap records and saves to a dedicated Supabase table with RLS and no public grants. Existing BeatFirst production routes and result tables stay intact.

**Tech Stack:** Next.js App Router, React, Web Audio, NextAuth Google, Supabase Postgres, node:test/tsx.

## Approved product behavior
- Preview first, existing private address/password and dark blue/gold styling.
- 90 BPM throughout, four count-in claps, uninterrupted scheduled audio regardless of misses.
- Level 1 Find the beat: 10 seconds, 15 steady claps, one lane.
- Level 2 Keep the beat: 10 seconds, remove beats 3, 7, 11 (zero based); stay quiet during gaps and meet the next clap.
- Level 3 Catch the doubles: 10 seconds, steady notes plus half beats after beats 3, 7, 11.
- Level 4 Stay in the groove: 20 seconds of steady claps, one lane.
- Level 5 Follow the pattern: 20 seconds, repeating gaps and doubles, one lane.
- Level 6 Two-hand rhythm: 20 seconds, steady alternating left/right lanes, same clap sound. A new sound can follow later; preserve the original clap-only instruction.
- All three intros are always available to guests. Unlimited retries. Completing a round counts for the sign-in invitation regardless of score.
- Signed-in players unlock level 4 with best timing scores >=80 on all three intros, level 5 with >=80 on level 4, level 6 with >=80 on level 5. Clearly explain timing score includes timing accuracy and extra taps.
- Show personal bests, completed rounds, recent saved results, next unlock goal; never claim a save before server acknowledgement.
- Invite after all three intros, with Save my progress and Keep practicing. Existing sign-in available earlier. Transfer guest attempts across OAuth redirect. Show honest errors and retry.

## Contract and file map
1. `levels.ts`: Level `{id:number,title,description,durationMs,bpm:90,lanes:1|2,notes:{atMs,lane:0|1}[]}`; LEVELS readonly array, getLevel(id), PASS_SCORE=80, unlockedLevelIds(bestScores:Record<string,number>,signedIn:boolean):number[]. IDs 1..6.
2. `engine.ts`: Keep legacy exports/default level 1. Round gains levelId and durationMs; createRound(levelId=1), tapRound(round,elapsedMs,lane=0) match nearest eligible same-lane note. Export Tap `{atMs:number,lane:0|1}` and replayRound(levelId,taps) returns finalized Round. Same timing windows, weighted score/spam penalty, ordered finite bounded taps validated separately.
3. `audio.ts`: start(levelId=1), schedules catalog notes; same count-in/audible clock.
4. `progress.ts`: shared attempt validation and aggregate types. Attempt `{id:UUID,levelId,taps:Tap[],completedAt:ISO}`. Max 250 taps, batch <=25, payload <=128KB. Authenticated identity from verified Google subject only. Summary `{bestScores,completedLevelIds,attemptCount,recent:[{id,levelId,score,hits,total,bestStreak,completedAt}],unlockedLevelIds}`. Server time stores saved_at; completion timestamp bounded, not authorization evidence.
5. API `/api/beatfirst-preview/progress`: GET owned summary; POST `{attempts:Attempt[]}` => `{...summary,acceptedIds:string[]}`. Reject malformed or locked submissions; process in submitted order so batch intro imports can unlock later levels. Idempotent `(user_id,attempt_id)`, score computed by replay, no trust in client score/owner. Same-origin POST validation. Auth failures 401, locked 403, validation 400, transient DB 503.
6. `beatfirst-progress-store.ts`: server-only client using explicit BEATFIRST_SUPABASE_URL and BEATFIRST_SUPABASE_SERVICE_ROLE_KEY, falling back to the existing paired ATTENDANCE_SUPABASE_URL / ATTENDANCE_SUPABASE_SERVICE_ROLE_KEY configuration in the active academy database, then website config; never mix URL/key pairs. Account filters on every query. New `beatfirst_preview_attempts` table, indexed by user and saved time, RLS enabled, revoke anon/authenticated, grant service_role only. Keep preview data isolated by table.
7. `useProgress.ts`: restore bounded local guest queue/bests on mount; same-tab callback return and focus refresh session; fetch and flush owned pending saves; clear only acknowledged records; separate queues by Google subject so switching accounts cannot transfer another account's results. Claim guest queue upon either sign-in control (both express Save my progress intent), persist before redirect, preserve on failure. Storage failure warning. Serialized requests avoid races.
8. `ClapGame.tsx` game accepts levelId and onComplete/onActive props; round lifetime scoped to keyed mount; finished rounds reported exactly once. `BeatFirstJourney.tsx` owns level picker, progression, account UI and non-blocking post-intro invitation. Selector outside active play, game remains compact on phone. `Journey.module.css` for journey UI. Game two pads map F/J or left/right arrow; Space/Enter operate focused pad; allow multi-touch.

## Implementation and verification
- [x] Review plan for requirement gaps while inspecting auth/database access.
- [x] Add failing tests for catalog, nearest-note matching, wrong lane, level duration, unlock boundary; implement levels/engine/audio and verify existing tests.
- [x] Add failing tests for validation, replay scores, idempotent save, identity ownership, locked batch and import order; implement progress service/API and migration.
- [x] Implement guest/account persistence and level journey; add tests for acknowledged-only removal and account separation.
- [x] Adapt game to selected level, both lanes, completion callback and responsive journey layout.
- [x] Inspect/apply additive schema in verified account database; verify RLS and API read/write with disposable test record rolled back or narrowly removed.
- [ ] Verify OAuth callback uses private alias; configure if authorized/accessible, otherwise leave exact user-required setup documented and finish all independent work.
- [x] Run node tests, ESLint, focused TypeScript, and Vercel preview build. Full local typecheck has known unrelated attendance dependency failures.
- [ ] Browser: three intros, next/replay, doubles, two pads, mobile 375x667 and desktop; saved progress/unlocks and guest transfer, denied auth/invalid/locked API cases. Document any OAuth-dependent verification limitation accurately.
- [x] Spec review then quality review; address material findings.
- [x] Deploy preview only, retain alias beatfirst-ceech.vercel.app and ceech/ceech gate; verify protection, production unchanged, document deployment and tests.

Tests: `rtk proxy node --import tsx --test tests/beatfirst-preview*.test.ts`. Lint touched files via local eslint. All shell commands prefixed rtk. Do not commit unrelated work or main checkout changes.

Execution detail: progress-storage.ts serializes local mutations with Web Locks and retains unsaved additions; progress-request.ts includes JSON consumption in its timeout. Google callback approval and real OAuth browser verification remain pending. See docs/beatfirst-progression-verification.md.

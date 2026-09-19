# BeatFirst Clap Preview Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** A separate, sign-in-free preview at `/beat-first/preview`: one falling lane, 90 BPM, 15 clap notes during ten scored seconds, uninterrupted claps, four-beat count-in, timing feedback, hit count, best streak, and replay.

**Architecture:** A static Next.js route hosts a client game. A pure timing/scoring module handles the round independently from rendering. A small Web Audio controller schedules the entire short round in advance and provides the common audible clock for visuals and input. Existing BeatFirst, accounts, and progress remain untouched.

**Tech Stack:** Existing Next.js/React/TypeScript, CSS modules, native Web Audio; no new packages.

### 1. Timing and scoring
- [x] Add `tests/beatfirst-preview.test.ts`; run with `node --import tsx --test tests/beatfirst-preview.test.ts`, observe missing-feature failure.
- [x] Implement `src/components/beatfirst-preview/engine.ts`: 15 notes at `index * 60000 / 90`, ten-second duration, ±180 ms hit window, one hit per note, expiry of missed notes, streak reset, timing-weighted score penalizing stray taps. Accept the first note's early window during the count-in. Reject taps after the round ends.
- [x] Verify perfect rounds, all misses, early/late boundaries, repeated/stray taps, chronological miss expiry, and final note scoring. Run the same tests, expect all pass.

### 2. Audio and playable view
- [x] Add `audio.ts`: synthesize one consistent clap buffer, schedule four count-in claps and fifteen play claps, map audible audio time using output timestamps with latency fallback, cancel all sources on stop/replay/unmount. Resume audio from the Start gesture, report failure, and stop when the page hides or audio is interrupted.
- [x] Add `ClapGame.tsx` and `ClapGame.module.css`: idle/count-in/play/results/interrupted states, vertical lane with incoming blue notes and gold target, touch/pointer and Space/Enter input, repeat-key suppression, count-in demonstration, visual hit/miss feedback, countdown, score/hits/best streak and immediate replay. No microphone, music bed, additional levels, or account persistence.
- [x] Add `src/app/beat-first/preview/page.tsx` with preview metadata (`noindex`), link to existing game, and client component. Fit gameplay on small phones and desktop; preserve visible keyboard focus and reduced-motion feedback.

### 3. Verification and handoff
- [x] Run focused unit tests, ESLint on added TS/TSX, and TypeScript check; distinguish existing project failures.
- [x] Start isolated Next dev server; verify preview in desktop and mobile viewports, start/count-in/full round/results, misses, replay, keyboard, and interruption. Inspect browser errors and capture screenshot.
- [x] Review final diff for isolation and unchanged existing BeatFirst. Open the local preview for user review, report evidence and limitations. Do not deploy production.

Verification evidence and limits are recorded in `docs/beatfirst-preview-verification.md`. Interruption cleanup was code-reviewed; the in-app browser could not exercise a real hidden-page transition.

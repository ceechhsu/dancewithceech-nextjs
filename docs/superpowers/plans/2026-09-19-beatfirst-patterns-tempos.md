# BeatFirst Patterns and Tempos Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the independent catalog/audio task and reviews. Parent owns UI, practice rewards, migration, and private deployment. Track verification below.

**Goal:** Extend the tested private game to 18 gradually harder levels, with kick/clap lanes, 90/100/110 BPM, and clear replay goals.

**Architecture:** Preserve every existing level's note timing, lanes, duration, IDs, and scoring; only change level 9's left-lane timbre to kick. Append levels 10–18 and use the shared catalog for audio, count-in, validation, server replay, and sequential unlocks. Derive optional mastery/daily practice displays from existing personal bests and recent saved attempts, without a new persistence system.

**Tech Stack:** Existing Next.js/React/CSS Modules, Web Audio, NextAuth, Supabase, node:test/PGlite.

## Specification

- Guest levels 1–3, immediate sign-in levels 4–6, and personal-best 80 sequential unlocks remain. Extend those gates through 18; existing qualifying scores automatically unlock 10.
- Levels 1–8 are unchanged. Level 9 keeps its 15-second alternating notes at 90 BPM, with left kick and right clap. Every two-lane level uses that mapping, without depending on stereo headphones.
- 10: 20 seconds, 90 BPM, same alternating pattern as 9.
- 11: 20 seconds, 90 BPM, paired hands: repeating kick, kick, clap, clap.
- 12: 20 seconds, 90 BPM, same pairs with position 7 omitted in each eight-beat phrase (zero based).
- 13: 20 seconds, 100 BPM, same pattern as 12. 14: 25 seconds, 100 BPM, same pattern.
- 15: 25 seconds, 100 BPM, same pattern plus a half-beat kick after position 5 in each eight-beat phrase.
- 16: 25 seconds, 110 BPM, same pattern as 15. 17: 25 seconds, 110 BPM, adds a half-beat clap after position 6. 18: 30 seconds, 110 BPM, same pattern as 17.
- Every new note's full 180ms scoring window must end before the round duration. No simultaneous notes. Misses never interrupt scheduled sound. Four-beat count-in must use the selected level's actual tempo, in both audio and visuals.
- New model contract: `Sound = 'clap' | 'kick'`; `Level.bpm = 90 | 100 | 110`; `Level.sounds` is a one/two-item sound tuple. `getLevelTiming(levelId)` in engine returns `{beatMs, countInMs}`. Existing `BEAT_MS`/`COUNT_IN_MS` defaults remain for compatibility.
- Game header/cards show real BPM. Two-lane notes and pads are visually matched (gold kick left, blue clap right) and labelled KICK/CLAP; keyboard/touch continue to work. Teach the sound mapping before starting.
- Replay goals (proceeded with the stated default after optional clarification): stars for personal best 80/90/95; a small signed-in daily goal of 3 completed rounds, based on existing recent results in the player's local date, no penalties or notifications. Display goal loading until date is known, update on focus/midnight. Personal best and stars never regress. If user declines extras, omit this portion.
- Group 18 levels into chapters with clear tempo/pattern descriptions. Preserve source order intro/game/journey/account and explicit lock requirements.
- Extend only the private table's level constraint 1–9 → 1–18. Do not reset real saved progress. No changes to Google setup or production deployment.

## Task 1 — Catalog, audio, timing

Files: `levels.ts`, `engine.ts`, `audio.ts`, existing level/progress/API/local tests.

- [x] Add failing tests for 18-level catalog, unchanged old timing, gradual pattern relationships, tempo count-in, per-lane audio buffers, sequential gates through 18, and validation/replay.
- [x] Implement catalog, sound synthesis/scheduling, tempo helper; keep audio lifecycle/clock behavior intact.
- [x] Run focused tests; spec then quality review.

## Task 2 — Playable UI and replay goals

Files: `ClapGame.tsx`, `ClapGame.module.css`, `BeatFirstJourney.tsx`, `Journey.module.css`; optional new `practice-goals.ts` and meaningful tests.

- [x] Use catalog tempo and sounds for count-in, headers, note/pad styles, accessible labels, instructions, and feedback.
- [x] Add readable level chapters and retain next-unlock actions through 18.
- [x] Implement mastery stars and local-day 3-round goal from existing bests/recent results; test score boundaries, date boundaries, reload-derived totals, and replay suggestion.
- [x] Browser-check mobile/desktop and actual 90/100/110 BPM rounds including misses. Inspect audible kick/clap distinction with available audio verification; disclose physical-phone listening remains user check.

## Task 3 — Save, verify, publish privately

Files: new CLI-generated Supabase migration, migration tests, verification documentation.

- [x] Add migration regression that preserves existing level 9 data, accepts 10–18, rejects 19, and preserves private append-only access.
- [x] Apply migration to academy project; verify constraint and permissions.
- [x] Run all BeatFirst tests, scoped lint, full TypeScript, code review, browser checks. Remove temporary test harness before deployment.
- [x] Deploy preview only; verify saved attempts and unlocks through 18 with a disposable test identity, remove only its records, update existing short alias. Verify production unchanged and private controls preserved.
- [x] Record evidence and commit. Report user-confirmed prior login testing separately from automated checks.

## Outcome

Implemented and reviewed. All 76 tests, scoped ESLint, full TypeScript, mobile/desktop browser checks, and remote optimized build pass. Real deployed score persistence/unlocks through 18 pass with a disposable identity; its 16 rows were removed. Existing user progress and production deployment remain intact. Phone-speaker listening is left for the owner’s device check. Full evidence: `docs/beatfirst-patterns-tempos-verification.md`.

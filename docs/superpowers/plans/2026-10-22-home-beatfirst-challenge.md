# Centered BeatFirst Challenge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Preview a centered homepage BeatFirst demo with a fifteen-beat challenge and actual personal bests, locally in a new in-app browser tab, then wait for user approval.

**Architecture:** Remove the empty desktop grid column and retain the existing440px game. Add the chosen challenge copy above the unchanged level-one game. Derive independent best beats-hit and best timing score from completed sample attempts, held only during the current page visit and labelled accordingly. Preserve shared game mechanics, stop/replay, keyboard and full-trainer navigation. No account writes, tracking, leaderboard or new storage.

**Tech Stack:** Existing Next.js homepage, React/CSS modules, shared BeatFirst engine, node:test/tsx, local Next dev preview.

**Release constraint:** User explicitly requires local review BEFORE commit, push or deployment. Keep all changes uncommitted, start loopback preview, create a NEW IAB tab and wait for approval. No promotion or live website change.

### Task 1: Actual personal best

Files: add `src/components/beatfirst-preview/home-demo-best.ts`, `tests/home-demo-best.test.ts`; modify `HomeBeatFirstDemo.tsx`, its CSS and existing demo regression test.

- [x] Write failing behavioral tests for first actual result including zero, best timing/most hits retained independently across replay, worse attempts not lowering either and non-demo levels excluded.
- [x] Implement scoring through the shared engine. Display Your best after the first completed attempt, show beats/15 plus explicitly labelled timing/100. Label This visit; resets on refresh. Stopped/interrupted attempts do not create a best. No persistence or collection changes.

### Task 2: Center and invite

Files: modify `src/app/page.tsx`.

- [x] Replace the two-column grid/column-start with one centered stack; shared center line for heading, instruction, game and link. Use existing typography/palette, controlled440px game width and smaller24–32px gap.
- [x] Add agreed Can you hit all15beats? hook, retain concise timing instruction and real Play/Stop/Continue mechanics. No speculative global score or fabricated result.

### Task 3: Local verification and review

- [x] Focused behavior/engine/homepage tests, typecheck, changed-file lint and production build as appropriate. Identify unrelated stale baseline tests separately.
- [x] Independent review and fixes, then run local preview on a free loopback port using inert service configuration and no production credentials.
- [x] Open a NEW IAB tab. Visually verify desktop center/first visit, complete a real local round and verify personal best, replay retention, Stop behavior, phone width and keyboard access. Leave a clean initial local preview visible, save screenshot and report that approval is pending.
- [x] Stop before any commit, push or deployment; wait for the human's approval.

## Release approval

On October 22, after testing the local preview, the user approved the current per-visit best behavior and explicitly authorized commit, push and deployment. The post-round prompt is “Can you beat your best?” beside actual best hits and timing. Signing in does not change the sample’s score lifetime. Final release verification and production status are recorded separately.

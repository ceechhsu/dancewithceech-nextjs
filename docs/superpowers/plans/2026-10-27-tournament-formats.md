# Classroom Tournament Formats Implementation Plan

> **For agentic workers:** Execute inline with test-first checks and a focused plan review. Preserve all existing uncommitted classroom work. The user authorized implementation and an isolated preview deployment; no live database or production release.

**Goal:** Instructor hosts single or strict double elimination, with optional timed signup, manual early closure, optional instructor entry, automatic draws/advancement, and phone result confirmation.

**Architecture:** Add a service-only competitor registry (student enrollment or verified instructor identity) without adding instructors to the class roster. Preserve old tournaments on their existing engine. New tournaments use a fixed source graph: upper winners advance; upper losers feed lower; lower losers exit; grand final resets if the lower finalist wins. Resolve empty feeds/byes without counting them as played matches or losses. The existing class transaction lock serializes closure and results. Deadlines are enforced on every relevant request and polling draws expired signup automatically. No background scheduler is needed for the preview.

**Tech Stack:** Next.js, React, TypeScript, PostgreSQL PL/pgSQL, browser PGlite, Node test runner, Playwright Chromium.

## Accepted behavior

- Instructor chooses single/double elimination, title, game, instructions; optional timer defaults to five minutes (1–120 minutes), or manual signup only. Close manually at any time.
- Closing signup (timer or manual) freezes eligible entrants and builds the bracket automatically. Fewer than two entrants ends signup with a clear no-draw message.
- Instructor can join/leave as themself; no enrollment or attendance record is added. Instructor competition results use opponent confirmation too; instructor can directly resolve other students’ matches.
- Random seed once, spread initial byes, fixed subsequent pairings. A double-elimination player exits after two played-match losses. Championship reset preserves that rule.
- Show personal next opponent, loss status, main/second-chance/championship board, champion/history. Multiple tournaments per day remain supported.
- Preserve previous local preview rounds and tournaments through a transaction-wrapped upgrade. Preview remains fictional and local to one browser.

## File responsibilities and tasks

- [x] Write failing `tests/archery-tournament-formats-db.test.mjs` and extend request tests. Cover both formats, sizes 2–64, byes, peer confirmation/disputes, deadline/manual closure, instructor privacy/self-entry, retries, cancellation and access control. Run and confirm missing-feature failures.
- [x] Implement additive `supabase/migrations/20261027164537_archery_tournament_formats.sql`: registry, source graph and advancement helpers, legacy fallback, validated RPC wrapper. All tables RLS, browser roles denied, service-only invoker functions. Run database tests and inspect grants.
- [x] Update `src/lib/archery/types.ts` and `request.ts`. Validate and whitelist format/timer options; add tournament-specific current competitor ID without changing practice/challenge identity.
- [x] Update `Tournaments.tsx`, split `TournamentBoard.tsx` and bracket helpers as needed. Keep existing tokens, bounded phone round tabs, clear registration status and optional instructor signup. Extend `MatchResult.tsx` for instructor playing versus managing.
- [x] Wire migration into preview page, transaction upgrade, output tracing, database/browser fixtures. Test older saved data, no roster changes, reload.
- [x] Add phone browser flow for manual/timed hosting, instructor opt-in, student joins, close/draw, double elimination through reset/champion, plus regression scoring/challenges. Inspect phone/tablet/desktop screenshots.
- [x] Run focused regressions, lint, typecheck and production build. Update docs; stage only classroom sources; deploy preview, preserve stable alias/share token, verify hosted flow, generate/display QR.

## Verification commands

Use `rtk proxy node --import tsx --test --test-concurrency=2 tests/archery-*.test.*` for database/request checks; `rtk proxy npm run lint -- <touched components>` and `rtk proxy npx tsc --noEmit` for static checks. Run `rtk proxy npm run build` after stopping dev server. Run new and existing browser flows locally and the new tournament flow against the protected hosted preview.

## Risks to audit

Source dependencies must distinguish an empty resolved bye from an unfinished match; a bye must never emit a loser. Grand-final reset must be conditional and idempotent. All registry lookup must bind class and verified email+subject, never body identity. Removed students must be excluded before draw. Existing old brackets and all private personal scores must survive schema upgrade. Expired signup must never accept a late entrant. No production migration, production alias or broad protection-setting change.

Review findings addressed: include deadline-closed rows from legacy list; bind instructor self-match checks to email as well as subject before management bypass; preserve old registry names for enrollments added after upgrade; validate retry options; run complete graph invariants and injected-failure rollback. Final independent code review approved after fixes.

Final verification: all 90 checks, lint, build, real signed-in HTTP, hosted browser tournament flow and existing-profile upgrade passed. Preview deployment dpl_3UmraQqftwduZeyrL5cETZr31Xb9 is Ready on the stable alias. Sharing link retained and QR generated. Live database/production unchanged.

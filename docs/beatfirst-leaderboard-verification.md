# BeatFirst level leaderboards — 2026-09-19

Adds an all-time Top 10 to each of the 18 existing levels. Anyone can view; a verified signed-in player explicitly chooses a public name before their saved personal bests appear. Each player gets one entry per level, tied scores share competition ranks, and the current player's row is highlighted. Results link to the completed level's board with a personal-best indicator.

## Live release

- Application commits: `c0fa246`, followed by invitation-copy clarification `26e11fd`.
- Final production deployment: `dpl_EnkiKYE1KBFs652nWLjCud7dKyEa`, `https://dancewithceech-nextjs-6ntidxlpr-ceechhsus-projects.vercel.app`, promoted to **https://dancewithceech.com/beat-first**.
- Full production API workflow was verified on `dpl_3adkJKkKstpKr3MPTYeyBx71xhWP`. The final build changes only one invitation sentence; it also passed the optimized build/TypeScript, anonymous API check and final live account/browser checks.
- Built with production configuration using `vercel deploy --prod --skip-domain --yes`; no secret export or preview overrides.
- Rollback: `dpl_DEDuE8CPv5HQQombXrfdmniuAsjg`, the previously launched 18-level game.
- Existing engine/audio/score calculation, progress API, unlocks, local progress key, attendance logout safeguard, and private preview configuration remain unchanged.

## Data and privacy

- Migration `20260920043626_beatfirst_leaderboard.sql` adds an empty opt-in profiles table and a service-only invoker ranking function. It was created with the CLI, then its filename was aligned with the actual MCP-applied migration-history version.
- No existing Google account name/email is published and no profile is automatically created. Public entries contain only chosen display name, score, rank and an own-row boolean; no account identifier or timestamp is returned.
- Names are 3–20 ASCII letters/numbers/spaces/dots/underscores/hyphens, normalized and case-insensitively unique. Players can rename, hide, and rejoin without deleting progress. Hidden profiles keep their reserved name.
- One saved best per listed player is selected before ranking. Scores sort descending; ties order by the server time the best score was first saved, then stable owner identity. Shared ranks are computed using score alone, before the ten-player cutoff.
- Production SQL verification in a rolled-back transaction confirmed per-player bests, tied rank 1, hidden-profile exclusion and level isolation. No fixture rows from that transaction remain.
- Live catalog checks confirmed RLS on, SECURITY INVOKER, no direct table or RPC access for `anon`/`authenticated`, and RPC access for `service_role` only. Existing attempt permissions are unchanged.
- Security advisors added only the expected informational RLS-with-no-policy note for this server-only table. The two pre-existing warnings about `rls_auto_enable` are unrelated and unchanged; see the [Supabase advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## Automated and browser verification

- 147 tests passed, including 30 new leaderboard tests. New rules, HTTP behavior, requests, SQL and adapter tests were observed failing before implementation, then passing.
- Tests cover ranking/limit/tie ordering, old bests after opt-in, rename/hide/name conflicts, permissions, verified ownership, same-origin writes, private-field filtering, malformed/oversized bodies, safe database errors and stale request cancellation.
- Full TypeScript, scoped ESLint and whitespace checks passed. The Vercel optimized build and TypeScript also passed with 138 static pages; no fixture routes appear in the release build.
- Independent plan, specification and code-quality reviews approved the feature. The quality reviewer independently reran all 30 leaderboard tests successfully.
- Browser checks used isolated local test data and the actual UI/HTTP handlers, because the local preview has no live database credentials. No real player profile was enrolled for browser testing.
- At 375×667, the game and leaderboard fit without horizontal overflow. At 1280×900, the leaderboard sits below the game beside the level journey. The results button scrolls/focuses the selected level's board.
- Verified guest viewing, empty boards, ten rows from more than ten players, shared ranks, all-level browsing including locked levels, rapid level changes, and a personal best of 95 shown outside the Top 10.
- Verified explicit joining with a chosen name, case-insensitive name conflict feedback, rename, hide, rejoin and preserved saved progress. Another account got a blank name form, no prior profile controls and no incorrect own-row marker; guest mode also had no profile controls.
- Played a full 15/15-hit round for the disposable test player, scoring 100. After saving, the board refreshed and showed that player highlighted at shared rank 1, with Your best: 100.
- Temporary browser fixture routes/stores were removed from source and both API routes restored to production stores before commit/deployment. Source scan found no fixture imports or sample-player names.
- A development-only module-name collision was resolved by naming the shared types/validation file `leaderboard-model.ts` and component `LevelLeaderboard.tsx`; fresh production compilation passes.

This remains a casual rhythm-practice leaderboard. Scores use the existing server replay of submitted taps; no claim of tamper-proof competition or prizes is made.

## Staged and live verification

- Staged production HTTP checks passed anonymous viewing, exact public field shapes, invalid levels, authenticated enrollment, existing bests appearing on opt-in, shared first-place ranks, own-row highlighting, case-insensitive name conflicts, cross-origin/owner rejection, email-name rejection, rename/hide/rejoin, score improvement after a newly saved attempt, per-level isolation, and unchanged personal progress after hiding.
- The seven staged test attempts and three test profiles were removed by exact disposable subject IDs before promotion. A follow-up query confirmed zero remain. No real player scores or profiles were changed.
- Public access checks passed on staged and live deployments: new leaderboard and existing 18-level game present, no fake player names in release HTML, temporary fixture/private preview routes return 404, authenticated progress boundary retained, homepage intact and production Google callback unchanged.
- Final live anonymous leaderboard GET returned HTTP 200 with an empty board after cleanup. Boards begin honestly empty until players choose to join.
- On the live page, the owner's existing session loaded 23 saved rounds and all 18 levels, with level-1 best 93. The public-name field remained blank, with an explicit Join leaderboard button. No real account was enrolled by these checks.
- Live browser console and the inspected final-deployment error/fatal runtime-log window were clean.
- Source was fast-forwarded into main. Existing unrelated homepage/design edits retained the exact hashes recorded before integration; they were not included in this release.

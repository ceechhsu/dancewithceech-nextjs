# Instructor Resolution of Result Disputes

**Goal:** A dispute in a classmate challenge or tournament match tells both players to find the instructor, preserves the reported result, pauses changes/advancement, and lets the owning instructor decide the winner.

**Architecture:** Add a service-only RLS audit table keyed uniquely to a challenge or match. Wrap the existing trusted RPC, retaining its class lock and existing identity checks. False confirmation creates one pending dispute without clearing the original proposal/notes. Pending disputes reject further result/confirmation mutations and student cancellation. A new instructor-only `dispute_resolve` action validates the two players, saves the decision and audit identity, and completes the challenge or uses the existing bracket advancement helper. Exact resolution retries are idempotent; conflicting retries cannot overwrite a decision. Instructor cancellation closes outstanding disputes without a winner. Safe dispute summaries augment existing row lists; a class-scoped instructor queue includes pending disputes beyond ordinary history pagination.

**Design:** Both players see “Result disputed. Please find your instructor together so they can decide the winner.” The instructor gets a global Resolve disputes shortcut and a queue with both names, game/tournament, original reported winner/notes, winner selector and optional decision notes. Inline challenge/match controls use the same resolution component. Decisions remain visible as “Resolved by instructor” with the winner. Only the disputed match pauses; other ready tournament matches continue. An opted-in instructor may explicitly resolve a dispute in their own matchup, consistent with the user's request that the instructor decides; a mismatched instructor provider subject still cannot resolve their old competitor's match.

- [x] Write failing DB/request tests: both kinds, both reporting directions, participant-only dispute, paused writes, instructor-only decision, invalid winner, exact/conflicting/concurrent retries, cancellation/archive, double-elimination/legacy advancement, privacy, queue pagination, immutable snapshots and upgrade rollback.
- [x] Implement additive migration with service-only invoker functions; bind all reads/writes to trusted class ownership/enrollment. Do not expose audit actor emails/subjects in any response.
- [x] Extend request whitelist/types/API instructor guard; add shared dispute panel, instructor queue/shortcut, pending/resolved notices and disable ordinary controls while disputed.
- [x] Upgrade browser preview transactionally in place; include migration in tracing and disposable fixtures. Preserve existing data.
- [x] Verify both phone dispute flows, both parties' messages, instructor queue/decision, automatic bracket advancement, saved decisions/reload and responsive layouts. Update earlier dispute tests to use instructor resolution.
- [x] Run regressions, lint/typecheck/build and signed-in local HTTP checks, review implementation, publish isolated preview, preserve alias/share link/QR, verify hosted flow. No live DB or production deployment.

**Key files:** new migration; `src/lib/archery/{types,request}.ts`; API route; `DisputePanel.tsx`, `DisputeReview.tsx`, `Challenges.tsx`, `MatchResult.tsx`, `TournamentBoard.tsx`, `ArcheryHub.tsx`, preview bootstrap/page/config; new DB/browser tests and updated classroom fixtures.

Independent review approved. DB coverage includes history pagination, legacy pending-result upgrade and failure rollback, stale writes, exact/conflicting/concurrent retries, cancellation races and provider-subject binding. Phone flow and full double-elimination/timer regression passed locally; 96 automated checks pass.

Production build, TypeScript, lint, and real signed-in HTTP verification passed. Both challenge and match disputes reject student decisions and stale confirmations, and instructor decisions complete/advance the actual result. All 96 regression checks pass. Awaiting hosted preview verification.

A hosted regression exposed that automatic round advancement hid the ruling in an earlier bracket tab. Added a personal decision summary above the next opponent/elimination status; the regression fails without it and passes with it for both players. Final build and lint pass. Existing hosted profile upgrade retained student X and private instructor M history.

Final hosted dispute and student-home checks pass on deployment dpl_4UGmMZabSnpjJVbXEyHuxbS3qM9V. Stable alias/share link/QR preserved, existing browser history upgraded safely, local services stopped, live DB/production untouched.

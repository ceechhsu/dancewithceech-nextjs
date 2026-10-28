# Archery modes and phone preview

**Goal:** Extend the enrollment-controlled class app with individual arrow scoring, accepted/declined class challenges, and randomized single-elimination tournaments; provide an isolated phone preview before releasing to students.

**Architecture:** Service-only invoker RPC validates the existing Google identity and active class enrollment. Individual rounds are private. The class challenge roster exposes names and IDs only. Challenges require opponent acceptance and result confirmation (or instructor adjudication). Instructors create tournament draws and record winners. Matches, byes and advancement are transactional. The demo uses fictional students and an isolated browser database executing the same SQL and UI, without server credentials or live records.

**Bracket decision:** Use the next power of two, with first-round byes distributed through mirrored seed slots. Randomize the entrant order, rather than rewarding historical scores. No bye-vs-bye matches. Draw is saved once; results are idempotent and cannot overwrite completed matches. A tie must be resolved before a winner advances.

**UI direction:** Reuse the attendance dark surfaces and blue controls. Phone-first mode buttons, large arrow score fields, clear incoming invitations, and horizontally scrollable labeled bracket rounds. Keep private individual practice visually distinct from class-visible competition.

- [x] Write failing PostgreSQL tests for scores, own-record isolation, peer visibility, challenge state transitions, instructor ownership, malformed/cross-class inputs, arbitrary field sizes and byes.
- [x] Implement migration and validated HTTP endpoint without changing live schemas.
- [x] Build shared scoring/challenge/bracket UI and integrate into the archery class section. Preserve legacy journal records and workout UI.
- [x] Build a fictional, resettable preview using the same UI and rules. Verify mobile interactions, challenge acceptance, result confirmation, brackets with 7/10/12 entrants and a champion.
- [x] Run attendance regressions, lint, typecheck, build, and production browser verification. Prepare a phone-accessible preview and document remaining live release steps.

**Defaults and limits:** Five arrows initially, editable 1–100; distance always chosen by the user in meters or yards. Numeric arrow scores 0–10 with 0 labeled a miss. Optional game/result notes; a challenge/tournament can record only the winner. In-app invitations update while the app is open, with no email or device push in this version. Tournaments support 2–64 currently enrolled participants. No new domains or production release.

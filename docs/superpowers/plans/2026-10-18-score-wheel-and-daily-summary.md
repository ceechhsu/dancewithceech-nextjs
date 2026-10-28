# Archery Score Wheel and Daily Summary Implementation Plan

> Execute inline in the existing reviewed classroom workspace; preserve unrelated changes. Plan review is advisory. No production deployment or real database migration is authorized.

**Goal:** Let students spin a target-colored wheel to enter M, 1–10 or X and review all saved rounds immediately after selecting a calendar date.

**Architecture:** Add a reusable score-mark model and a focused ScoreWheel dialog, retain numeric totals alongside exact M/X marks, and render a DailyPracticeSummary above the selected date’s mode buttons. Extend the existing service-only RPC with an additive migration, upgrading fictional browser databases in place. Update only the stable preview alias after testing.

**Tech Stack:** React/Next.js, CSS modules, native dialog and pointer events, PostgreSQL RPC, PGlite for isolated preview and tests, Playwright phone-size verification.

**Design brief:** Students are standing at a range, entering an end of arrows and checking prior ends. Domain: rings, center X, miss, arrows, rounds, distance, scorecard. Use the requested white, black, blue, red and yellow target colors with a neutral M. The circular dial has a fixed top pointer, snapping selection and a prominent exact mark/point value; X starts at the top. Reuse the existing dark surfaces and type, 8px rhythm, 44px touch targets and clear focus. Keep exact labels alongside colors. A compact date table leads with total and includes distance, arrow count and each score. Avoid keyboard-only number entry, a summary hidden below the form and color-only identification.

- [x] Reproduce date-history bug and add failing score-mark, request and database tests. Assert M=0, X=10 but retained as X; reject inconsistent marks/scores and mutations of saved marks.
- [x] Add src/lib/archery/scores.ts for exact marks, points, target colors and rotation selection. Add migration, RPC/HTTP validation and preview schema upgrade; retain numeric-only client compatibility and previous data.
- [x] Add src/components/archery/DailyPracticeSummary.tsx to ArcheryHub above modes: date-scoped table of rounds with totals, distance/unit, count, marks and instructor-only student names. Show an explicit empty state; do not require selecting Individual scoring.
- [x] Add ScoreWheel.tsx: touch/mouse drag rotation, top marker, snap on release, keyboard alternatives and previous/next controls, exact mark confirmation, clear cancel, reduced-motion support. A score button for each arrow opens the wheel, confirms once and advances to the next arrow.
- [x] Update PracticeRounds entry/history and browser tests. Test changing count, editing a score, cancel without recording, all ring colors, M/X totals and retained labels, date table visibility, separate dates, reload and existing tournament/attendance flows.
- [x] Verify local tests, lint, build, mobile/desktop screenshots and full signed-in HTTP fixture. Deploy isolated Preview only, reassign existing stable alias, verify old-browser upgrade and hosted phone workflow, publish completion in chat with the same phone link/QR.

Plan review incorporated: date-specific round retrieval and calendar counts cover all history rather than the previous 500-round list, with tests exceeding 500 both overall and on a date. Independent score-schema detection runs an atomic upgrade in the same IndexedDB database. Legacy zero becomes M and ten remains ten. Native dialog focus, keyboard alternatives, cancel/escape, touch cancellation, edit reopening and blank-versus-initial-X behavior are exercised in browser checks.

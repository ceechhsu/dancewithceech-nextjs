# BeatFirst preview verification — 2026-09-19

Preview route: `/beat-first/preview`

Implementation: isolated branch `codex/beatfirst-preview`, native Web Audio, no new dependencies. Four count-in claps followed by fifteen evenly spaced clap notes at 90 BPM over ten scored seconds. Notes, inputs, and scoring use the same audio clock. Existing BeatFirst and account/progress code are unchanged.

## Passed

- Nine timing/scoring tests: `node --import tsx --test tests/beatfirst-preview.test.ts`.
- ESLint on the new route, component directory, and tests.
- Focused TypeScript check for the new game and tests.
- Local Next.js route compilation and browser load, with no browser warnings or errors observed.
- Desktop and 390 × 844 / 375 × 667 responsive views; no horizontal overflow, target fits in the smaller phone viewport.
- Full missed round reaches results normally.
- Live keyboard round: fifteen hits, best streak fifteen, score 100.
- Live pointer round: fifteen hits, best streak fifteen, score 100.
- Replay resets counters and schedules a fresh count-in/round.
- Results retain their title and controls after focus changes. An initial internal scrolling issue was corrected with `overflow: clip` on the field and note layer.
- Independent implementation review found no material actionable issues.

## Limits

- Full-site TypeScript checking reports the same six pre-existing attendance errors on both the original checkout and this branch: missing `qrcode.react`, `web-push`, `papaparse`, and `xlsx` dependencies, plus two related type errors. No preview-file errors remain. A full production build is not claimed.
- Tests used the desktop browser with phone-sized viewports, not physical iOS/Android devices or Bluetooth audio. Device-specific audio latency still needs hands-on testing.
- Page-hide/audio-interruption cleanup was reviewed in code. The in-app browser keeps background test tabs visible, so opening another test tab did not exercise the actual visibility-change branch.
- Local preview only; no production deployment or merge.

## Run

From this worktree: `node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port 3107`.

Open `http://127.0.0.1:3107/beat-first/preview`.

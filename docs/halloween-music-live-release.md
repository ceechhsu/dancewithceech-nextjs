# Halloween music-and-dance release — October 27, 2026

The user explicitly approved the full-music local preview and authorized deployment. It is live at https://dancewithceech.com. This record supersedes the earlier flat, animated-only, and local click/Boo preview records.

## Release and preserved source

- Runtime commit: `cbd0d759a87f549ab9e889265de5b4ad11acaf1f`.
- Source branch: `codex/halloween-music-live-2026-10-27`, pushed to the existing GitHub repository.
- Current deployment: `dpl_3yYB3V5fCNHT7BQQjskmWeAHHSaL`, https://dancewithceech-nextjs-fs9r0dc8s-ceechhsus-projects.vercel.app.
- Project/team: `prj_SNzeOyEluIN9UBuYmAMGqDxZd9yL` / `team_oTY5dC1X8SnhEdyDYoMniCQR`.
- Production base and rollback: commit `bb74caf077d75f8b9b5cdff1fc50d91821446ae9`, deployment `dpl_B3fE18n96YhcPBfenuQqFKw3kHBL`, https://dancewithceech-nextjs-itdvg0vjy-ceechhsus-projects.vercel.app.
- A concurrent classroom release reached production during staging. The first candidate was not promoted. The Halloween change was replayed on the newer live source, preserving instructor/student archery challenges, navigation, monthly review snapshots, and all other existing functionality. The eight approved Halloween files remained unchanged by that integration.
- Built remotely from a clean Git archive with existing production settings and explicit source metadata, using `vercel deploy --prod --skip-domain --yes`. Authenticated staged checks passed. A final source guard confirmed the expected live base before connected-tool promotion. The live-domain lookup then confirmed the new deployment and runtime commit.
- No environment, database, migration, or account changes were made. Local placeholder credentials, local feed gateway, raw reference downloads, original generated art, transcripts, and unused short Boo were excluded from the clean release.

## Interaction

Click/tap any pumpkin-and-ghost scene to play the user-selected entire instrumental clip once and make that scene dance. Click it again to stop. Selecting another scene transfers playback; one shared player prevents overlap. Native playback events synchronize dancing, including natural completion and buffering/pause. Space/Enter works; reduced motion disables the dance while retaining intentional music playback. No autoplay or looping. Hide and navigation stop playback.

Music is `public/halloween-v2/halloween-music.mp3`, stereo 44.1kHz/128kbps, 11.215 seconds and 180,602 bytes, at 35% player volume. It is the full audio selected by the user from https://youtube.com/shorts/Z5YkmP-aIQQ, normalized gently with 30ms edge fades. The existing generated dimensional pumpkin/ghost artwork remains unchanged.

## Exact automatic cutoff

The one-time season ends at **November 1, 2026, 12:00 a.m. America/Los_Angeles**, encoded as `2026-11-01T00:00:00-07:00` / `2026-11-01T07:00:00Z`. This is before the daylight-saving change later that morning. It does not recur next year.

The client schedules the boundary and rechecks on focus/visibility changes. At expiry the scenes and controls unmount, playback is paused/reset, and dancing stops. The playback-start handler independently rechecks the date, preventing delayed audio loading from starting after expiry. Cached server HTML starts undecorated. No recurring automation, cleanup deployment, or user action is needed for expiry.

## Validation

- Fresh changed-file/browser-check ESLint and whitespace checks passed. Twenty-four focused date, homepage, navigation, BeatFirst and current archery-navigation tests passed. Prior source review of the interaction found no blocking issues.
- Vercel build compiled, type-checked and generated 144 static pages successfully with the preserved classroom routes.
- Authenticated staged homepage and music returned 200; MP3 hash matched the approved asset. The public lesson feed returned 40 lessons. The deployed JavaScript contained the full-music controls, exact cutoff and visibility recheck.
- Actual Chrome against the live public domain passed full duration, continued dance beyond the initial greeting, second-click stop, scene handoff, single-player behavior, natural-end reset, keyboard, hide/show, touch start/stop, no mobile overflow and reduced motion.
- With live code at November 1 06:59:59 UTC and long music actively playing, advancing the browser clock one second paused/reset the audio, removed dancing controls and decorations, and returned the page to its regular appearance in the already-open tab.
- No browser page errors. Deployment-scoped error/fatal runtime log query over the inspected 15-minute window returned no logs.

Screenshots and reusable browser checks: local `docs/halloween-music-live/` and `tests/browser/halloween-click.mjs`. The local preview remains running at http://127.0.0.1:3101/?preview=halloween-music. Existing live-site tabs may need a refresh to load this new release.

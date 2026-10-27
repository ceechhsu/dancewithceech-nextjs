# Halloween homepage release — October 26, 2026

The user approved the local preview and explicitly authorized deployment on October 26, 2026. The light Halloween decoration is now live at https://dancewithceech.com.

## Source and deployment

- Runtime commit: `a712e59b1705a95d40294bee5ae75d3cc815b5b6`.
- Source branch: `codex/halloween-local-preview`, pushed to the existing GitHub repository.
- Base: exact previous production commit `855ad47950016b5fa78e597fffc1c651100232d2`.
- Project: `prj_SNzeOyEluIN9UBuYmAMGqDxZd9yL`, `dancewithceech-nextjs`, team `team_oTY5dC1X8SnhEdyDYoMniCQR`.
- New production deployment: `dpl_Aj8sPGS24BdL6A7WLaDUxzXK4zkN`, https://dancewithceech-nextjs-kg2ekpwg9-ceechhsus-projects.vercel.app.
- Rollback deployment: `dpl_9k6oJw6og8TxJZ31vZB3E4HmNdaN`, https://dancewithceech-nextjs-nuav1sw7e-ceechhsus-projects.vercel.app.
- Built remotely with existing production settings using `vercel deploy --prod --skip-domain --yes`, then promoted with the connected Vercel tool after build and authenticated staging checks. A subsequent lookup of `dancewithceech.com` returned the new deployment ID.
- No placeholder local service settings or local playlist gateway were deployed. No environment settings, database records, or external messages were changed.

## Automatic end

The fixed seasonal window ends at `2026-11-01T00:00:00-07:00`, equivalently November 1 at 07:00 UTC. This is midnight in America/Los_Angeles, before daylight saving ends later that morning. It does not recur in future years. The browser schedules removal at the boundary and rechecks after focus/visibility changes for sleeping tabs. Cached server HTML starts undecorated, so it cannot preserve the seasonal appearance after the client sees the end of the window.

## Validation

- Fresh focused tests: 17 passed, including exact date boundaries, no annual recurrence, safe timeout scheduling, homepage layout, BeatFirst demo and navigation.
- Changed-file ESLint and whitespace checks passed. Prior local build/type checking and independent review passed.
- Vercel production build compiled, type-checked, and generated 142 static pages successfully.
- Authenticated staged HTTP checks: homepage 200, decoration SVG 200, lesson feed 200 with 38 public lessons. The deployed JavaScript bundle contains the exact start/end instants, hide control, and suspended-tab recheck.
- After promotion, actual Chrome checked the live public site at desktop 1440×1000 and phone 390×844: decorations visible on the current date, original headline/booking destination, lesson cards, hide/show, reduced motion, no phone overflow, mobile menu, FAQ, and BeatFirst start/stop.
- A browser clock simulation using the live deployed code at November 1 06:59:59 UTC verified that advancing one second removes both decorations and control from an already-open tab. The hero pseudo-element then has `content: none`. A 2027 date did not reactivate decorations.
- Browser page errors: none. Vercel runtime log query scoped to this deployment for error/fatal entries in the inspected 15-minute window returned none.

Live screenshots and machine-readable results are retained locally in `docs/halloween-live/`. The local review remains available at http://127.0.0.1:3101. Local preview notes in `docs/halloween-preview/README.md` describe the earlier approval stage and are superseded by this release record.

The staging share-link request was rejected by automatic approval review because it would grant broader access. No share link was created; normal authenticated Vercel HTTP access was used instead. Browser verification ran against the public domain after promotion.

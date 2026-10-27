# Animated Halloween release — October 26, 2026

The user explicitly approved the animated local preview and authorized deployment. It is live at https://dancewithceech.com.

- Runtime source: `f22ee4165f18662881ccb35e5d4961645fc03fff`, branch `codex/halloween-depth-preview` (pushed).
- Deployment: `dpl_7iupkptE2NmVY31X3HQrkJkLNzeo`, https://dancewithceech-nextjs-31q3p1898-ceechhsus-projects.vercel.app.
- Project: `prj_SNzeOyEluIN9UBuYmAMGqDxZd9yL`; team: `team_oTY5dC1X8SnhEdyDYoMniCQR`.
- Rollback: original regular-site deployment `dpl_9k6oJw6og8TxJZ31vZB3E4HmNdaN`, source `855ad47950016b5fa78e597fffc1c651100232d2`.
- Release built from a clean Git archive, with existing Vercel production settings and explicit commit metadata. Local service placeholders, the local playlist gateway, original generated PNG, and untracked review artifacts were not included.
- Used `vercel deploy --prod --skip-domain --yes`, verified authenticated staged responses and the deployed cutoff, then promoted through the connected Vercel tool. Domain lookup confirms the new deployment ID and runtime commit.

Three small dimensional pumpkin-and-ghost scenes animate gently on the homepage: lower introduction, near Meet Ceech, and above the footer. Motion is staggered (7/9/8.5-second cycles, 4–7px lift, ±1 degree). Hiding decorations removes animation; reduced motion disables all seasonal movement. Web artwork is a 51,198-byte transparent WebP. Existing content and navigation are unchanged.

## Automatic removal

The one-time window ends at **November 1, 2026, 12:00 a.m. America/Los_Angeles**, encoded as `2026-11-01T00:00:00-07:00` / `2026-11-01T07:00:00Z`. This is before the DST change later that morning. It does not recur next year. An active tab schedules the exact boundary; suspended tabs recheck on focus/visibility changes. Server HTML defaults undecorated, so cached HTML cannot retain decorations beyond the client cutoff. No recurring automation or follow-up deployment is required.

## Verification

- Fresh 17 focused tests, changed-file ESLint, and whitespace checks passed; independent code review found no blocking issues.
- Vercel build compiled, type-checked, and generated 142 static pages successfully.
- Authenticated staged homepage, art, page bundle, and teaching feed all returned 200. Artwork hash matches the approved WebP; feed retained 38 lessons; compiled browser code contains the exact date instants and visibility recheck.
- On the live site, actual Chrome verified three moving scenes at 1440×1000, 390×844, 320×568, and 844×390. Four sampled animation positions stayed clear of content; no horizontal overflow; hide stopped movement; reduced motion disabled float and glow.
- Live desktop/mobile checks verified headline, public lessons, booking destination, mobile menu, FAQ, and BeatFirst start/stop.
- Live-code clock simulation at November 1 06:59:59 UTC found all three animations active. Advancing one second removed decorations, hide control, and all three float animations from the already-open tab. A 2027 date did not reactivate the decoration.
- No browser page errors. Deployment-scoped error/fatal runtime query over the inspected 15-minute window returned no logs.

Live screenshots and machine-readable browser results are retained locally in `docs/halloween-animated-live/`. The local preview remains available at http://127.0.0.1:3101/?preview=halloween-animated. Earlier local and reverted-release documents describe prior states; this record is the current release.

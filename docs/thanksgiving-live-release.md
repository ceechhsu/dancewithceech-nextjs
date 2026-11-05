# Thanksgiving production release — November 4, 2026

User approved the dimensional turkey/pumpkin local preview and explicitly authorized commit, push, and deployment with an automatic December 1 Pacific cutoff.

## Deploy result

- URL: https://dancewithceech.com/
- Target: production; status: READY.
- Framework: Next.js 16.3.4, Node.js 24.
- Runtime source commit: `6a2641c9f0342a455129b9a6c36ee098dbee4421`.
- Branch: `codex/thanksgiving-preview-2026-11-04`, pushed to origin.
- Deployment: `dpl_79CS7WtN9VvrMznoYrwc296qegCg`.
- Immutable deployment URL: https://dancewithceech-nextjs-ejmcd421z-ceechhsus-projects.vercel.app
- Project: `prj_SNzeOyEluIN9UBuYmAMGqDxZd9yL`; team: `team_oTY5dC1X8SnhEdyDYoMniCQR`.
- Vercel build completed in 46 seconds; compilation, TypeScript, and all 144 static pages passed.

## Automatic ending

The season ends at midnight at the beginning of **December 1, 2026, America/Los_Angeles**: `2026-12-01T00:00:00-08:00`, equivalent to `2026-12-01T08:00:00Z`.

The shipped client schedules the exact deadline, rechecks on focus/visibility changes for suspended tabs, removes all three seasonal scenes, and stops/resets active audio. Playback also independently checks the date so a delayed audio load cannot start after expiry. This is a one-time November 2026 season. No scheduled deployment or cron is required.

## Preservation and packaging

Production inspection found a newer review snapshot than the approved preview base. The feature was rebased onto the exact production source `b06ca700eb08cd8f859b4244fde2c53e29acaddd`, preserving the November Google review count of 61, Yelp count of 30, and existing classroom/navigation changes. All nine approved Thanksgiving files remained byte-identical across the rebase.

A clean Git archive was staged using `vercel deploy --prod --skip-domain`; it contained no local environment credentials, temporary gateway, or untracked screenshots. The tracked `.env.example` is the existing example configuration. The domain was checked again before promotion and still pointed to the expected prior deployment. The authenticated Vercel promotion assigned the verified production build, and a subsequent domain lookup confirmed the new deployment and runtime commit. No access-protection changes or share links were used.

## Verification

- All 24 focused season/homepage/rhythm/navigation checks passed before release.
- Scoped ESLint passed. Local optimized build passed before preview approval; the final production Vercel build also passed.
- The preserved review snapshot test passed with its required `--conditions=react-server` setting.
- Broader checks exposed an inherited footer-source assertion in `tests/gbp-consistency.test.ts` that expects an obsolete inline homepage footer. The same failure was reproduced from a clean archive of the unchanged production base; no product regression was introduced and the test was left outside this release's scope.
- Authenticated staging requests verified the completed homepage and exact SHA-256 matches for both the 116,236-byte MP3 and 87,076-byte WebP.
- Staged browser chunk `/_next/static/chunks/app/page-cc24a90f47a8bca0.js` contains the exact Pacific deadline, audio path, visibility handler, and seasonal/dance selectors. Serialized homepage data preserves Google review count 61.
- Live browser verified three scenes, silent initial load, actual 7.2-second audio playback, synchronized dance, second-click stop/reset, Space/Enter controls, and no horizontal overflow at the delivered viewport. Earlier approved preview verification covers scene handoff, natural ending, hide/show, reduced motion, desktop/tablet/phone layouts.
- **Live production cutoff test:** an isolated browser tab loaded the actual public site with a test clock one second before December 1 midnight Pacific. Sound was started, then the clock advanced across the deadline. All scenes disappeared and audio paused/reset to zero. The test tab was closed; the delivered site tab uses the real clock.
- Deployment-scoped error/fatal log scan returned no matching logs during the inspected window.
- Live screenshot: `docs/thanksgiving-live/desktop-playing.png` (local proof, not included in deployment).

## Immediate rollback

The immediately preceding production deployment is `dpl_8oqfs37teJuRQhobv7utugPVUg3w`, URL https://dancewithceech-nextjs-jdkx0ok87-ceechhsus-projects.vercel.app, source `b06ca700eb08cd8f859b4244fde2c53e29acaddd`.

Use that deployment for a specifically requested immediate rollback. Earlier Halloween records refer to older releases and must not be used as this release's rollback target. Always inspect current production before a future change to preserve intervening work.

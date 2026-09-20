# BeatFirst live replacement — 2026-09-19

This records the initial 18-level launch. See [the leaderboard release verification](beatfirst-leaderboard-verification.md) for the subsequent Top 10 update and current production deployment.

The user-tested 18-level game now replaces the previous six-beat/referral game at **https://dancewithceech.com/beat-first**. The public game has three free samples, Google sign-in that immediately opens levels 4–6, and score-based progression through level 18. The private mobile preview remains available separately.

## Release

- Application source commit: `5875664` on `codex/beatfirst-preview`, fast-forwarded into local `main`.
- Production deployment: `dpl_DEDuE8CPv5HQQombXrfdmniuAsjg`, `https://dancewithceech-nextjs-4yjxtxiit-ceechhsus-projects.vercel.app`.
- Built with `vercel deploy --prod --skip-domain --yes`, verified with production configuration, then promoted with `vercel promote`.
- Production was not created by promoting the private preview. No preview password, auth URL, or disabled-attendance override was applied to production. No production secret export was performed.
- Rollback deployment: `dpl_FWFzp2tk7wfiQGKuDHBQAoUGj2wY`, `https://dancewithceech-nextjs-6oy07kn93-ceechhsus-projects.vercel.app`, source `a34626c`.
- Existing local changes to `nextjs-site/design-qa.md` and `nextjs-site/src/app/page.tsx` were preserved; their SHA-256 hashes match the pre-integration copies.

## Implementation

The public page uses the approved game engine, audio, level catalog, scoring, and saved-progress store unchanged. Public and private-preview paths are selected explicitly for progress requests and sign-in/sign-out callbacks. The public page retains its canonical URL and updated structured data, adds server-rendered how-to/FAQ content, and removes the legacy/referral UI and private preview badge.

Public progress links now target `/beat-first#progress`. Public sign-out preserves the existing attendance offline-cache safeguard: pending attendance records prevent logout. No attendance, payment, or legacy stored-session data was migrated or removed.

The existing `beatfirst_preview_attempts` table and verified Google-subject ownership remain in use. This preserves saved preview scores without a migration. Unsigned guest scores on the separate preview origin do not cross origins automatically; account-saved progress does.

## Checks

- 117 tests passed with zero failures: BeatFirst engine, levels, API, storage, recovery, migration, access, public routes, legacy library regressions, relevant attendance/logout and navigation behavior, and SEO/metadata checks.
- All eight new public-routing/logout tests were observed failing before implementation, then passed.
- Full TypeScript, scoped ESLint, and whitespace checks passed.
- Independent plan, specification, and code-quality reviews passed after the attendance logout safeguard and cross-environment progress check were included.
- Vercel optimized production build and TypeScript passed; 138 static pages generated.
- Actual public layout checked locally at 375×667 and 1280×900: one main/H1, correct canonical, no horizontal overflow, no preview badge, correct Home navigation, and readable game/journey/guidance.
- Local public guest play scored 100 with 15/15 hits. Its best score persisted after a reload.
- Both staged and promoted production passed public access checks: `/beat-first` 200 without a preview password; new level catalog, guide, canonical, schema, and progress anchor present; legacy/referral UI absent; preview page/API and fixture route 404; unauthenticated public progress API 401; homepage intact; Google callback points to `https://dancewithceech.com/api/auth/callback/google`.

## Saved-progress continuity and isolation

A disposable verified Google test subject saved a perfect level-1 attempt through the existing private preview. The staged production public API returned the exact same attempt ID and score for that subject, proving continuity before promotion.

The production API also verified immediate access to levels 4–6, rejection of premature level 18, sequential unlocks through 18, persistence, immutable attempt replay, personal-best retention after a lower score, cross-origin rejection, owner mismatch rejection, and isolation from another subject. All 17 test rows were deleted using an exact match on the disposable subject; a follow-up count confirmed zero remain. No real user's saved attempts were deleted.

## Live browser verification

- The promoted public page displayed the new game and completed a ten-second guest round without interruption on misses. The automated timing helper did not tap in this production run; accurate tapping was verified on the local public page and by the gameplay tests above.
- Google sign-in completed with the owner's previously approved account and returned to `/beat-first` without a redirect mismatch.
- The account displayed its existing scores, 49/54 stars, and all 18 levels open. The guest round was claimed into the account, bringing its saved-round count to 23 without reducing existing personal bests.
- Reloading the live page restored the same 23 rounds and all 18 unlocked levels after progress finished loading.
- No browser console errors appeared. Vercel reported no error/fatal runtime logs for this deployment in the inspected 30-minute window after release.

The earlier private-preview browser OAuth limitation is superseded by this successful end-to-end public sign-in. The owner had already tested and approved all 18 levels before requesting this release.

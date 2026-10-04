# Trainer launch checklist

Updated October 4, 2026. The trainer is published at https://dancewithceech.com/practice/. Production points and challenge history start fresh.

- [x] Phone: Marching and Two-Step fresh recordings complete analysis.
- [x] Phone: previously failing Marching recording passes complete-dance alignment.
- [x] Hosted preview: invitation received, accepted with second Google account, new take completed, both received 100 test points once.
- [x] Phone: reopening and reloading the completed challenge leaves both balances at 100. This tests the challenge detail GET; backend tests also exercise duplicate completion POSTs.
- [x] Original edited HEVC camera-file timeline: all 384 browser frames pass the unchanged 8 ms check; actual on-device analysis completes with 16 contacts.
- [x] Production configuration: existing Google provider/callback verified on live and staged builds; owner identity, email origin/enablement, signing and debug keys configured. Staged storage lookup and signing verification succeed. Real production sign-in and delivery get a short smoke check immediately after publishing.
- [x] Production fresh-start policy verified: one preserved custom profile; zero scores, challenges, and completions. Preview has separate tables.
- [x] Trainer backup restored into a separate local Postgres instance, with all six tables and the saved profile matching exactly. Previous live deployment is READY and marked as a rollback candidate; rollback procedure recorded below.
- [x] Final pre-launch release checks. Ready for a controlled publication; live domains remain on the previous deployment.
- [x] Publication authorized by the user; reviewed release merged and the verified production build promoted to both live domains.
- [x] Live checks: both reference videos decode, their audio/video/marker files and updated analysis modules match reviewed fingerprints, and the complete trainer manifest matches the staged release.
- [x] Fresh Google sign-in succeeds for owner and regular accounts; profiles and photos load. The verification browser is left signed in with the regular account.
- [x] Guest practice is available; profile, score, and challenge account routes reject anonymous access. Camera/microphone permissions and the production Google callback are correct.
- [x] Initial runtime error scan is clear, including no recorded server responses with status 500 on the published deployment during the check.
- [ ] Confirm one actual new challenge invitation is received from the live origin. Hosted preview delivery passed; no live invitation was sent during this publication, so production delivery is not yet claimed as verified.

Database read checks also confirm all twelve production/preview trainer tables have RLS enabled and neither browser role can select them directly.

## Release evidence

- Server checks: 148 passing. Prototype browser checks: 191 passing. Hosted trainer checks: 65 passing, including repeated completion POSTs, simultaneous completions, owner identity and preview isolation.
- Full website build: successful, 140 generated pages.
- The camera fix calibrates only the known first-frame timestamp origin, verifies beginning/middle/end, then retains the strict per-frame guard. It does not adjust audio from foot movements or relax scoring thresholds.
- A cached owner manual-sync flag is cleared before a regular account can use that comparison.
- The main website’s desktop and mobile Learn Free menus now include Dance Timing Practice, so visitors can reach the drills.
- Production settings now include owner identity, origin, email enablement, manual-sync signing and owner debugging transfer. Existing Google credentials, Resend key and production Supabase secret remain in place.
- Private trainer backup lives under the prototype’s ignored `.data/release-backups/trainer-production-20261004`, with file checksums and a successful restore report. No private rows, photos or secrets are committed.

## Rollback procedure

The pre-launch production deployment `dpl_6iquwXpGWkzGZHgXN9TdwWJwngzQ` is READY and an available rollback candidate. Its aliases include `dancewithceech.com` and `www.dancewithceech.com`.

If post-launch sign-in, practice or account services fail, restore that deployment with `vercel rollback dpl_6iquwXpGWkzGZHgXN9TdwWJwngzQ`, then verify the public pages. Keep the additive trainer tables and profile data; do not drop or reset them during application rollback. The database backup was restored only into a separate local database, not over production. Rollback availability is checked; an actual live rollback is intentionally not executed during preparation.

Create a production-environment build with domain assignment disabled (`vercel deploy --prod --skip-domain`). Verify that candidate’s production storage/configuration before assigning live domains. Do not promote the preview build, whose storage is deliberately isolated.

## Final hosted verification before publication

- Latest main website changes were merged into the integration branch to preserve recent blog, booking and attendance fixes. The merged website builds successfully, and all 87 trainer-plus-merged-change checks pass (65 trainer checks plus 22 website regression checks).
- Verified release code commit: `88989c1f5a1a742727e27482452048ce4db77932`.
- Hosted preview: `dpl_9JsoAciEYsiT178ju8eSy1YGNHkg`, READY. All four changed runtime files match their committed SHA-256 fingerprints.
- Staged production build: `dpl_FZigg59g8hp4bQDLK8yivQ1snwy4`, READY, created with `--prod --skip-domain`. Its complete 50-file trainer asset manifest and four changed runtime files match the reviewed code. Camera/microphone permissions apply to practice pages; production Google callback remains `https://dancewithceech.com/api/auth/callback/google`.
- A staged anonymous lookup reaches production trainer storage and returns the expected nonexistent-challenge 404, rather than a configuration/permission error. Synthetic manual-sync verification returns `verified:false`, confirming the signing key is loaded without saving data.
- Production data remains one preserved profile and zero scores, challenges, completions and reward points. Hosted preview still has the one completed test challenge.
- Live aliases `dancewithceech.com` and `www.dancewithceech.com` still belong to the pre-launch rollback target. The PR is clean and mergeable; it has not been merged.
- Website Learn Free → Dance Timing Practice navigation was exercised in the hosted browser and opened the fully loaded library. Mobile uses the same link list.

## Publication result and immediate smoke check

The user authorized publication. Pull request “Integrate the on-device dance trainer with website accounts and challenges” was merged as `093bb28a6cc2910d0fe47d9e1c545baebb0fe157`. Its file tree matches the reviewed branch. The checked production-environment build `dpl_FZigg59g8hp4bQDLK8yivQ1snwy4` was promoted; both `dancewithceech.com` and `www.dancewithceech.com` now point to it. The www origin redirects to the canonical website. The isolated preview build was not promoted.

Live verification passed for both reference videos (Marching 12.573 s and Two-Step 12.808056 s), ten selected runtime/drill file fingerprints, the complete asset manifest, production storage lookup, anonymous access protections, recording permissions, fresh owner/regular Google sign-in, and rendered profile photos. No production challenge, score or reward data was fabricated for these checks. The initial runtime error scan is clear.

Remaining delivery check: send one normal invitation from a live comparison and confirm it arrives and its button opens the live challenge page. The preview invitation already passed, but that does not prove delivery from the production origin. This is a short post-launch check, not another full phone-recording/challenge checklist.

If a critical live check fails, restore the recorded previous deployment and preserve trainer data. The previous deployment remains the rollback target recorded above.

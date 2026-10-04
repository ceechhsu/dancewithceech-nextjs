# Trainer launch checklist

Updated October 4, 2026. Live website unchanged.

- [x] Phone: Marching and Two-Step fresh recordings complete analysis.
- [x] Phone: previously failing Marching recording passes complete-dance alignment.
- [x] Hosted preview: invitation received, accepted with second Google account, new take completed, both received 100 test points once.
- [x] Phone: reopening and reloading the completed challenge leaves both balances at 100. This tests the challenge detail GET; backend tests also exercise duplicate completion POSTs.
- [x] Original edited HEVC camera-file timeline: all 384 browser frames pass the unchanged 8 ms check; actual on-device analysis completes with 16 contacts.
- [x] Production configuration: existing Google provider/callback verified on live and staged builds; owner identity, email origin/enablement, signing and debug keys configured. Staged storage lookup and signing verification succeed. Real production sign-in and delivery get a short smoke check immediately after publishing.
- [x] Production fresh-start policy verified: one preserved custom profile; zero scores, challenges, and completions. Preview has separate tables.
- [x] Trainer backup restored into a separate local Postgres instance, with all six tables and the saved profile matching exactly. Previous live deployment is READY and marked as a rollback candidate; rollback procedure recorded below.
- [x] Final pre-launch release checks. Ready for a controlled publication; live domains remain on the previous deployment.

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

## Final hosted verification

- Latest main website changes were merged into the integration branch to preserve recent blog, booking and attendance fixes. The merged website builds successfully, and all 87 trainer-plus-merged-change checks pass (65 trainer checks plus 22 website regression checks).
- Verified release code commit: `88989c1f5a1a742727e27482452048ce4db77932`.
- Hosted preview: `dpl_9JsoAciEYsiT178ju8eSy1YGNHkg`, READY. All four changed runtime files match their committed SHA-256 fingerprints.
- Staged production build: `dpl_FZigg59g8hp4bQDLK8yivQ1snwy4`, READY, created with `--prod --skip-domain`. Its complete 50-file trainer asset manifest and four changed runtime files match the reviewed code. Camera/microphone permissions apply to practice pages; production Google callback remains `https://dancewithceech.com/api/auth/callback/google`.
- A staged anonymous lookup reaches production trainer storage and returns the expected nonexistent-challenge 404, rather than a configuration/permission error. Synthetic manual-sync verification returns `verified:false`, confirming the signing key is loaded without saving data.
- Production data remains one preserved profile and zero scores, challenges, completions and reward points. Hosted preview still has the one completed test challenge.
- Live aliases `dancewithceech.com` and `www.dancewithceech.com` still belong to the pre-launch rollback target. The PR is clean and mergeable; it has not been merged.
- Website Learn Free → Dance Timing Practice navigation was exercised in the hosted browser and opened the fully loaded library. Mobile uses the same link list.

## Publication and immediate smoke check

After publication is authorized, merge the reviewed PR and assign the production candidate to the live domains (or use an equivalent production-environment build of the merged runtime code). Do not assign the preview build to production. Verify owner/regular Google sign-in and avatars, both drill assets, guest practice and one actual invitation link on the live origin. If any critical live check fails, restore the recorded previous deployment; preserve trainer data. This smoke check is a rollout step, not another complete phone-recording/challenge checklist.

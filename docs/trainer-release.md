# Trainer website integration

The practice library is mounted at `/practice/`. Recording, audio alignment, pose analysis and comparison videos stay in the browser. The existing Google sign-in establishes a verified Google subject for profile, score, challenge and reward requests.

## Data policy

Production starts with zero challenge points and no challenge history. The profile-only exporter opens the prototype database read-only and excludes challenges, rewards, email invitations, credentials and recordings. The importer validates its fingerprint, imports only profiles, ignores existing destination profiles, and verifies account counts. Google-default profiles are reconstructed from the next verified sign-in. Saved score summaries remain in the test database; they are not deleted or silently reset. Test-origin browser recordings remain accessible only on that origin.

The additive migration was applied to the existing production Supabase project on October 3, 2026. All six trainer tables have RLS enabled with no anon/authenticated grants. Server-only functions use invoker security. One custom profile was imported; no challenge rows or points were imported. The Mac test database remains unchanged.

Vercel previews automatically use the separate `trainer_preview_*` tables and RPCs. Preview practice, profile edits and challenge tests cannot change the production dataset. Both datasets are server-only; future storage migrations must update both. Preview profiles begin from Google and are not imported from production.

## Configuration

- `TRAINER_SUPABASE_URL`: current project URL. Set explicitly for preview because this project's general preview database settings point to an older project.
- `TRAINER_SUPABASE_SECRET_KEY`: server-only secret for that same project. Production may use existing `SUPABASE_SECRET_KEY`; never expose either to a browser.
- `TRAINER_OWNER_EMAIL`: verified Google email that receives owner controls.
- `TRAINER_SYNC_SIGNING_KEY`: random secret hexadecimal key of at least 32 bytes for saved manual sync.
- `TRAINER_DEBUG_TRANSFER_KEY`: optional 32-byte hexadecimal key shared with the private Mac receiver; configured only on the authorized preview branch. Never expose this key in browser code.
- `TRAINER_PUBLIC_ORIGIN`: approved HTTPS origin, without a trailing slash, for emailed challenge links.
- `TRAINER_EMAIL_ENABLED=true`: enable after invitation origin/sign-in is verified. Uses existing `RESEND_API_KEY`.
- Existing Google/NextAuth configuration is reused; preview needs an authorized callback on its own stable origin. Do not redirect trainer preview sign-ins to the attendance preview.

Points remain non-redeemable until the paid-content eligibility design is implemented. Client-calculated scores and recording metadata are not proof suitable for paid unlocks.

## Deliberate test-only tools

The owner can explicitly send a recording and analysis details directly to the Mac. `/practice/api/debug-transfer` issues a five-minute, single-use grant bound to the verified owner, calling origin, exact receiver, byte count and SHA-256. The browser uploads directly to `https://test.dancewithceech.com/api/owner-debug-transfer` without Mac cookies. The Mac must be awake with its test server and tunnel running. Its private `debug-transfer.json` contains the matching key, exact approved origins, owner email and audience; it is not committed. Ordinary accounts cannot obtain grants. Automatic camera diagnostic submissions remain disabled on hosted pages. Owner waveform/manual sync and local beat review remain supported. Legacy two-file server comparisons are not migrated; new comparisons begin with a library drill and a local recording.

## Verification and release gate

Local production build, trainer API/SQL/session/asset tests, and two independent implementation reviews passed. Both lesson videos and all 16 markers match the approved source fingerprints. Local browser navigation and reference load verified. Real Google sign-in, mobile recording/analysis, invitation delivery and challenge completion must be verified on the hosted preview before public promotion.

Do not merge unrelated changes in the main checkout. Keep the Mac test site running for old comparisons and invitation links. A rollback promotes the previous Vercel deployment; additive trainer tables and preserved profiles remain in place. Never drop the tables as part of application rollback. Export a private database backup before any future destructive migration.

## Updating reviewed application assets

Run `node scripts/import-trainer.mjs <reviewed-prototype-directory>` and `node --test tests/trainer-assets.test.mjs`. The importer scopes routes to `/practice`, excludes development pages, removes automatic Mac-only diagnostics, installs the signed owner upload module, and records asset checksums. Regenerate only from an explicitly reviewed prototype revision.

## Hosted preview checkpoint (October 3, 2026)

- Branch: `codex/trainer-production-integration`; preview entry: `https://dancewithceech-nextjs-git-codex-train-4bd06d-ceechhsus-projects.vercel.app/practice/`.
- Deploy from the linked Git branch. A CLI upload without Git metadata did not pick up the branch-specific database settings and returned storage errors; the Git-source deployment reaches the correct database.
- Branch-specific `NEXTAUTH_URL` and `TRAINER_PUBLIC_ORIGIN` use the stable preview alias. Its `/api/auth/callback/google` is registered on the existing Google client; the production and attendance callbacks remain present.
- Actual Google owner sign-in, profile photo, empty reward history and zero points verified in the in-app browser.
- Approved compressed Two-Step reference used as a local smoke-test take: analysis completed, 16/16 on beat, 100/100. Playback reached Beat 16 and displayed its feedback. This is a deployment smoke test, not accuracy validation on a new student recording.
- Original HEVC `2step_v4.mp4` fails the existing strict frame check: first parsed sample 0.011144s versus browser frame 0.000000s. The original file has an edit list and reordered frames. The hosted parsing/analysis code is unchanged from the prototype apart from rooted asset URLs. Do not widen the tolerance or shift scores without resolving its media timeline. New Samsung recordings, Marching analysis and this camera-file case still need release verification.
- Vercel authentication protects the preview on new devices. The owner approved a temporary share link for phone testing; it was created and verified in a browser that previously showed the Vercel login. Open it in each test recipient browser first. Google sign-in inside the app remains separate. Keep the bearer link out of Git.
- Preview email sending is enabled after callback and temporary-access verification. No invitation was sent during these checks; actual delivery/completion is still part of the two-account phone test.
- Latest targeted suite: 14 passing trainer tests, including SQL preview/production isolation; type checking and hosted production build passed.

Public promotion remains pending mobile recording/analysis, invitation delivery and completion with both accounts, the camera-file decoding investigation, and production environment completion. Production points/history are still empty. Never promote the preview deployment directly: create a production-environment build so it uses production storage and origin settings.

## Owner debugging transfer restoration

The preview restores “Send recording for debugging” after an owner opens a local comparison. The Mac receiver preserves the existing `.data/debug-recordings/<id>` format. Expired/tampered grants, mismatched files, unsupported origins and duplicate attempts are rejected. Failed transfers require a fresh grant; the recording remains on the device. Rollback can remove the branch key and private receiver config to disable hosted transfers without changing the original Mac debug upload route.

The restored button was verified with a real owner session on the hosted preview. A reference smoke-test recording reached the Mac with an identical SHA-256 and its analysis events. Ten receiver security tests and 25 existing Mac authentication tests passed. Type checking, lint, all 14 trainer integration tests, and the Vercel build passed. The browser needed a fresh page URL to replace its cached pre-update CSP; reopen the comparison after deployment.

## Two-Step contact profile (October 3, 2026)

Contact detector version 5 selects a drill-specific profile. Two-Step uses reliable forefoot XY movement followed by a compact stable position over at least 90 ms; it does not merge legacy vertical candidates. Brief coordinate wobble within the plateau does not shift contact to a later frame. Marching retains its existing combined detector. Detection remains independent of the reference beat grid and scoring thresholds are unchanged.

Cached tracking is reused to regenerate contacts when the detector version or drill profile changes. Older results without reusable tracking require analysis again. Owner diagnostics include the selected profile. The uploaded phone recording reproduced the previous 88 versus 94 discrepancy: the phone selected a zero-confidence early candidate for Beat 10. With the new profile, all 16 contacts are associated and Beat 10 is approximately 23 ms early (94/100 overall) in the local browser. Both earlier Two-Step tracking fixtures also retain 16 associations, including the low-lift closing step and first settled frame before a tracking wobble. All 165 prototype browser tests and 14 hosted trainer tests pass.

This removes the legacy-candidate interference; it does not establish identical pose inference across devices. Phone re-evaluation of the original saved take remains required before claiming cross-device consistency or promoting publicly.

## Recorded-frame playback navigation

The comparison Previous/Next frame controls follow the student's actual presentation timestamps and map each selected frame back to reference time using the existing fixed audio offset. A one-millisecond inset avoids rounded browser seeks falling just before the target boundary. Short review windows are respected; older comparisons without student timestamps use reference timestamps when available and report unavailable stepping when neither clock exists.

The Beat 5 reproduction had two 33.3 ms button increments display the same 44.7 ms student frame while the reference moved. The regression test now requires consecutive source-frame indices for that exact clock, tests reverse stepping and boundary handling, and preserves synchronization. All 170 prototype browser tests pass. Phone and Mac scores of 94 on the same uploaded take were confirmed by the owner after the preceding detector update; this playback change does not alter detection or scoring.

## Release preparation checkpoint (October 4, 2026)

The phone checks listed as open in the earlier checkpoints are now complete: fresh Marching and Two-Step recordings, the previously failing Marching take, the hosted invitation/completion and both unchanged 100-point balances after refresh. The completed preview challenge was independently verified in hosted storage. Production remains separate with one preserved profile and no scores or challenge history.

Edited-camera timeline version 2 clips samples to the edit interval and verifies whether the browser preserves movie timestamps or normalizes the first retained frame to zero. Only that known origin difference is accepted, at three distant anchors, followed by the existing 8 ms per-frame check. The original HEVC recording now passes all 384 timestamps and completes on-device analysis with 16 contacts. Tracking on a changed clock is invalidated; unchanged cached analysis remains reusable. Normal recorder timestamps and audio alignment stay unchanged.

Production owner, email origin/enablement, sync signing and existing Mac debug-transfer settings have been prepared. Private trainer backup and exact local restore are verified. See `trainer-launch-checklist.md` for the current release state and rollback procedure; older open-item lists above are historical.

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
- `TRAINER_PUBLIC_ORIGIN`: approved HTTPS origin, without a trailing slash, for emailed challenge links.
- `TRAINER_EMAIL_ENABLED=true`: enable after invitation origin/sign-in is verified. Uses existing `RESEND_API_KEY`.
- Existing Google/NextAuth configuration is reused; preview needs an authorized callback on its own stable origin. Do not redirect trainer preview sign-ins to the attendance preview.

Points remain non-redeemable until the paid-content eligibility design is implemented. Client-calculated scores and recording metadata are not proof suitable for paid unlocks.

## Deliberate test-only tools

Raw owner debug uploads and automatic camera diagnostic submissions are not sent to the Mac from the hosted trainer. Those tools remain available on the private test site. Owner waveform/manual sync and local beat review remain supported. Legacy two-file server comparisons are not migrated; new comparisons begin with a library drill and a local recording.

## Verification and release gate

Local production build, trainer API/SQL/session/asset tests, and two independent implementation reviews passed. Both lesson videos and all 16 markers match the approved source fingerprints. Local browser navigation and reference load verified. Real Google sign-in, mobile recording/analysis, invitation delivery and challenge completion must be verified on the hosted preview before public promotion.

Do not merge unrelated changes in the main checkout. Keep the Mac test site running for old comparisons and invitation links. A rollback promotes the previous Vercel deployment; additive trainer tables and preserved profiles remain in place. Never drop the tables as part of application rollback. Export a private database backup before any future destructive migration.

## Updating reviewed application assets

Run `node scripts/import-trainer.mjs <reviewed-prototype-directory>` and `node --test tests/trainer-assets.test.mjs`. The importer scopes routes to `/practice`, excludes development pages, removes Mac-only submission controls, and records asset checksums. Regenerate only from an explicitly reviewed prototype revision.

## Hosted preview checkpoint (October 3, 2026)

- Branch: `codex/trainer-production-integration`; preview entry: `https://dancewithceech-nextjs-git-codex-train-4bd06d-ceechhsus-projects.vercel.app/practice/`.
- Deploy from the linked Git branch. A CLI upload without Git metadata did not pick up the branch-specific database settings and returned storage errors; the Git-source deployment reaches the correct database.
- Branch-specific `NEXTAUTH_URL` and `TRAINER_PUBLIC_ORIGIN` use the stable preview alias. Its `/api/auth/callback/google` is registered on the existing Google client; the production and attendance callbacks remain present.
- Actual Google owner sign-in, profile photo, empty reward history and zero points verified in the in-app browser.
- Approved compressed Two-Step reference used as a local smoke-test take: analysis completed, 16/16 on beat, 100/100. Playback reached Beat 16 and displayed its feedback. This is a deployment smoke test, not accuracy validation on a new student recording.
- Original HEVC `2step_v4.mp4` fails the existing strict frame check: first parsed sample 0.011144s versus browser frame 0.000000s. The original file has an edit list and reordered frames. The hosted parsing/analysis code is unchanged from the prototype apart from rooted asset URLs. Do not widen the tolerance or shift scores without resolving its media timeline. New Samsung recordings, Marching analysis and this camera-file case still need release verification.
- Vercel authentication protects the preview on new devices. The owner approved a temporary share link for phone testing; it was created and verified in a browser that previously showed the Vercel login. Open it in each test recipient browser first. Google sign-in inside the app remains separate. Keep the bearer link out of Git.
- Preview email sending is enabled after callback and temporary-access verification. No invitation was sent during these checks; actual delivery/completion is still part of the two-account phone test.
- Latest targeted suite: 12 passing trainer tests, including SQL preview/production isolation; type checking and hosted production build passed.

Public promotion remains pending mobile recording/analysis, invitation delivery and completion with both accounts, the camera-file decoding investigation, and production environment completion. Production points/history are still empty. Never promote the preview deployment directly: create a production-environment build so it uses production storage and origin settings.

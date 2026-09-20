# BeatFirst Live Replacement Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the bounded route/auth task and requesting-code-review for spec and quality reviews. Parent owns public page/UX integration, release checks, and production deployment. Steps use checkbox syntax.

**Goal:** Replace the current live six-beat BeatFirst experience at `/beat-first` with the user-tested 18-level game and publish it to DanceWithCeech.com.

**Architecture:** Reuse the tested game/catalog/audio and existing Google-subject-owned progress table unchanged. Add a canonical production-enabled `/api/beatfirst/progress` route; explicitly select public vs private-preview paths for progress requests and authentication return URLs. Preserve the password-protected preview and its old API. Retain the public canonical metadata and useful updated instructions/FAQ, removing the legacy game/referral UI from the rendered page.

**Tech Stack:** Next.js App Router, React, NextAuth Google, existing server-only Supabase store, Vercel production staging.

## Evidence and scope

- User explicitly asked to replace the current BeatFirst with the new version, following agreement to launch the tested 18 levels. Publishing the replacement is authorized; no additional approval is needed for routine release steps.
- Live audit: current `/beat-first` has six legacy beats and referral locks. Production deployment `dpl_FWFzp2tk7wfiQGKuDHBQAoUGj2wY` corresponds to `a34626c`, the main ancestor of this feature branch. Origin main has no newer commits.
- Existing worktree `beatfirst-preview`, branch `codex/beatfirst-preview`, is clean at `3044734`. Main checkout has unrelated homepage/design edits; preserve them.
- Production variable names show Google/NextAuth and the same attendance database pair configured across preview/production. Do not export production secrets; automatic approval review rejected the export. Verify through staged production requests instead.
- No schema, gameplay, scoring, or unlock changes. Existing preview account scores stay valid and available on the live site through the same verified Google subject and store. Guest-only browser storage cannot automatically cross origins; sign-in is how saved progress follows the player.
- Do not remove old stored game sessions/referrals or alter attendance/payment behavior. Legacy game code can stay unreferenced; no legacy UI or referral gating remains on `/beat-first`.

## Task 1 — Public API and auth paths (independent implementer)

Files: new `src/app/api/beatfirst/progress/route.ts`, new `src/components/beatfirst-preview/routes.ts`, `progress-request.ts`, `useProgress.ts`; new tests `tests/beatfirst-live-routes.test.ts`, existing recovery test as needed.

- [x] Write failing tests for a production public route being enabled, private preview API disabled in production, correct public/private callback paths, and progress requests going to their selected endpoint.
- [x] Add `beatFirstRoutes(preview = false)` returning `{ pagePath, progressPath }`: public `/beat-first` + `/api/beatfirst/progress`, preview existing paths. Hook signature `useProgress(preview = false)`; retain timeout/storage/account-ownership behavior and storage key.
- [x] `progressRequest` accepts selected endpoint as fourth optional argument (default public endpoint), preserving existing test injection API. Hook supplies endpoint for both GET/POST and uses selected pagePath for sign-in/sign-out.
- [x] Preserve production sign-out safeguards: before public sign-out, clear the current account’s attendance offline cache through existing `clearOfflineData(email)`; a pending attendance queue must block logout and display its message. Keep email separate from the immutable Google subject used for game ownership. Add behavior tests for cleanup-before-signout and failure preventing signout.
- [x] Add public API GET/POST using existing authenticated handlers and store, enabled in production. Keep private preview route restricted; export a pure `progressApiEnabled(preview, environment)` from routes if useful for behavior testing.
- [x] Run relevant tests/type/lint; spec and quality review with parent integration. No deployment/commit by implementer.

## Task 2 — Replace page and integrate navigation (parent)

Files: `src/app/beat-first/page.tsx`, `src/app/beat-first/preview/page.tsx`, `BeatFirstJourney.tsx`, `Journey.module.css`, new `BeatFirstGuide.tsx`, public progress links in `UserMenu.tsx` and `dashboard/page.tsx`, sitemap date.

- [x] Replace legacy BeatFirstGame/referral lookup with shared journey, preserving canonical metadata and updating accurate 18-level copy/schema. Avoid duplicate headers/footers; use tested compact game header with Home navigation in public mode.
- [x] Journey defaults public; preview explicitly passes `preview`. Propagate flag to useProgress and view. Public removes PREVIEW badge and changes self-referencing Back link to homepage. Allow optional server-rendered children below journey before footer for updated how-to/FAQ content.
- [x] Give account section id `progress`; update existing My Progress links to `/beat-first#progress`. Retain existing public path and sitemap entry, update last-modified date. No other homepage/nav changes.
- [x] Browser check actual public page on phone/desktop: starts without passcode, three samples, sign-in reward, metadata, no old/referral UI, no duplicate chrome/self-link, account/progress links. Play guest sample and confirm saved local replay after reload. Preview route still works in development and deployment protection remains.

## Task 3 — Verified production release (parent)

- [x] Run all BeatFirst tests including legacy library regressions, scoped lint, full TypeScript, whitespace checks; independent spec then quality review.
- [x] Stage production build with production configuration but no domain switch (`--prod --skip-domain`, confirm CLI/current docs). Do not promote private preview with preview auth/attendance overrides. No export of secret values.
- [x] Save a disposable attempt using the existing preview API and verify staged public API reads the exact same ID/score/subject, proving continuity before promotion. Then run fresh unlock/account-isolation checks and delete only this test subject’s rows.
- [x] Check staged public page, private preview denied, public API verified-subject access/persistence/full unlocks/account isolation using existing authorized local verification secret, no-account 401, correct production Google callback. Use disposable test subject only; delete exactly created test rows afterward.
- [x] Promote verified staged production to existing domains. Verify final live page, homepage/attendance navigation unchanged, live sign-in and saved progress, smoke-play guest, inspect error logs. If production smoke fails, roll back to recorded prior deployment and fix.
- [x] Commit release/docs, preserve worktree and unrelated local edits. Record actual evidence and any browser sign-in limitation accurately. Keep private short preview available.

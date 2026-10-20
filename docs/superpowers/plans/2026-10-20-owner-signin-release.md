# Live owner sign-in dashboard implementation plan

**Goal:** Enable the authorized owner-only dashboard on DanceWithCeech.com and show the actual live result in the in-app browser.
**Architecture:** Reuse the reviewed owner dashboard, excluding social and editable-profile features. Auth.js verified Google subject and email authorize server-side reads. A service-only Supabase directory records sign-in events independently of games, expires after 90 days, and has daily physical cleanup and signed-in self-deletion.
**Tech stack:** Next.js 16, Auth.js JWT, Supabase Postgres, Vercel.

## Task 1: Isolate and verify
- [x] Confirm original chat idle; clean clone at production Git commit be9ecca; preserve dirty original checkouts.
- [x] Confirm Vercel project/team/domain and Supabase project; verify directory absent.
- [x] Copy only admin page/API, dashboard component/styles, access/model/signin/server modules, analytics protections and relevant tests from reviewed checkout. Exclude profile/social features and their migrations/imported evidence.

## Task 2: Release implementation
- [ ] Write/run failing tests for database-config fallback, own-account erasure authorization, paginated directory loading, and physical expiry cleanup SQL.
- [ ] Use existing server configuration (explicit directory URL/key overrides remain paired; otherwise NEXT_PUBLIC_SUPABASE_URL and secret-key helper). Record owner_directory_record_signin from Google signIn event; retain generic failure logging.
- [ ] Generate migration with Supabase CLI; reuse reviewed directory DDL and invoker RPC with private grants/RLS. Add service-only expiry purge function, enable pg_cron, schedule daily deletion at 04:17 UTC. Test DDL/RPC/role denials in PGlite; validate cron live.
- [ ] Read all nonexpired directory pages; keep bounded practice snapshots and explicitly label their coverage. No historical sign-in backfill or active-time estimates.
- [ ] Add DELETE /api/account/signin-record: verify signed Google identity before client construction; reject foreign origins/selectors; delete only session subject. Add a privacy-page control for this action.
- [ ] Publish /privacy notice accurately describing data, owner access, 90-day expiry plus daily cleanup, deletion/recreation on later sign-in, backup limitations and separate saved practice data. Link footer/sign-in surface and owner dashboard. Add full-document owner-menu link.

## Task 3: Verify and release
- [ ] Run targeted tests, TypeScript, changed-file ESLint, production build and fixture HTTP/API tests (guest/ordinary/unverified/forged denial before DB access; owner allowed; private headers; sign-in-only account included).
- [ ] Review final diff; commit and push scoped branch. Apply reviewed migration only to project ywianppupnxduthvyeyb, verify grants/RLS/RPC with rollback-only synthetic transaction; confirm cleanup schedule and security advisors.
- [ ] Enable three production flags OWNER_DASHBOARD_ENABLED, OWNER_SIGNIN_RECORDING_ENABLED, OWNER_SIGNIN_PRIVACY_REVIEWED. No credentials copied or exported.
- [ ] Stage production deployment with --skip-domain; verify build and release contents, then promote to live domain under existing authorization. Confirm domain points to exact deployment.
- [ ] Verify live guest API denial/private headers, privacy notice, no synthetic preview route. Open actual /admin in Codex in-app browser. Use actual owner sign-in; if session absent request minimal user sign-in. Do not inject fixture cookies into any live browser.
- [ ] Report verified release/coverage start, URL, browser status and genuine outstanding owner OAuth action. Never print account lists or secrets.

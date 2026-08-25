# Running Man Method Production Launch Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Running Man Method enrollment flow from test services to a clean production Supabase/Stripe environment and publish it safely.

**Architecture:** Keep the tested application code unchanged wherever possible. Create and verify production infrastructure first, then configure the deployed site with production-only environment variables. Stripe live payments will finalize enrollment through the production webhook, while Supabase remains the source of truth for seats, pricing tiers, coaching capacity, and enrollment records.

**Tech Stack:** Next.js 16 App Router, Vercel deployment, Supabase Postgres, Stripe Checkout and webhooks, Resend email, TypeScript tests.

**Reference documents:**

- `docs/superpowers/specs/2026-08-20-running-man-enrollment-checkout-design.md`
- `docs/superpowers/plans/2026-08-22-running-man-enrollment-checkout.md`
- `src/lib/running-man/config.ts`
- `src/lib/running-man/checkout.ts`
- `src/lib/running-man/webhook.ts`
- `src/app/api/stripe/running-man-webhook/route.ts`

## Launch rules

- Do not expose or commit secret keys.
- Do not copy test students, test reservations, or test Stripe sessions into production.
- Do not switch the public site to live mode until the production webhook and database have been verified privately.
- Keep the current test environment available for regression testing.
- Complete the full transition, concurrency, stale-state, cutoff, refund, webhook, and error matrix in Stripe test mode before launch. A live charge is optional, requires Ceech’s explicit approval, and must have a documented refund or genuine enrollment outcome.

## Task 1: Record the tested baseline

**Files:**

- Read: `package.json`
- Read: `.env.local` (values must remain private)
- Test: `tests/running-man-*.test.ts`, `tests/running-man-method-page.test.mjs`

- [ ] Record the current test-mode behavior: active tier, seat count, coaching availability, checkout, webhook, confirmation page, and email path. This is a checkpoint, not a development freeze.
- [ ] Run `npm run test:running-man` and confirm all tests pass.
- [ ] Run the relevant ESLint and TypeScript checks.
- [ ] Confirm the local environment still points to test Stripe (`sk_test_...`) and the test Supabase project.
- [ ] Do not delete the test database; it remains the safe environment for future changes.

**Exit condition:** The known-good test flow is documented and reproducible. No separate code freeze is required.

## Task 2: Prepare the production Supabase project

**Files / database objects:**

- Review: `src/lib/supabase.ts`, `src/lib/supabase-admin.ts`, `src/lib/running-man/repository.ts`
- Apply: the production version of the Running Man enrollment schema/migration described in `docs/superpowers/plans/2026-08-22-running-man-enrollment-checkout.md`

- [ ] Confirm the production Supabase project is the intended project and is separate from the test project, or explicitly approve the production-environment strategy if one project is being used.
- [ ] Apply the schema, indexes, RPCs, and seed cohort configuration to production.
- [ ] Enable RLS on every exposed table and confirm enrollment tables have no public `anon` or `authenticated` write access.
- [ ] Confirm the Data API exposure and grants match the application’s access model.
- [ ] Verify the server-side service-role connection can read and mutate enrollment records while browser clients cannot.
- [ ] Confirm the production enrollment tables contain zero test students, test reservations, or test session IDs.
- [ ] Run a read-only production verification query for cohort capacity, pricing tiers, coaching capacity, and empty enrollment counts.
- [ ] Verify any `SECURITY DEFINER` RPC uses an empty `search_path`, fully qualified relations, and explicit grants revoked from `PUBLIC`, `anon`, and `authenticated`; grant execution only to the server role.

**Exit condition:** Production Supabase is structurally ready, secured, and clean.

## Task 3: Create the live Stripe catalog

**Stripe Dashboard:** live mode only

- [ ] Create or verify the four live one-time USD Prices:
  - Running Man Method enrollment — $197
  - Running Man Method enrollment — $247
  - Running Man Method enrollment — $297
  - Private coaching add-on — $100
- [ ] Verify each live Price is active, one-time, USD, and has the correct amount.
- [ ] Set the live business name, logo, support email, and receipt branding to Dance With Ceech.
- [ ] Set the customer-facing product name and description to identify the September 24–October 22, 2026 cohort, weekly sessions on September 24, October 1, October 8, and October 15, and the live Graduation Challenge on October 22.
- [ ] Restrict the Checkout Session to immediate card-based payment methods; leave adjustable quantities and promotion codes disabled.
- [ ] Verify Stripe’s standard successful-payment receipt is enabled and that the application does not send a duplicate receipt.
- [ ] Keep promotion codes, adjustable quantities, and automatic tax disabled unless intentionally approved.
- [ ] Copy the live Price IDs into the production environment only; never place them in browser code.
- [ ] Before launch, deactivate the old public live Payment Links so they cannot bypass inventory, pricing, or coaching-capacity rules.

**Exit condition:** Stripe live mode has the exact catalog the server expects.

## Task 4: Configure the production webhook and email delivery

- [ ] Deploy the application to its production URL before creating the live webhook endpoint.
- [ ] Create a Stripe live-mode webhook pointing to:
  `https://<production-domain>/api/stripe/running-man-webhook`
- [ ] Subscribe only to the events required by the Running Man flow, including completed checkout, expiration, refunds, disputes, and payment failures as implemented.
- [ ] Explicitly verify the endpoint handles completed checkout, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, refunds, payment failures, `charge.dispute.created`, and `charge.dispute.closed` as applicable to the implementation.
- [ ] Verify raw-body signature rejection, live-mode checks, metadata/amount/quantity allowlists, duplicate-event deduplication, out-of-order event handling, and paginated line-item validation.
- [ ] Store the live webhook signing secret in the production environment.
- [ ] Configure the production Resend API key and verified sender/domain.
- [ ] Verify the owner notification recipient and the student confirmation/next-steps email sender.
- [ ] Confirm the production cron/reconciliation route has its protected secret and is enabled.
- [ ] Name and verify every required production setting individually: `RUNNING_MAN_CRON_SECRET`, `CRON_SECRET` (matching the Vercel Cron authorization), `RUNNING_MAN_ATTEMPT_COOKIE_SECRET`, `RUNNING_MAN_NOTIFICATION_FROM`, `RUNNING_MAN_OWNER_EMAIL`, `RUNNING_MAN_SYSTEME_WAITLIST_TAG_ID`, and the Resend/API credentials.
- [ ] Verify the Systeme.io credential used by the waitlist is present as `SYSTEME_API_KEY` and is scoped to the intended account.

**Exit condition:** Stripe can reach the deployed webhook, signatures are verified, and email credentials are valid.

## Task 5: Configure the production deployment

**Files / deployment settings:**

- Review: `.env.local` variable names and all `process.env` references.
- Configure: Vercel Production environment variables; do not commit them.

- [ ] Set production values for:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY` (live key)
  - `STRIPE_WEBHOOK_SECRET` (live endpoint secret)
  - all four `RUNNING_MAN_STRIPE_PRICE_*` values (live Price IDs)
  - `RUNNING_MAN_STRIPE_LIVEMODE=true`
  - `RESEND_API_KEY`
  - required owner, cron, and attempt secrets
- [ ] Confirm no test key or `localhost` URL is present in Vercel Production settings.
- [ ] Deploy from the reviewed commit.
- [ ] Confirm the production build completes with real production environment variables.
- [ ] Confirm the production URL serves the Running Man Method page and its confirmation route.
- [ ] Verify the public enrollment-state response is cacheable for no more than 15 seconds, includes an `asOf` timestamp, and is invalidated/refreshed after a webhook.
- [ ] Verify fail-closed behavior: if inventory cannot be read, the page makes no price/scarcity claim and checkout cannot open; stale snapshots are timestamped and require refresh/reconfirmation.

**Exit condition:** The deployed production app is connected to production services, but the public launch announcement has not yet been made.

## Task 6: Build and configure the dedicated next-cohort waitlist

**Files:**

- Create or modify: `src/app/api/running-man-waitlist/route.ts`
- Modify: the sold-out/waitlist UI in `src/components/running-man/EnrollmentPanel.tsx` and `src/app/running-man-method/RunningManMethodPage.tsx`
- Test: a dedicated waitlist test file alongside the existing Running Man tests

- [ ] Implement the Running Man-specific endpoint rather than reusing the unrelated Academy waitlist route.
- [ ] Validate name and email, normalize email casing/spacing, and make repeated submissions idempotent.
- [ ] Require explicit marketing consent and clearly state that joining the waitlist is not a paid reservation.
- [ ] Add the honeypot, rate limiting, accessible success/error states, Systeme.io tag application using `SYSTEME_API_KEY` and `RUNNING_MAN_SYSTEME_WAITLIST_TAG_ID`, and delivery-failure logging.
- [ ] Add tests for validation, consent, duplicate submissions, abuse controls, Systeme failures, and the sold-out UI state.

**Exit condition:** The waitlist is a complete, tested Running Man feature before the cohort can sell out.

## Task 7: Run a controlled live enrollment test

Use a real card only with Ceech’s explicit approval; if this is a launch test, plan the refund before charging it. All other matrix checks belong in Stripe test mode.

- [ ] Open the production page in a fresh browser session.
- [ ] Verify the page shows the initial $197 tier, 12-seat limit, and three available private-coaching spots.
- [ ] Verify the required commitment checkbox gates checkout, records the current terms version and server timestamp, and rejects missing or stale acknowledgments at the server.
- [ ] Verify the five required commitment disclosures are present and accurate: active practice/video submissions; gradual sharing with private Mastery Checkpoints; weekly participation and the live Graduation Challenge; age 18/safe practice or medical clearance; and refund, cancellation, and postponement terms.
- [ ] Complete the full matrix in a preview/test deployment connected to test Supabase and test Stripe; never send test payments to a production Supabase database.
- [ ] If Ceech approves a live smoke test, complete one $197 cohort-only checkout using a real participant against the production deployment; otherwise do not claim the production payment path is live-verified until that approved smoke test occurs.
- [ ] Confirm Stripe marks the payment as paid.
- [ ] Confirm the live webhook is received and accepted.
- [ ] Confirm exactly one production Supabase enrollment record is created with the correct email, price tier, and `coaching=false`.
- [ ] Confirm the page changes to 1 of 3 claimed and still shows two $197 seats.
- [ ] Confirm the confirmation page shows the correct amount and “Private coaching — Not included.”
- [ ] Confirm the student and owner emails are delivered.
- [ ] Confirm the confirmation page identifies the exact amount, cohort enrollment, coaching status, and the correct return link.
- [ ] Test the confirmation route with a tampered, invalid, pending, expired, and non-paid Session ID; each must show a neutral error state, expose no customer data, and never create or fulfill enrollment.
- [ ] Refund the test payment if it was not a genuine enrollment, then verify that refund review keeps the seat capacity-consuming and preserves its tier allocation until an explicit owner-approved reopen.
- [ ] Verify the Day-5 refund rule uses `dancewithceech@gmail.com`, subject `Running Man Method Refund Request`, the September 28, 2026, 11:59 p.m. Pacific received-time boundary (one request immediately before and one immediately after), and preserves the request email for audit; the applicable refund includes coaching.
- [ ] Verify refunded/disputed allocations appear publicly as unavailable/under review—not paid and not sold out—and that only an authenticated owner can reopen them, in order, with an audit record.

**Exit condition:** The complete payment path has been verified end-to-end in the intended environment; any live charge was explicitly approved and has a documented genuine-enrollment or refund outcome.

## Task 8: Verify pricing and coaching capacity transitions

Complete the transition matrix in test mode before launch. In live mode, use only the single controlled purchase from Task 6 unless Ceech explicitly approves additional real charges. Do not create fake production records by hand.

- [ ] Verify the second and third paid enrollment remain at $197.
- [ ] Verify the fourth paid enrollment advances the displayed price to $247.
- [ ] Verify the seventh paid enrollment advances the displayed price to $297.
- [ ] Verify the twelfth paid enrollment closes enrollment and exposes the approved next-cohort waitlist.
- [ ] Verify exactly one purchase button exists in every purchasable state, all three pricing tiers remain visible, future tiers have no interactive controls, and the initial state uses benefit-led copy rather than “0 of 3 claimed.”
- [ ] Verify selecting coaching adds exactly $100 in the same Stripe Checkout and receipt.
- [ ] Verify three paid coaching add-ons disable the option and display “Sold out.”
- [ ] Verify a temporary last-seat hold pauses the current tier without advancing the public price, then reopens after verified unpaid expiry.
- [ ] Verify coaching states separately display available, temporarily held, under review, and sold out.
- [ ] Verify the page never offers a stale tier after a completed payment.
- [ ] Verify abandoned or expired Checkout Sessions do not permanently consume seats.
- [ ] Verify duplicate webhook delivery does not create duplicate enrollment records.
- [ ] Verify concurrent checkout attempts cannot oversell the cohort or the three coaching slots.
- [ ] Verify the signed HttpOnly attempt cookie rejects tampering, repeated clicks reuse the correct active attempt, rate limits are enforced, and changing coaching selection cannot create overlapping holds.
- [ ] Verify the September 17, 2026, 11:59 p.m. Pacific cutoff is enforced server-side, stale pages cannot create new checkout after cutoff, and a pre-cutoff Session retains only its original 30-minute hold.
- [ ] Verify that fewer than eight active paid students after all valid pre-deadline Sessions resolve produces an owner alert and the approved cancel/postpone/refund/transfer workflow rather than an automatic date change.
- [ ] Verify after the cutoff that fewer than 12 paid seats shows “Enrollment closed,” not sold out or the waitlist; a valid pre-cutoff Session may still complete, and only a fully paid 12-seat cohort shows sold out/waitlist.
- [ ] Verify selected coaching becoming unavailable requires explicit cohort-only reconfirmation; it is never silently removed or silently repriced.
- [ ] Verify the reconciliation job preserves holds during Stripe outages or ambiguous status and repairs missing Stripe/Supabase links.
- [ ] Verify the protected reconciliation runs at least every five minutes in production.

**Exit condition:** The production inventory rules behave exactly like the tested design.

## Task 9: Final launch review and publish

- [ ] Review the entire page on desktop and mobile.
- [ ] Confirm every enrollment button reaches the current server-selected Checkout flow.
- [ ] Confirm terms, dates, price, seat count, coaching description, refund policy, and confirmation copy are consistent.
- [ ] Confirm no test URLs, test keys, test customer data, debug messages, or development banners are visible.
- [ ] Verify the next-cohort waitlist is configured and enabled before launch. It must capture name, email, explicit marketing consent, and the “not a paid reservation” disclosure; normalize and deduplicate emails, apply the Running Man Systeme.io tag, use a honeypot and rate limiting, expose accessible success/error states, and log delivery failures.
- [ ] Confirm analytics/monitoring and webhook error alerts are active.
- [ ] Publish the production URL and begin promotion only after the launch checklist is signed off.
- [ ] Keep a rollback plan: disable the live CTA or revert the deployment without deleting production records.

**Final success definition:** A real student can pay once, receive the correct confirmation and email, appear exactly once in production Supabase, and cause every public seat/price indicator to update truthfully.

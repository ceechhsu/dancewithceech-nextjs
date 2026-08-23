# Running Man Enrollment Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Running Man Method’s four static Stripe links with a single, truthful, inventory-protected enrollment flow that automatically selects the current price and can include private coaching in one payment.

**Architecture:** Keep the offer page as a server-rendered marketing page with a small client enrollment component. The client reads a public, non-sensitive availability view from an internal route and submits only a confirmed tier snapshot, a coaching boolean, and the current terms version. Server-only code performs an atomic Supabase reservation, creates a hosted Stripe Checkout Session from allowlisted Prices, and finalizes payment only from verified Stripe webhooks.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Stripe Checkout Sessions + webhooks, Supabase Postgres, Systeme.io API, Node’s built-in test runner executed through `tsx`.

---

## Locked behavior

- One active enrollment CTA. The full ladder stays visible: first 3 at $197, next 3 at $247, final 6 at $297.
- The current tier advances only when an unreopened completed-payment allocation consumes that tier; active holds never advance the displayed price.
- The private-coaching checkbox lives on the Dance With Ceech page, not in Stripe. It adds exactly $100 and includes two 20-minute sessions, one in Week 1 and one in Week 3. At most three capacity-consuming coaching allocations may exist.
- The page requires a commitment acknowledgment before creating checkout. The server verifies the current terms version.
- New checkout attempts stop September 17, 2026, at 11:59 p.m. Pacific. A Session successfully created before that time retains its displayed 30-minute hold.
- Show the sold-out next-cohort waitlist only after 12 active paid enrollments. If fewer than 12 active paid students remain but capacity is full because a refund or dispute is under review, show “Enrollment availability is under review,” not sold out or the waitlist. If the deadline passes with fewer than 12 active paid students, show “Enrollment closed,” not “sold out.”
- A student must email `dancewithceech@gmail.com` from their purchase email with subject `Running Man Method Refund Request` by September 28, 2026, 11:59 p.m. Pacific for a Day-5 full refund, including coaching.

## File structure

| File | Responsibility |
| --- | --- |
| `package.json`, `package-lock.json` | Add pinned Stripe server SDK and `tsx` test runner; add targeted test scripts. |
| `src/lib/running-man/config.ts` | One server-only source for cohort dates, tier capacities, Prices, terms version, and allowed Stripe mode. |
| `src/lib/running-man/types.ts` | Shared serializable view-model and checkout-result types; no secrets. |
| `src/lib/running-man/state.ts` | Pure deterministic derivation of tier labels, count copy, coaching copy, deadline state, and client-safe display data. |
| `src/lib/running-man/terms.ts` | Current terms version and exact commitment statements. |
| `src/lib/stripe.ts` | Server-only Stripe client using `STRIPE_SECRET_KEY`. |
| `src/lib/running-man/repository.ts` | Server-only Supabase RPC calls, event dedupe, reservation mutation, and audit reads. |
| `src/lib/running-man/checkout.ts` | Server-only reservation → idempotent Stripe Session workflow; no React code. |
| `src/lib/running-man/webhook.ts` | Server-only verification and ordered Stripe-event processing. |
| `src/components/running-man/EnrollmentPanel.tsx` | Client component for the ladder, acknowledgment, coaching selection, stale-state reconfirmation, and single CTA. |
| `src/app/api/running-man/enrollment-state/route.ts` | Public, cache-controlled current enrollment view model. |
| `src/app/api/running-man/checkout/route.ts` | Validates client confirmation and creates or resumes hosted Checkout. |
| `src/app/api/stripe/running-man-webhook/route.ts` | Raw-body, signature-verified Stripe webhook endpoint. |
| `src/app/running-man-method/confirmation/page.tsx` | Server-side Stripe Session verification and post-payment confirmation. |
| `src/app/api/running-man-waitlist/route.ts` | Validated, rate-limited Systeme.io next-cohort waitlist submission. |
| `src/app/api/cron/running-man-reconcile/route.ts` | Protected reconciliation of active holds against Stripe. |
| `src/app/api/running-man/admin/reopen/route.ts` | Authenticated, audited owner-only reopening after a confirmed full refund. |
| `src/app/running-man-method/RunningManMethodPage.tsx` | Replace static checkout links/enrollment cards with `EnrollmentPanel`; retain approved page copy. |
| `src/app/running-man-method/page.tsx` | Adjust structured Offer availability only if it can be sourced truthfully without making the page dynamic. |
| `supabase/migrations/<generated>_running_man_enrollment.sql` | Tables, RLS, privileges, atomic reservation RPC, mutation RPCs, indexes, and seed cohort. Create filename only through Supabase CLI. |
| `vercel.json` | Protected five-minute reconciliation cron, if the existing deployment does not already provide it. |
| `tests/running-man-state.test.ts` | Pure pricing, coaching, deadline, and public-copy tests. |
| `tests/running-man-checkout.test.ts` | Checkout guards, stale confirmation, idempotency, terms, and error mapping tests with fakes. |
| `tests/running-man-webhook.test.ts` | Event ordering, dedupe, refund/dispute, and line-item allowlist tests with fakes. |
| `tests/running-man-method-page.test.mjs` | Update prior static-link assertions to require one enrollment action and the client panel. |

## Required environment and dashboard preparation

Do this before creating any live Checkout Session. Do not place secret values in source control.

- `STRIPE_SECRET_KEY`: server-only API key for the intended Stripe account.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the Running Man webhook endpoint.
- `RUNNING_MAN_STRIPE_PRICE_197`, `RUNNING_MAN_STRIPE_PRICE_247`, `RUNNING_MAN_STRIPE_PRICE_297`, `RUNNING_MAN_STRIPE_PRICE_COACHING`: four allowlisted **test-mode** Price IDs during development; configure parallel live values only during launch cutover.
- `RUNNING_MAN_SYSTEME_WAITLIST_TAG_ID`: dedicated Systeme.io tag created for the next Running Man cohort.
- `RUNNING_MAN_CRON_SECRET`: random server-only value required by the reconciliation route.
- `RUNNING_MAN_ATTEMPT_SECRET`: random server-only HMAC secret for opaque checkout-attempt cookies.
- `RUNNING_MAN_OWNER_EMAIL`: Ceech’s authorized email for audited refund reopening and minimum-enrollment alerts.
- `NEXT_PUBLIC_APP_URL`: canonical base URL for Checkout success/cancel URLs.
- Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` remain server/client scoped exactly as they are today.

In Stripe Dashboard, create four one-time USD Products/Prices named for “The Running Man Method — Founding Cohort, September 24–October 22, 2026” and “Private Coaching with Ceech.” Set the visible business name, logo, support email, and receipt branding to Dance With Ceech. Keep automatic tax and promotion codes disabled. Leave the existing live Payment Links active until test-mode end-to-end verification passes; deactivate them only during the final live cutover task.

## Task 1: Establish a testable foundation and configuration boundary

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/running-man/config.ts`
- Create: `src/lib/running-man/types.ts`
- Create: `src/lib/running-man/terms.ts`
- Create: `tests/running-man-state.test.ts`

- [ ] **Step 1: Add the initial failing configuration tests.**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { COHORT, currentTerms } from "@/lib/running-man/config";

test("the cohort configuration locks the approved prices and dates", () => {
  assert.deepEqual(COHORT.tiers.map((tier) => tier.priceCents), [19700, 24700, 29700]);
  assert.equal(COHORT.checkoutCutoffIso, "2026-09-18T06:59:00.000Z");
  assert.equal(COHORT.coaching.priceCents, 10000);
  assert.equal(currentTerms.version, "running-man-2026-08-22");
});
```

- [ ] **Step 2: Add `tsx` and Stripe as pinned dependencies, and add the targeted test command.**

Run `npm install stripe@<current-tested-version>` and `npm install --save-dev tsx@<current-tested-version>`, then add:

```json
"test:running-man": "tsx --test tests/running-man-*.test.ts tests/running-man-method-page.test.mjs"
```

Record the exact installed versions in `package-lock.json`; do not use a floating version.

- [ ] **Step 3: Run the test to verify it fails because the module is missing.**

Run: `npm run test:running-man`

Expected: FAIL with a module-not-found error for `@/lib/running-man/config`.

- [ ] **Step 4: Implement the minimal immutable configuration and types.**

`config.ts` must export a frozen `COHORT` object with:

```ts
export const COHORT = {
  slug: "running-man-method-fall-2026",
  checkoutCutoffIso: "2026-09-18T06:59:00.000Z",
  seats: 12,
  tiers: [
    { index: 1, ceiling: 3, priceCents: 19700, priceEnv: "RUNNING_MAN_STRIPE_PRICE_197" },
    { index: 2, ceiling: 6, priceCents: 24700, priceEnv: "RUNNING_MAN_STRIPE_PRICE_247" },
    { index: 3, ceiling: 12, priceCents: 29700, priceEnv: "RUNNING_MAN_STRIPE_PRICE_297" },
  ],
  coaching: { seats: 3, priceCents: 10000, priceEnv: "RUNNING_MAN_STRIPE_PRICE_COACHING" },
} as const;
```

`terms.ts` owns the version and the five required acknowledgments. `types.ts` defines a JSON-safe `EnrollmentState`, `CheckoutRequest`, and tagged `CheckoutResult`; client types must never contain Price IDs or service credentials.

- [ ] **Step 5: Run the targeted test and TypeScript check.**

Run: `npm run test:running-man && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add package.json package-lock.json src/lib/running-man/config.ts src/lib/running-man/types.ts src/lib/running-man/terms.ts tests/running-man-state.test.ts
git commit -m "feat: add running man enrollment configuration"
```

## Task 2: Build the pure, truthful enrollment state model

**Files:**

- Create: `src/lib/running-man/state.ts`
- Modify: `tests/running-man-state.test.ts`

- [ ] **Step 1: Write failing state-model tests.**

Cover at minimum:

```ts
test("initial state advertises the first three $197 seats without zero claimed copy", () => { /* ... */ });
test("three unreopened allocations advance the active tier to $247", () => { /* ... */ });
test("a held final first-tier seat pauses checkout instead of exposing $247", () => { /* ... */ });
test("refund review consumes capacity but is not shown as a paid student", () => { /* ... */ });
test("three active paid coaching upgrades are sold out while a reviewed upgrade is under review", () => { /* ... */ });
test("deadline closes new checkout but a pre-deadline session state can remain pending", () => { /* ... */ });
test("eleven paid students plus one under-review allocation shows capacity under review, not waitlist", () => { /* ... */ });
```

- [ ] **Step 2: Run the test to verify each assertion fails.**

Run: `npm run test:running-man`

Expected: FAIL because `deriveEnrollmentState` does not yet exist.

- [ ] **Step 3: Implement `deriveEnrollmentState`.**

Accept a normalized aggregate:

```ts
type EnrollmentAggregate = {
  now: Date;
  activePaidStudents: number;
  capacityConsumed: number;
  tiers: Record<1 | 2 | 3, {
    activePaid: number;
    allocationConsumed: number;
    underReview: number;
    activeHolds: number;
  }>;
  coaching: {
    activePaid: number;
    underReview: number;
    activeHolds: number;
  };
  hasOpenPreDeadlineSession: boolean;
};
```

Return copy and flags only, including `activeTier`, `canStartCheckout`, `requiresPriceReconfirmation`, `coachingStatus` (`available | held | under_review | sold_out`), `enrollmentStatus` (`open | tier_held | sold_out | closed`), and the exact CTA label. Use cumulative tier ceilings; never use only active-paid students to calculate price capacity.

- [ ] **Step 4: Run targeted tests and lint.**

Run: `npm run test:running-man && npm run lint -- src/lib/running-man/state.ts tests/running-man-state.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/running-man/state.ts tests/running-man-state.test.ts
git commit -m "feat: derive running man enrollment state"
```

## Task 3: Create the private Supabase schema and atomic reservation API

**Files:**

- Create via CLI: `supabase/migrations/<generated>_running_man_enrollment.sql`
- Create: `src/lib/running-man/repository.ts`
- Modify: `src/lib/supabase-admin.ts`
- Create: `tests/running-man-checkout.test.ts`

- [ ] **Step 1: Verify the current Supabase changelog and CLI/MCP availability before database work.**

Fetch `https://supabase.com/changelog.md`, check current Supabase docs for migrations, RLS, and RPC guidance, then run `supabase --help`. If no CLI is available, install or authenticate the approved project CLI/MCP before continuing; do not hand-name a migration file.

- [ ] **Step 2: Write failing repository-contract tests with an in-memory fake.**

The tests must require the repository boundary to call one atomic reservation operation and must reject any client-supplied Price ID:

```ts
test("a stale confirmed tier returns the latest state without a reservation", async () => { /* ... */ });
test("cohort-only checkout never reserves coaching", async () => { /* ... */ });
test("the final coaching slot allows one concurrent reservation only", async () => { /* ... */ });
test("parallel requests from one checkout-attempt cookie create one active reservation only", async () => { /* ... */ });
test("a direct client Price ID is ignored", async () => { /* ... */ });
```

- [ ] **Step 3: Generate the migration with the discovered CLI command, then write the schema.**

The migration must create:

- `running_man_cohorts` with immutable dates, cutoff, seat caps, and terms version;
- `running_man_reservations` with UUID, cohort FK, tier index, base amount, coaching selection, accepted terms version/timestamp, attempt hash, Stripe Session ID, PaymentIntent ID, Charge ID, state, expiry, and audit timestamps;
- `running_man_stripe_events` keyed by Stripe Event ID for idempotency; and
- `running_man_audit_events` for state transitions and error evidence.
- `running_man_checkout_attempts` with a hashed opaque cookie ID, selected coaching state, first/last request time, request-count window, and optional active reservation ID; and
- owner-action and minimum-evaluation fields on `running_man_cohorts` so the system records when the eight-student decision was evaluated and when Ceech was notified.

Enable RLS on all five tables. Create **no** `anon` or `authenticated` policies or table grants. Revoke public execution from all new functions.

Create a non-public, `SECURITY DEFINER` RPC named `private.reserve_running_man_checkout(...)` with `SET search_path = ''`, fully qualified table names, and parameters:

```sql
(p_cohort_slug text,
 p_expected_tier smallint,
 p_include_coaching boolean,
 p_terms_version text,
 p_attempt_hash text)
```

Within one transaction, insert-or-lock the checkout-attempt row by its HMAC hash with `FOR UPDATE`, then lock the cohort row with `FOR UPDATE`; use database `now()` rather than client time; reject a post-cutoff call; compare expected tier and terms; compute **per-tier** unreopened allocations plus active holds against the current tier ceiling; compute coaching capacity from `paid`, `refund_review`, `disputed`, and active holds; return a stale/held/sold-out result without inserting a reservation when appropriate; otherwise insert a 30-minute `creating_checkout` reservation. Add a partial unique index that permits only one reservation in `creating_checkout` or `checkout_open` state per checkout-attempt row. Seed the single Fall 2026 cohort by slug.

Also create these narrowly scoped private RPCs, each with one transaction, row locks where needed, empty `search_path`, full relation qualification, and explicit `service_role` grants only:

```sql
private.attach_running_man_session(p_reservation_id uuid, p_session_id text)
private.apply_running_man_stripe_event(p_event_id text, p_event_type text, p_session_id text, p_payment_intent_id text, p_charge_id text, p_payload jsonb)
private.reconcile_running_man_reservation(p_reservation_id uuid, p_stripe_status text, p_payment_status text, p_session_id text, p_payment_intent_id text, p_charge_id text)
private.evaluate_running_man_minimum(p_cohort_slug text)
private.reopen_running_man_reservation(p_reservation_id uuid, p_actor_email text, p_reason text)
```

`apply_running_man_stripe_event` must insert the Event ID under a uniqueness constraint, lock the reservation, apply the legal ordered transition, persist Session/PaymentIntent/Charge IDs, and write the audit row **in the same transaction**. If any transition fails, the Event ID insert must roll back so Stripe can retry. `reopen_running_man_reservation` must accept only a fully refunded `refund_review` reservation and append an owner audit event.

Expose the `private` schema to PostgREST only as needed for server calls, then grant `USAGE` on `private` and `EXECUTE` on the listed RPCs exclusively to `service_role`; grant neither privilege to `PUBLIC`, `anon`, nor `authenticated`. Call the functions only through `supabaseAdmin.schema("private").rpc(...)`. Add an integration test proving that exact path succeeds with the service role while anon and authenticated requests cannot read any of the five tables or call private RPCs.

- [ ] **Step 4: Run RLS/security checks before exposing any server code.**

Use `supabase db advisors` when available, or the authenticated Supabase advisor equivalent. Verify that the service role can call the RPC and that unauthenticated Data API calls cannot list tables or execute the private function.

- [ ] **Step 5: Implement the server-only repository.**

Use `supabaseAdmin` only. Its public functions should be narrow:

```ts
reserveCheckout(input): Promise<ReservationDecision>
attachStripeSession(reservationId, sessionId): Promise<void>
getOrCreateCheckoutAttempt(input): Promise<CheckoutAttempt>
replaceUnpaidAttemptSelection(input): Promise<CheckoutAttempt>
applyStripeEventAtomically(input): Promise<TransitionResult>
recoverCreatingReservation(input): Promise<RecoveryResult>
evaluateMinimumEnrollment(cohortSlug): Promise<MinimumEvaluation>
reopenRefundedReservation(input): Promise<void>
getEnrollmentAggregate(): Promise<EnrollmentAggregate>
```

Do not return customer email, Stripe metadata, or service credentials to the browser.

- [ ] **Step 6: Run unit tests, database integration checks, and build.**

Run: `npm run test:running-man && npx tsc --noEmit && npm run build`

Expected: PASS. Also manually verify the reservation RPC under two concurrent connections for the last $197 and last coaching slots, the service-role/anon/authenticated privilege boundary, and per-tier counts after a refund review and reopen.

- [ ] **Step 7: Commit.**

```bash
git add supabase/migrations src/lib/supabase-admin.ts src/lib/running-man/repository.ts tests/running-man-checkout.test.ts
git commit -m "feat: add running man inventory reservations"
```

## Task 4: Create hosted Stripe Checkout from a reservation

**Files:**

- Create: `src/lib/stripe.ts`
- Create: `src/lib/running-man/checkout.ts`
- Create: `src/app/api/running-man/checkout/route.ts`
- Modify: `tests/running-man-checkout.test.ts`

- [ ] **Step 1: Write failing checkout-service tests.**

Test these exact cases:

```ts
test("creates exactly one fixed cohort line item for a valid $197 reservation", async () => { /* ... */ });
test("adds the fixed coaching line item only when the reservation selected coaching", async () => { /* ... */ });
test("uses reservation ID as Stripe idempotency key and metadata", async () => { /* ... */ });
test("writes trusted reservation metadata to the PaymentIntent for pre-completion refund recovery", async () => { /* ... */ });
test("reuses a matching active browser attempt without a second hold", async () => { /* ... */ });
test("issues a new signed attempt cookie before first checkout", async () => { /* ... */ });
test("changing coaching selection expires the prior unpaid session before creating a replacement", async () => { /* ... */ });
test("returns reconfirmation without a reservation when current tier or coaching changed", async () => { /* ... */ });
test("rejects missing acknowledgment, stale terms, and post-cutoff requests", async () => { /* ... */ });
```

- [ ] **Step 2: Run the tests and confirm failure.**

Run: `npm run test:running-man`

Expected: FAIL because the Stripe client and checkout service do not exist.

- [ ] **Step 3: Implement the Stripe client and checkout service.**

`src/lib/stripe.ts` must be server-only, instantiate `stripe` with the installed SDK’s pinned API version, and throw a safe configuration error when keys are absent.

`createRunningManCheckout` must:

1. issue a 256-bit opaque attempt ID when absent, store only its HMAC hash, and set a signed `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/running-man`, 30-minute cookie; rate-limit by attempt hash plus a hashed network signal in `running_man_checkout_attempts`;
2. reuse a same-selection open Session for repeated clicks; if coaching selection changes, retrieve the prior Session, finalize if paid, otherwise expire it in Stripe, mark/release its reservation only after Stripe verifies expiry/unpaid, and then create one replacement hold;
3. call the atomic repository reservation function with tier/coaching/terms expectations;
4. return a typed reconfirmation result before any reservation on stale input;
5. create a Stripe hosted `mode: "payment"` Session with only card-based immediate payment methods, fixed quantities, no promotion codes, automatic tax disabled, name/email collection enabled, `expires_at` 30 minutes ahead, metadata containing only trusted identifiers, **and the same server-generated reservation ID/cohort slug in `payment_intent_data.metadata`** so pre-completion refund/dispute events can be resolved safely; use Dance With Ceech success/cancel URLs;
6. use reservation ID as Stripe idempotency key;
7. attach the returned Session ID before returning `{ checkoutUrl }`; and
8. release the reservation if Session creation fails, while retrying the same idempotent request if the database write after Session creation fails.

The route accepts only:

```ts
{ expectedTier: 1 | 2 | 3; includeCoaching: boolean; termsVersion: string; acknowledged: true }
```

Never accept Price IDs, quantities, or a total from the request.

- [ ] **Step 4: Run tests and a Stripe test-mode manual checkout.**

Run: `npm run test:running-man && npm run build`

In Stripe **test mode**, create a $197 checkout without coaching and a $197 + $100 checkout. Confirm one receipt and the correct line items; do not use a live card or live API key.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/stripe.ts src/lib/running-man/checkout.ts src/app/api/running-man/checkout/route.ts tests/running-man-checkout.test.ts
git commit -m "feat: create controlled running man checkout"
```

## Task 5: Finalize inventory only from signed Stripe webhooks

**Files:**

- Create: `src/lib/running-man/webhook.ts`
- Create: `src/app/api/stripe/running-man-webhook/route.ts`
- Create: `src/app/api/cron/running-man-reconcile/route.ts`
- Create or modify: `vercel.json`
- Create: `tests/running-man-webhook.test.ts`

- [ ] **Step 1: Write failing webhook and reconciliation tests.**

Cover:

```ts
test("rejects a webhook with an invalid raw-body signature", async () => { /* ... */ });
test("deduplicates only by Stripe Event ID and still processes a later refund", async () => { /* ... */ });
test("checkout.session.completed with paid status finalizes only allowlisted line items", async () => { /* ... */ });
test("expiry never releases a Session that Stripe still reports open or paid", async () => { /* ... */ });
test("refund review and dispute retain base and coaching capacity", async () => { /* ... */ });
test("reconciliation finalizes a paid orphaned session and preserves holds during Stripe outage", async () => { /* ... */ });
test("a crash after reservation but before session attachment recovers the matching metadata session", async () => { /* ... */ });
test("a creating reservation with no recoverable Stripe session is released after the recovery grace window", async () => { /* ... */ });
test("a partial refund does not enter refund review and full refund does", async () => { /* ... */ });
test("refund and dispute events find the reservation through persisted Charge and PaymentIntent IDs", async () => { /* ... */ });
test("a refund or dispute arriving before completion is not deduplicated until its reservation is resolved", async () => { /* ... */ });
test("a closed dispute remains capacity-consuming and never reopens inventory automatically", async () => { /* ... */ });
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm run test:running-man`

Expected: FAIL because the webhook service is missing.

- [ ] **Step 3: Implement signature verification and ordered transitions.**

Read `await request.text()` exactly once, verify with `STRIPE_WEBHOOK_SECRET`, allowlist live/test mode according to server config, retrieve paginated line items, and allowlist exact Prices, currency, amounts, quantities, cohort slug, and reservation metadata.

Handle:

- `checkout.session.completed` only when `payment_status === "paid"`;
- `checkout.session.expired` only after retrieving Stripe and confirming `status === "expired"` and `payment_status === "unpaid"`;
- `checkout.session.async_payment_succeeded` defensively;
- `charge.refunded` as `refund_review`; and
- `charge.dispute.created` / `charge.dispute.closed` as ordered dispute transitions.

Pass every verified event to `apply_running_man_stripe_event`, which atomically deduplicates by Event ID, locks and transitions the reservation, saves Charge/PaymentIntent mappings, and records its audit row. A verified paid transition wins over expiration. For a `charge.refunded` event, retrieve the Charge and verify that `amount_refunded === amount` before moving to `refund_review`; partial refunds are audited and alert Ceech without changing enrollment capacity. Refund/dispute lookups must use the persisted Charge ID first and PaymentIntent ID second. If neither mapping exists, retrieve the Stripe PaymentIntent and resolve only an allowlisted, server-written reservation ID in its metadata; if it still cannot resolve, do **not** persist the Event ID and return a retryable 5xx so Stripe redelivers. `charge.dispute.closed` remains capacity-consuming and never reopens inventory automatically. The handler must return a 2xx quickly after durable processing and log/alert invalid payloads rather than trusting them.

- [ ] **Step 4: Add the protected five-minute reconciliation route.**

Require `Authorization: Bearer ${RUNNING_MAN_CRON_SECRET}`. For each `creating_checkout` reservation with no Session ID past a short recovery grace period, scan recent Stripe Checkout Sessions for trusted `reservation_id` metadata and attach a match; if none exists after the grace period, record the failed recovery and release the hold. For every `checkout_open` reservation, retrieve Stripe, finalize verified paid Sessions, retain open/ambiguous Sessions, and release only verified expired/unpaid Sessions. After all valid pre-deadline Sessions resolve, call `evaluate_running_man_minimum`; it records the result once and sends Ceech an owner notification through Resend if active paid students are fewer than eight. Configure a five-minute Vercel cron only after confirming the current Vercel plan supports it; otherwise configure an equivalent authenticated scheduler before launch.

- [ ] **Step 5: Run local Stripe CLI forwarding and test events.**

Use the Stripe CLI in test mode to forward events to the local route. Trigger completion, expiry, duplicate delivery, refund, and dispute fixture events. Confirm the public count changes only after verified paid events.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/running-man/webhook.ts src/app/api/stripe/running-man-webhook/route.ts src/app/api/cron/running-man-reconcile/route.ts vercel.json tests/running-man-webhook.test.ts
git commit -m "feat: finalize running man purchases from stripe webhooks"
```

## Task 6: Build the public enrollment panel and replace static links

**Files:**

- Create: `src/app/api/running-man/enrollment-state/route.ts`
- Create: `src/components/running-man/EnrollmentPanel.tsx`
- Modify: `src/app/running-man-method/RunningManMethodPage.tsx`
- Modify: `tests/running-man-method-page.test.mjs`
- Modify: `tests/running-man-state.test.ts`

- [ ] **Step 1: Write failing UI/source assertions.**

Replace the four static-link test with assertions that:

```js
assert.doesNotMatch(component, /buy\.stripe\.com/);
assert.match(component, /EnrollmentPanel/);
assert.equal(component.match(/Claim .*\$197/g)?.length ?? 0, 0); // labels live in panel state
```

Add unit tests for the client-safe state mapping: first three copy, one/two claims, tier-held copy, $247/$297 transitions, sold out, deadline closed, coaching available/held/under-review/sold-out, and combined totals.

- [ ] **Step 2: Run tests to confirm failure.**

Run: `npm run test:running-man`

Expected: FAIL because static links still exist and the panel is absent.

- [ ] **Step 3: Implement the public state route.**

Use the repository aggregate and `deriveEnrollmentState`. Return only the typed display model, add `Cache-Control: private, max-age=0, s-maxage=15, stale-while-revalidate=0`, and include an `asOf` timestamp. On database failure, return only the most recent safe snapshot if one exists; otherwise return an unavailable state with no price or fabricated scarcity.

- [ ] **Step 4: Implement `EnrollmentPanel`.**

The component must:

- render all three price cards, but make only the active tier actionable;
- show benefit-led initial copy instead of “0 of 3 claimed”;
- poll the state endpoint only while the enrollment section is visible;
- show one required, accessible checkbox that represents all five commitment acknowledgments;
- render the $100 coaching checkbox before checkout, update the displayed total, and accurately show available, held, under-review, or sold-out copy;
- disable the one CTA until the commitment is acknowledged and current state allows checkout;
- POST only the allowed payload to `/api/running-man/checkout`, redirect to the returned hosted Checkout URL, and prevent double clicks;
- show a clear reconfirmation panel if the price or coaching availability changed; and
- show the sold-out waitlist only after 12 active paid enrollments, not while seats are held, while a refund/dispute allocation is under review, or after a non-sold-out deadline closure; and
- show an “Enrollment availability is under review” state when physical capacity is full but fewer than 12 students remain actively paid.

Keep keyboard focus, status announcements (`aria-live`), visible focus states, and non-JavaScript fallback copy intact.

- [ ] **Step 5: Replace the static section in `RunningManMethodPage.tsx`.**

Remove `checkoutLinks`, all individual purchase buttons, and the separate coaching Payment Link. Render one `EnrollmentPanel` in the existing enrollment section. Update the hero/mobile CTA to scroll to `#enroll`; do not create extra purchase buttons. Preserve approved pricing, program, refund, and minimum-enrollment copy.

- [ ] **Step 6: Run the page tests, lint, production build, and browser check.**

Run: `npm run test:running-man && npm run lint && npm run build`

Then inspect `/running-man-method` at desktop and mobile width. Confirm exactly one purchase action, ladder visibility, inaccessible future tiers, checkbox behavior, commitment gating, and no static Stripe link in page source.

- [ ] **Step 7: Commit.**

```bash
git add src/app/api/running-man/enrollment-state/route.ts src/components/running-man/EnrollmentPanel.tsx src/app/running-man-method/RunningManMethodPage.tsx tests/running-man-method-page.test.mjs tests/running-man-state.test.ts
git commit -m "feat: add running man enrollment panel"
```

## Task 7: Add confirmation, waitlist, and operational states

**Files:**

- Create: `src/app/running-man-method/confirmation/page.tsx`
- Create: `src/app/api/running-man-waitlist/route.ts`
- Create: `src/app/api/running-man/admin/reopen/route.ts`
- Modify: `src/components/running-man/EnrollmentPanel.tsx`
- Modify: `tests/running-man-checkout.test.ts`

- [ ] **Step 1: Write failing confirmation and waitlist tests.**

```ts
test("confirmation rejects a tampered or pending Checkout Session without customer data", async () => { /* ... */ });
test("confirmation derives coaching only from trusted Stripe line items", async () => { /* ... */ });
test("waitlist validates email, rejects a honeypot, and is idempotent", async () => { /* ... */ });
test("waitlist is unavailable before true sold out capacity", async () => { /* ... */ });
test("only the configured owner can reopen a fully refunded reservation and the action is audited", async () => { /* ... */ });
test("owner reopening rejects non-refunded, disputed, and non-owner requests", async () => { /* ... */ });
```

- [ ] **Step 2: Run tests and confirm failure.**

Run: `npm run test:running-man`

Expected: FAIL because confirmation and waitlist routes are absent.

- [ ] **Step 3: Implement the confirmation page.**

Read `{CHECKOUT_SESSION_ID}` server-side, retrieve the Session and paginated line items, verify expected mode/metadata/Prices/amount/quantity/live-or-test mode/payment status, and then display a neutral verified success or pending/invalid state. Never use a confirmation visit as fulfillment evidence; the webhook remains authoritative.

- [ ] **Step 4: Implement the dedicated waitlist route.**

Follow the existing `academy-waitlist` pattern but require name, email, explicit marketing consent, an empty honeypot, and a rate limit. Use the `RUNNING_MAN_SYSTEME_WAITLIST_TAG_ID` environment variable instead of a hard-coded tag. Normalize email and make repeated requests idempotent. The panel must state that the waitlist is not a paid reservation.

- [ ] **Step 5: Implement the owner-only reopening route.**

Require the existing NextAuth session and compare `session.user.email` to a server-only `RUNNING_MAN_OWNER_EMAIL` value. Accept a reservation UUID and a reason, then invoke `private.reopen_running_man_reservation`; never let the browser set a target state directly. The RPC records actor email, reason, timestamp, old state, and new state in the audit table. There is no public owner interface in this release; Ceech can use the protected endpoint only after a confirmed full Stripe refund.

- [ ] **Step 6: Run tests and manual flow checks.**

Run: `npm run test:running-man && npm run build`

Manually test confirmation with a valid Stripe test Session, a bad Session ID, a pending Session, and a sold-out mock state. Verify waitlist submission creates/tags one Systeme.io contact in a non-production test context.

- [ ] **Step 7: Commit.**

```bash
git add src/app/running-man-method/confirmation/page.tsx src/app/api/running-man-waitlist/route.ts src/app/api/running-man/admin/reopen/route.ts src/components/running-man/EnrollmentPanel.tsx tests/running-man-checkout.test.ts
git commit -m "feat: add running man confirmation and waitlist"
```

## Task 8: Verify end to end and cut over safely

**Files:**

- Modify if required: `.env.example` (never `.env.local`)
- Modify if required: `docs/superpowers/specs/2026-08-20-running-man-enrollment-checkout-design.md`

- [ ] **Step 1: Run all automated checks from a clean working tree.**

Run:

```bash
npm run test:running-man
npm run lint
npm run build
npm run check:redirects
npm run check:sitemap-canonicals
```

Expected: all PASS.

- [ ] **Step 2: Run test-mode end-to-end scenarios.**

Verify all of the following with Stripe test cards and test webhook forwarding:

1. First $197 enrollment without coaching.
2. First $197 enrollment with coaching, total $297 and one receipt.
3. First-tier transition after three paid test purchases.
4. Coaching sellout after three paid upgrades.
5. Last-seat and last-coaching concurrent checkout attempts.
6. Abandoned Session expiry returns the relevant capacity.
7. Duplicate webhook, refund, dispute, and out-of-order expiry events.
8. Deadline, minimum-eight, and Day-5 refund-copy boundaries.

- [ ] **Step 3: Perform launch readiness review with Ceech.**

Confirm live Product/Price IDs, Stripe business/receipt branding, support email, webhook endpoint secret, Vercel environment variables, protected reconciliation scheduler, Systeme.io tag, refund email copy, and the final dates. Review the behavior of existing live Payment Links before deactivation.

- [ ] **Step 4: Make the live cutover only with explicit approval.**

Set live environment values, deploy, configure live Stripe webhook delivery, and complete one authorized live checkout only if Ceech explicitly directs it. Then deactivate the four old static Payment Links and verify the deployed page has exactly one dynamic action. Do not perform a live payment test by default.

- [ ] **Step 5: Commit documentation changes and capture evidence.**

```bash
git add .env.example docs/superpowers/specs/2026-08-20-running-man-enrollment-checkout-design.md
git commit -m "docs: record running man checkout launch setup"
```

## Final verification checklist

- [ ] No `buy.stripe.com` URL remains in the Running Man page source.
- [ ] The page renders the entire ladder but exposes one purchase CTA only.
- [ ] Pricing, scarcity, coaching availability, and sold-out language are derived from server state and never fabricated.
- [ ] The server, not the browser, decides price, inventory, coaching, deadline, terms, and Stripe Prices.
- [ ] Stripe webhook signature verification and Event ID idempotency are exercised in test mode.
- [ ] RLS, private RPC privileges, service-role secrecy, refund/dispute capacity rules, and reconciliation are verified.
- [ ] The published Stripe brand says Dance With Ceech.

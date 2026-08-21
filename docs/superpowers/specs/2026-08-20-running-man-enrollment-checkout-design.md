# Running Man Method Enrollment and Checkout Design

## Objective

Replace the confusing three-button enrollment section with one automatically selected offer and one checkout action. Keep the complete founding-price ladder visible for transparency and urgency. Offer the limited $100 private-coaching upgrade as an optional item in the same Stripe checkout so the student receives one charge and one receipt.

## Approved Customer Experience

### Enrollment section

The page displays the complete founding-cohort ladder:

- First 3 students: $197, saving $100
- Next 3 students: $247, saving $50
- Final 6 students: $297, full price

All three tiers remain visible, but only the currently available tier is highlighted. Future tiers are informational and have no buttons. The page has exactly one enrollment button, and customers cannot select their own discount tier.

The highlighted tier, price, supporting copy, and button label update automatically from completed Stripe purchases.

### Initial state before the first purchase

Do not display “0 of 3 claimed.” Use benefit-led copy:

- “Founding offer now open”
- “Be one of the first 3 students and save $100”
- “Only three seats are available at this price”
- Button: “Claim One of the First 3 Spots — $197”

### Live scarcity after purchases begin

After the first completed purchase in a tier, show a truthful live count and remaining-seat message. Examples:

- “1 of 3 claimed · 2 spots left at $197”
- “2 of 3 claimed · 1 spot left at $197”

The button becomes more specific when appropriate, such as “Claim the Last $197 Spot.” Counts include completed payments only, not clicks, abandoned checkouts, or page views.

When the first three seats are purchased, $197 becomes unavailable and the active tier moves to $247. The same behavior repeats for the next three seats. After six total purchases, the final six seats are sold at $297. After 12 completed enrollments, the enrollment button is replaced with a waitlist action.

### Checkout

Clicking the single enrollment button opens Stripe Checkout at the active cohort price.

While coaching capacity remains, Stripe displays an unchecked optional item:

- “Add Private Coaching with Ceech — $100”
- One private 20-minute check-in during Week 1
- One private 20-minute check-in during Week 3
- A live availability message: “3 coaching spots available,” “Only 2 left,” or “Only 1 left”

Selecting the item adds $100 before payment. The customer sees the combined total and completes one payment with one receipt:

- $197 enrollment plus coaching: $297
- $247 enrollment plus coaching: $347
- $297 enrollment plus coaching: $397

If the student leaves the item unchecked, only the cohort price is charged. After three confirmed coaching purchases, the optional item is removed from new checkouts and shown as sold out wherever availability is mentioned.

## Technical Design

### Dynamic Checkout Sessions replace reusable purchase links

The existing three live Payment Links remain available only during development. Before launch, deactivate them and route every public enrollment action through one internal server endpoint. That endpoint creates a new Stripe Checkout Session at the server-selected price. Customers never receive a client-selected Price ID or a direct static link that can bypass the current tier.

Use fixed, one-time USD Stripe Prices for:

- $197 cohort enrollment
- $247 cohort enrollment
- $297 cohort enrollment
- $100 private coaching

Every Checkout Session contains exactly one non-adjustable cohort unit. Coaching, when available, is an optional item with a maximum quantity of one. Promotion codes and adjustable quantities remain disabled. Keep automatic tax collection disabled until Ceech receives tax guidance and intentionally enables it. Enable Stripe’s standard successful-payment receipt email and do not send a duplicate custom receipt.

Restrict the founding-cohort Checkout Sessions to immediate card-based payment methods so the inventory predicate can be unambiguous: a purchase counts only when the Session is complete and `payment_status` is `paid`. Wallets backed by card may appear through Stripe’s card configuration. Do not count pending, failed, expired, refunded, or disputed payments as paid inventory.

### Transactional reservations in Supabase

Use the project’s existing Supabase Postgres database to guarantee the 12-seat cohort cap, preserve price tiers, and guarantee the three-coaching-slot cap even when customers open Checkout concurrently.

Create server-only inventory and reservation records for the named cohort. Tables must have Row Level Security enabled with no public client policies. Only server code using the service-role credential may read or mutate them. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

A narrowly scoped Postgres function atomically:

1. Removes expired reservations.
2. Locks the cohort inventory row for the transaction.
3. Counts paid enrollments and active seat reservations.
4. Reserves the next available cohort seat at $197, $247, or $297.
5. Counts paid coaching upgrades and active coaching reservations.
6. Reserves one coaching opportunity for that Checkout Session when fewer than three coaching slots are paid or reserved.
7. Returns the reserved base Price, whether the coaching option is available, and the reservation expiry.

The function must not be publicly callable. If implemented as `SECURITY DEFINER`, set an empty `search_path`, fully qualify every relation, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant execution only to the server role.

Checkout Sessions expire after 30 minutes. If Stripe Session creation fails, release the database reservation immediately. If a customer pays for the cohort but does not select coaching, finalize the seat and release the coaching reservation. If the Session expires or is canceled, release both reservations. A scheduled cleanup runs at least every five minutes as a backstop for missed expiration events.

Because each open Checkout Session owns a temporary coaching reservation, no more than three simultaneous Sessions can offer coaching. This preserves the approved checkbox experience without allowing a fourth coaching purchase. A reservation can make coaching temporarily unavailable while another student decides; it automatically returns when that Session completes without coaching or expires.

### Live enrollment state

Create a server-only enrollment-state module backed by the inventory tables. It returns a typed view model with:

- paid enrollment count;
- active price tier;
- claimed and remaining counts for the tier;
- temporary reservation state when the last seat in a tier is currently held;
- coaching paid and temporarily reserved counts;
- current button copy;
- sold-out and waitlist state;
- an `asOf` timestamp.

Marketing copy reports completed paid purchases as “claimed.” Active reservations affect which price can be offered but are never described as completed purchases. If the last $197 seat is temporarily reserved, show that it is “currently held in checkout” rather than falsely reporting another purchase. When the hold expires, the $197 offer may reopen.

The page may cache this public view model for no more than 15 seconds and should refresh it while the enrollment section is visible. Stripe webhooks invalidate the cached state immediately. The internal checkout endpoint always performs an uncached atomic reservation.

If the price available at click time differs from the price last rendered, show an interstitial with the newly available amount and require explicit confirmation before creating Checkout. Never silently reprice a customer.

### Coaching availability inside Stripe

The Checkout Session includes the optional $100 coaching item only when that Session owns a coaching reservation. Use customer-visible coaching Product variants or supported Stripe custom text so the optional item truthfully says “3 coaching spots available,” “Only 2 left,” or “Only 1 left” at Session creation. Do not claim that an already-open Checkout page is continuously live; its reservation makes the displayed availability valid for that Session until it completes or expires.

### Stripe webhook and reconciliation

Add a dedicated Stripe webhook endpoint that reads the raw request body and verifies `STRIPE_WEBHOOK_SECRET` before processing. Allowlist the expected live-mode cohort and coaching Price IDs and the cohort metadata. Reject or alert on unexpected mode, currency, amount, quantity, or Price.

Handle at minimum:

- `checkout.session.completed` with `payment_status=paid`;
- `checkout.session.expired`;
- `checkout.session.async_payment_succeeded` defensively, even though delayed methods are disabled;
- full refunds;
- disputes.

Webhook processing is idempotent by Stripe Session or Event ID, tolerates duplicate and out-of-order delivery, retrieves all paginated line items, finalizes or releases reservations, invalidates the public state cache, and records an audit trail. A protected scheduled reconciliation compares active reservations with Stripe at least every five minutes and alerts Ceech when it detects a mismatch.

A full refund before the cohort begins reopens the cohort seat after owner confirmation. A coaching refund reopens coaching capacity only if the coaching service has not begun and Ceech confirms the slot can be resold. Disputes trigger an alert and do not automatically reopen inventory.

### Confirmation route

Redirect Stripe to a Dance With Ceech confirmation route containing `{CHECKOUT_SESSION_ID}`. The server retrieves the Session and verifies live mode, cohort metadata, expected Price IDs, quantity one, and `payment_status=paid` before saying the seat is secured. Derive coaching status from trusted Stripe line items. Invalid, pending, or tampered Session IDs receive a neutral verification message and expose no customer data. Visiting the confirmation page is never fulfillment evidence; the signed webhook is authoritative.

### Waitlist

When all 12 seats are paid or actively reserved, replace the purchase action with “Join the Next Cohort Waitlist.” Submit name, email, and explicit marketing consent to a dedicated `/api/running-man-waitlist` endpoint using the existing Systeme.io integration and a Running Man-specific tag configured by environment variable.

Validate and normalize email, make duplicate submissions idempotent, include a hidden honeypot and server-side rate limit, return accessible success and error states, and log delivery failures for owner follow-up. The copy must state that joining the waitlist is not a paid reservation.

## Error and Fallback Behavior

- If the inventory service cannot be reached, show the most recent non-sensitive snapshot with its “as of” time and label it as recently updated, not live. If no snapshot exists, show “Check current availability” without a price or scarcity claim.
- The checkout endpoint fails closed if it cannot atomically reserve a seat.
- If the displayed tier changed before click, require explicit confirmation of the new amount.
- Never display fabricated scarcity, estimated purchasers, checkout starts as purchases, or stale counts labeled as live.
- If all seats are paid or temporarily reserved, show the waitlist. If a hold expires, enrollment may reopen automatically.
- If Stripe Session creation fails after a database hold, release the hold and show a recoverable error.
- If webhook signature verification or reconciliation fails, log the error, alert the owner, and do not mutate inventory from an untrusted payload.

## Testing and Verification

Automated tests must cover:

- initial $197 state with benefit-led copy and no “0 claimed” message;
- one and two completed $197 purchases;
- automatic transition from $197 to $247 after three purchases;
- automatic transition from $247 to $297 after six total purchases;
- sold-out and waitlist state after 12 purchases;
- only one enrollment button at every purchasable state;
- full three-tier ladder remains visible and future tiers are non-interactive;
- coaching totals for all three base prices;
- coaching availability at three, two, one, and zero remaining;
- removal of the coaching optional item after the third completed coaching purchase;
- atomic concurrent attempts for the final cohort and coaching slots;
- abandoned and expired Checkout Sessions release holds;
- a paid enrollment without coaching releases its coaching reservation;
- card-only and paid-status enforcement;
- fixed quantities, exact USD Price IDs, amounts, and promotion-code settings;
- direct attempts to submit client-selected Price IDs are ignored or rejected;
- price-change interstitial and explicit reconfirmation;
- Stripe API errors, cache invalidation, polling, and timestamped stale-display handling;
- webhook raw-body signature rejection;
- duplicate and out-of-order Stripe events remain idempotent;
- paginated line-item retrieval;
- refund and dispute behavior;
- confirmation Session-ID tampering and pending status;
- waitlist validation, deduplication, spam protection, and delivery failure.

Manual verification must confirm test-mode and live-mode separation, Product and Price descriptions, displayed price, Stripe line items, optional coaching count, combined total, payment methods, receipt settings, confirmation message, reservation expiry, and seat limits. Use Stripe test mode for end-to-end payment verification; do not complete an unauthorized live charge.

## Out of Scope

- Building the four-week course curriculum or student portal
- Automating course access after purchase
- Scheduling the two private coaching sessions
- Payment plans or subscriptions
- Coupons beyond the approved automatic founding-price ladder
- A generalized inventory platform for future Dance With Ceech programs
- Reusing the three temporary live Payment Links after the dynamic checkout launches

# Running Man Method Enrollment and Checkout Design

## Objective

Replace the confusing three-button enrollment section with one automatically selected offer and one checkout action. Keep the complete founding-price ladder visible for transparency and urgency. Let the student select the limited $100 private-coaching upgrade on the Dance With Ceech enrollment page before opening Stripe, then charge the selected enrollment and coaching total in one Stripe payment with one receipt.

## Approved Customer Experience

### Enrollment section

The page displays the complete founding-cohort ladder:

- First 3 students: $197, saving $100
- Next 3 students: $247, saving $50
- Final 6 students: $297, full price

All three tiers remain visible, but only the currently available tier is highlighted. Future tiers are informational and have no buttons. The page has exactly one enrollment button, and customers cannot select their own discount tier.

The highlighted tier, price, supporting copy, and button label update automatically from completed Stripe purchases.

Enrollment closes September 17, 2026, at 11:59 p.m. Pacific Time, or earlier when all 12 seats have been purchased. The server—not the visitor's device—enforces the deadline. After the deadline, the page shows “Enrollment closed” and cannot create a new Checkout Session. A waitlist is not shown merely because the deadline passed; the approved next-cohort waitlist appears when the 12 paid seats sell out.

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

### Commitment confirmation and coaching selection

Enrollment remains direct purchase rather than application-first, but the student must complete a required commitment confirmation before the checkout button becomes available. The student acknowledges that:

- this is active training that requires practice and video submissions;
- practice videos will follow the approved gradual sharing progression, while graded Mastery Checkpoints remain private;
- weekly live participation and the Graduation Challenge are required unless an absence is approved;
- the student is at least 18 and can practice safely or has obtained appropriate medical clearance; and
- the student has reviewed the refund, cancellation, and postponement terms.

Record the accepted terms version and timestamp with the reservation. The page still has only one purchase button; the required commitment confirmation is not a second price or enrollment choice.

While coaching capacity remains, the enrollment page displays an unchecked option:

- “Add Private Coaching with Ceech — $100”
- One private 20-minute check-in during Week 1
- One private 20-minute check-in during Week 3
- A current availability message: “3 coaching spots available,” “Only 2 left,” or “Only 1 left”

Selecting coaching updates the total shown beside the enrollment button. If all coaching spots are paid or temporarily reserved, the option becomes unavailable and is shown as sold out. The student may still purchase the cohort without coaching.

### Stripe Checkout

Clicking the single enrollment button opens Stripe Checkout with the server-selected cohort price and, only when the student selected it and capacity was successfully reserved, the $100 coaching line item. The customer sees the combined total and completes one payment with one receipt:

- $197 enrollment plus coaching: $297
- $247 enrollment plus coaching: $347
- $297 enrollment plus coaching: $397

If the student leaves the option unchecked, only the cohort price is charged. After three confirmed coaching purchases, the option is removed from new enrollment attempts and shown as sold out wherever availability is mentioned. Stripe does not offer a second opportunity to add or remove coaching after the Dance With Ceech page creates the Checkout Session.

The Stripe product name and description identify the purchase as “The Running Man Method — Founding Cohort, September 24–October 22, 2026.” Customer-facing copy explains that the program includes four weekly training sessions on September 24, October 1, October 8, and October 15, followed by the live Graduation Challenge on the fifth Thursday, October 22. Enrollment is paid in full.

## Technical Design

### Dynamic Checkout Sessions replace reusable purchase links

The existing three live Payment Links remain available only during development. Before launch, deactivate them and route every public enrollment action through one internal server endpoint. That endpoint creates a new Stripe Checkout Session at the server-selected price. Customers never receive a client-selected Price ID or a direct static link that can bypass the current tier.

Use fixed, one-time USD Stripe Prices for:

- $197 cohort enrollment
- $247 cohort enrollment
- $297 cohort enrollment
- $100 private coaching

Every Checkout Session contains exactly one non-adjustable cohort unit. It contains one non-adjustable coaching unit only when the server successfully reserved the student's selected coaching upgrade. The checkout endpoint accepts a boolean coaching choice, never a client-selected amount or Price ID. Promotion codes and adjustable quantities remain disabled. Keep automatic tax collection disabled until Ceech receives tax guidance and intentionally enables it. Enable Stripe’s standard successful-payment receipt email and do not send a duplicate custom receipt.

Before launch, configure Stripe's customer-facing business name, logo, support details, and receipt branding as Dance With Ceech. Do not launch while the Checkout page identifies the offer only as “Shih-Chieh Hsu.”

Restrict the founding-cohort Checkout Sessions to immediate card-based payment methods so the inventory predicate can be unambiguous: a purchase first becomes inventory-consuming when the Session is complete and `payment_status` is `paid`. Wallets backed by card may appear through Stripe’s card configuration. Pending, failed, and expired Sessions never count as paid. A paid seat continues consuming inventory during refunds or disputes until an explicit owner-approved reopen transition occurs.

### Transactional reservations in Supabase

Use the project’s existing Supabase Postgres database to guarantee the 12-seat cohort cap, preserve price tiers, and guarantee the three-coaching-slot cap even when customers open Checkout concurrently.

Create server-only inventory and reservation records for the named cohort. Tables must have Row Level Security enabled with no public client policies. Only server code using the service-role credential may read or mutate them. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

A narrowly scoped Postgres function atomically:

1. Locks the cohort inventory row for the transaction.
2. Counts paid enrollments using the inventory-consuming states.
3. Selects the current tier from paid enrollments only: $197 until three are paid, $247 until six are paid, and $297 until 12 are paid.
4. Counts active reservations inside that current tier.
5. Reserves a current-tier seat only when paid enrollments plus active current-tier holds remain below that tier’s capacity.
6. If every remaining seat in the current tier is held, returns `current_tier_temporarily_held` and does not advance to the next tier.
7. Counts paid coaching upgrades and active coaching reservations.
8. If the student selected coaching, reserves one coaching slot only when fewer than three coaching slots are paid or actively reserved. A cohort-only checkout never consumes coaching capacity.
9. Returns the reservation ID, reserved base Price, whether coaching was reserved, and the reservation expiry.

The function must not be publicly callable. If implemented as `SECURITY DEFINER`, set an empty `search_path`, fully qualify every relation, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant execution only to the server role.

### Reservation and Checkout state machine

Reservation states are `creating_checkout`, `checkout_open`, `paid`, `release_pending`, `released`, `refund_review`, `reopened`, and `disputed`. Legal transitions are ordered and conditional; an older or lower-priority event cannot move a record backward. A verified paid transition always wins over an expiry transition.

The checkout workflow is:

1. Create a reservation ID through the atomic function with state `creating_checkout`.
2. Create Stripe Checkout using that reservation ID as both metadata and the Stripe idempotency key.
3. Persist the Stripe Session ID and move the reservation to `checkout_open` before returning the Stripe URL.
4. If Session creation fails, move the reservation to `release_pending` and release it.
5. If the database write fails after Stripe creates the Session, retry the same idempotent Stripe request to recover the same Session, persist it, and do not create another hold. Reconciliation also scans recent cohort Sessions by allowlisted metadata and repairs an unlinked reservation.

Store a signed, HttpOnly checkout-attempt identifier in the browser and reuse an existing active attempt when the customer repeats the same checkout selection. Bind the attempt to the selected cohort and coaching choice. If a customer returns from Stripe and changes the coaching selection, the server must first verify and expire or finalize the earlier unpaid Session before replacing its reservation; it must never create overlapping holds for one browser attempt. Rate-limit the checkout endpoint by attempt identifier and network signals so repeated clicks or a malicious client cannot hold all seats or coaching opportunities.

Checkout Sessions expire after 30 minutes. An expiry webhook first locks the reservation and confirms `status=expired` and `payment_status=unpaid` before releasing its cohort seat and any selected coaching slot. Scheduled cleanup never releases by database time or unpaid status alone: it retrieves the associated Stripe Session, keeps every open Session on hold, keeps the hold during Stripe outages or ambiguous status, finalizes a verified paid Session, and releases only when both `status=expired` and `payment_status=unpaid`. A protected reconciliation runs at least every five minutes as a backstop.

Because each open Checkout Session that includes coaching owns a temporary coaching reservation, no more than three simultaneous Sessions can include the upgrade. A selected coaching spot can become temporarily unavailable while another student completes payment; it automatically returns if that Session expires unpaid.

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

Marketing copy reports completed paid purchases as “claimed.” Active reservations never advance the public price ladder and are never described as completed purchases. If every remaining $197 seat is temporarily reserved, show that the current discount is “currently held in checkout” and pause new checkout attempts; do not expose $247 until three $197 enrollments are paid. When a hold is verified expired and released, $197 reopens.

The page may cache this public view model for no more than 15 seconds and should refresh it while the enrollment section is visible. Stripe webhooks invalidate the cached state immediately. The internal checkout endpoint always performs an uncached atomic reservation.

If the price available at click time differs from the price last rendered, show an interstitial with the newly available amount and require explicit confirmation before creating Checkout. Never silently reprice a customer.

If the student selected coaching but the last coaching spot became unavailable before the atomic reservation, do not silently remove the upgrade or open a lower-total Checkout. Explain that private coaching has just sold out and ask the student to confirm cohort-only enrollment.

### Coaching availability before Stripe

The Dance With Ceech page calculates currently available coaching capacity from three total slots minus paid coaching purchases and active coaching reservations. The availability message may change as holds are created or released, so describe it as currently available rather than as a completed-purchase count. The checkout endpoint always rechecks capacity atomically.

Stripe receives the $100 coaching line item only after the student selected coaching and the server reserved it. Webhook validation accepts only the single allowlisted coaching Price ID. The Stripe page shows the selected purchase and total; it does not display a second coaching checkbox or claim continuously changing availability.

### Enrollment deadline, minimum, and refunds

Store the September 17, 2026, 11:59 p.m. Pacific enrollment cutoff as a server-owned cohort timestamp. The atomic reservation function refuses new reservations after that instant, even if a visitor has an older page open. A Checkout Session created before the cutoff may remain valid only through its original 30-minute expiration; the system never creates or extends a Session after the deadline.

The cohort requires at least eight paid students. At the enrollment cutoff, notify Ceech if fewer than eight students have paid so Ceech can cancel or postpone the cohort. Do not automatically change dates, issue refunds, or transfer students without Ceech's decision.

The customer-facing terms remain:

- full refund through Day 5 of the program;
- no refunds after Day 5, including for missed sessions or unfinished assignments; and
- if Ceech cancels or postpones the cohort, the student may choose a full refund—including any coaching add-on—or transfer after the next cohort dates are confirmed.

Refund and transfer administration remains an owner action. The inventory state rules below prevent an issued refund from accidentally overselling a seat before Ceech decides whether it should reopen.

### Stripe webhook and reconciliation

Add a dedicated Stripe webhook endpoint that reads the raw request body and verifies `STRIPE_WEBHOOK_SECRET` before processing. Allowlist the expected live-mode cohort and coaching Price IDs and the cohort metadata. Reject or alert on unexpected mode, currency, amount, quantity, Price, coaching selection, or accepted-terms version.

Handle at minimum:

- `checkout.session.completed` with `payment_status=paid`;
- `checkout.session.expired`;
- `checkout.session.async_payment_succeeded` defensively, even though delayed methods are disabled;
- `charge.refunded` for successful full refunds;
- `charge.dispute.created` and `charge.dispute.closed`.

Webhook delivery is deduplicated only by Stripe Event ID. Stripe Session ID is the inventory aggregate key governed by the ordered state machine, so later legitimate refund or dispute events for an already-paid Session are still processed. The handler tolerates duplicate and out-of-order delivery, retrieves all paginated line items, finalizes or releases reservations, invalidates the public state cache, and records an audit trail. A protected scheduled reconciliation compares active reservations with Stripe at least every five minutes and alerts Ceech when it detects a mismatch.

Inventory-consuming purchase states are `paid`, `refund_review`, and `disputed`. `charge.refunded` moves an eligible purchase to `refund_review` and alerts Ceech but does not free capacity. An authenticated owner action may move it to `reopened` when the full refund is confirmed and the seat can be resold. A coaching refund may reopen coaching capacity only if the service has not begun and Ceech approves it. Disputes remain capacity-consuming, trigger an alert, and never reopen inventory automatically.

### Confirmation route

Redirect Stripe to a Dance With Ceech confirmation route containing `{CHECKOUT_SESSION_ID}`. The server retrieves the Session and verifies live mode, cohort metadata, expected Price IDs, quantity one, and `payment_status=paid` before saying the seat is secured. Derive coaching status from trusted Stripe line items. Invalid, pending, or tampered Session IDs receive a neutral verification message and expose no customer data. Visiting the confirmation page is never fulfillment evidence; the signed webhook is authoritative.

### Waitlist

When all 12 seats are paid, replace the purchase action with “Join the Next Cohort Waitlist.” If fewer than 12 are paid before the deadline but all remaining final-tier seats are temporarily held, show “Remaining seats are currently held in checkout” with a refresh action—not the waitlist. If the September 17 deadline passes with fewer than 12 paid seats, show “Enrollment closed” rather than claiming the cohort sold out. A valid pre-deadline Checkout Session may still complete during its original 30-minute hold; if that payment brings the cohort to 12 paid seats, the page then changes from closed to the sold-out waitlist. Submit sold-out waitlist name, email, and explicit marketing consent to a dedicated `/api/running-man-waitlist` endpoint using the existing Systeme.io integration and a Running Man-specific tag configured by environment variable.

Validate and normalize email, make duplicate submissions idempotent, include a hidden honeypot and server-side rate limit, return accessible success and error states, and log delivery failures for owner follow-up. The copy must state that joining the waitlist is not a paid reservation.

## Error and Fallback Behavior

- If the inventory service cannot be reached, show the most recent non-sensitive snapshot with its “as of” time and label it as recently updated, not live. If no snapshot exists, show “Check current availability” without a price or scarcity claim.
- After the September 17 cutoff, fail closed and show “Enrollment closed,” even if a cached snapshot still shows seats.
- The checkout endpoint fails closed if it cannot atomically reserve a seat.
- If the displayed tier changed before click, require explicit confirmation of the new amount.
- If selected coaching became unavailable, require explicit confirmation before continuing without it.
- Never display fabricated scarcity, estimated purchasers, checkout starts as purchases, or stale counts labeled as live.
- Show the waitlist only after 12 paid enrollments. When current-tier seats are only held, show a temporary-hold state and refresh option without advancing the tier.
- If Stripe Session creation fails after a database hold, release the hold and show a recoverable error.
- If webhook signature verification or reconciliation fails, log the error, alert the owner, and do not mutate inventory from an untrusted payload.

## Testing and Verification

Automated tests must cover:

- initial $197 state with benefit-led copy and no “0 claimed” message;
- required commitment confirmation and recorded terms version before checkout;
- one and two completed $197 purchases;
- automatic transition from $197 to $247 after three purchases;
- automatic transition from $247 to $297 after six total purchases;
- sold-out and waitlist state after 12 purchases;
- only one enrollment button at every purchasable state;
- full three-tier ladder remains visible and future tiers are non-interactive;
- coaching totals for all three base prices;
- coaching availability at three, two, one, and zero remaining on the enrollment page;
- cohort-only checkout never reserves or charges coaching;
- selected coaching is reserved atomically and appears as one fixed $100 Stripe line item;
- removal of the coaching option after the third completed coaching purchase;
- coaching sellout between page render and click requires cohort-only reconfirmation;
- atomic concurrent attempts for the final cohort and coaching slots;
- abandoned and expired Checkout Sessions release holds;
- all current-tier seats held without advancing the public price;
- 12 held seats never produce a sold-out or waitlist claim before 12 payments;
- payment-versus-expiry races always preserve a verified paid seat;
- cleanup during a Stripe outage keeps the reservation;
- failure after Session creation but before Session-ID persistence repairs the same idempotent attempt;
- repeated checkout requests reuse or rate-limit the attempt rather than multiplying holds;
- changing the coaching choice cannot create overlapping holds for one checkout attempt;
- card-only and paid-status enforcement;
- fixed quantities, exact USD Price IDs, amounts, and promotion-code settings;
- direct attempts to submit client-selected Price IDs are ignored or rejected;
- price-change interstitial and explicit reconfirmation;
- server-enforced September 17 deadline, including a visitor with a stale open page;
- no automatic waitlist or sold-out claim when the deadline passes below 12 paid seats;
- minimum-eight enrollment notification and owner-controlled cancellation or postponement;
- full cancellation or postponement refund includes selected coaching;
- Stripe API errors, cache invalidation, polling, and timestamped stale-display handling;
- webhook raw-body signature rejection;
- duplicate and out-of-order Stripe events remain idempotent;
- paginated line-item retrieval;
- refund and dispute behavior;
- owner-approved full-refund reopening;
- confirmation Session-ID tampering and pending status;
- waitlist validation, deduplication, spam protection, and delivery failure.

Manual verification must confirm test-mode and live-mode separation, Dance With Ceech merchant branding, cohort dates and fifth-Thursday graduation description, Product and Price descriptions, displayed price, coaching selection and availability, Stripe line items, combined total, payment methods, receipt settings, confirmation message, reservation expiry, enrollment cutoff, and seat limits. Use Stripe test mode for end-to-end payment verification; do not complete an unauthorized live charge.

## Out of Scope

- Building the four-week course curriculum or student portal
- Automating course access after purchase
- Scheduling the two private coaching sessions
- Payment plans or subscriptions
- Coupons beyond the approved automatic founding-price ladder
- A generalized inventory platform for future Dance With Ceech programs
- Reusing the three temporary live Payment Links after the dynamic checkout launches

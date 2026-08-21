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

New checkout attempts close September 17, 2026, at 11:59 p.m. Pacific Time, or earlier when all 12 seats have been purchased. The server—not the visitor's device—enforces the deadline. A Checkout Session successfully opened before the deadline keeps its original 30-minute reservation, which is disclosed beside the deadline. After the deadline, the page shows “Enrollment closed” and cannot create a new Checkout Session. A waitlist is not shown merely because the deadline passed; the approved next-cohort waitlist appears when the 12 paid seats sell out.

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

The checkout endpoint rejects a missing or stale commitment acknowledgment even if someone bypasses the page controls. The server owns the current terms version and records that version and the server timestamp with the reservation. If the terms have changed since the page was rendered, require the student to review and accept the current version. The page still has only one purchase button; the required commitment confirmation is not a second price or enrollment choice.

While coaching capacity remains, the enrollment page displays an unchecked option:

- “Add Private Coaching with Ceech — $100”
- One private 20-minute check-in during Week 1
- One private 20-minute check-in during Week 3
- A current availability message: “3 coaching spots available,” “Only 2 left,” or “Only 1 left”

Selecting coaching updates the total shown beside the enrollment button. If all remaining coaching spots are temporarily reserved, disable the option and say “Coaching spots are currently held in checkout,” with a refresh action. Reserve “sold out” for three active paid coaching purchases. If a refunded or disputed coaching allocation retains capacity, describe the affected spot as unavailable while its status is under review; never present it as a paid purchase. The student may still purchase the cohort without coaching.

### Stripe Checkout

Clicking the single enrollment button opens Stripe Checkout with the server-selected cohort price and, only when the student selected it and capacity was successfully reserved, the $100 coaching line item. The customer sees the combined total and completes one payment with one receipt:

- $197 enrollment plus coaching: $297
- $247 enrollment plus coaching: $347
- $297 enrollment plus coaching: $397

If the student leaves the option unchecked, only the cohort price is charged. After three active paid coaching purchases, the option is removed from new enrollment attempts and shown as sold out wherever availability is mentioned. If a later refund or dispute retains one of those slots, the option remains unavailable but the copy changes to under review rather than paid or sold out. Stripe does not offer a second opportunity to add or remove coaching after the Dance With Ceech page creates the Checkout Session.

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
2. Counts completed-payment seat allocations using the inventory-consuming states and separately counts currently paid students using only the `paid` state.
3. Selects the current tier from completed-payment allocations that have not been explicitly reopened: $197 until three allocations are consumed, $247 until six are consumed, and $297 until 12 are consumed.
4. Compares the server's current tier, coaching availability, and terms version with the state the student explicitly confirmed.
5. If any confirmed value is stale, returns the current state without creating a reservation so the page can request reconfirmation.
6. Counts active reservations inside the confirmed current tier.
7. Reserves a current-tier seat only when unreopened completed-payment tier allocations plus active current-tier holds remain below that tier’s cumulative ceiling of three, six, or 12. Active paid-student count is never used for tier-capacity arithmetic.
8. If every remaining seat in the current tier is held, returns `current_tier_temporarily_held` and does not advance to the next tier.
9. Counts all capacity-consuming coaching allocations (`paid`, `refund_review`, and `disputed`) plus active coaching reservations.
10. If the student selected coaching, reserves one coaching slot only when fewer than three coaching slots are capacity-consuming or actively reserved. If coaching became unavailable, returns the current state without reserving either item. A cohort-only checkout never consumes coaching capacity.
11. Returns the reservation ID, reserved base Price, whether coaching was reserved, the accepted server-owned terms version and timestamp, and the reservation expiry.

The function must not be publicly callable. If implemented as `SECURITY DEFINER`, set an empty `search_path`, fully qualify every relation, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant execution only to the server role.

Keep three counts distinct throughout the implementation:

- **active paid students:** reservations currently in `paid`; used for the eight-student minimum and never includes a fully refunded enrollment;
- **capacity consumed:** `paid`, `refund_review`, and `disputed`; used to prevent overselling the 12 physical seats; and
- **completed-payment tier allocations:** capacity-consuming seats that originated from a successful payment and have not been owner-reopened; used to preserve the founding-price ladder after a refund or dispute.

Public “claimed” copy reports only active `paid` enrollments. If a refunded or disputed allocation affects availability before the deadline, describe that seat as unavailable while its status is being reviewed; do not present it as a paid student. Ceech may explicitly reopen the allocation after a confirmed full refund, at which point it no longer consumes capacity or a pricing-tier allocation.

### Reservation and Checkout state machine

Reservation states are `creating_checkout`, `checkout_open`, `paid`, `release_pending`, `released`, `refund_review`, `reopened`, and `disputed`. Legal transitions are ordered and conditional; an older or lower-priority event cannot move a record backward. A verified paid transition always wins over an expiry transition.

The checkout workflow is:

1. Send the server the tier, coaching choice, and terms version the student explicitly confirmed. Do not accept amounts or Price IDs from the client.
2. In one atomic function, compare those expected values with current state. If they differ, return the new state without creating any reservation and require reconfirmation.
3. When the confirmed values still match, create a reservation ID with state `creating_checkout`.
4. Create Stripe Checkout using that reservation ID as both metadata and the Stripe idempotency key.
5. Persist the Stripe Session ID and move the reservation to `checkout_open` before returning the Stripe URL.
6. If Session creation fails, move the reservation to `release_pending` and release it.
7. If the database write fails after Stripe creates the Session, retry the same idempotent Stripe request to recover the same Session, persist it, and do not create another hold. Reconciliation also scans recent cohort Sessions by allowlisted metadata and repairs an unlinked reservation.

Store a signed, HttpOnly checkout-attempt identifier in the browser and reuse an existing active attempt when the customer repeats the same checkout selection. Bind the attempt to the selected cohort and coaching choice. If a customer returns from Stripe and changes the coaching selection, the server must first verify and expire or finalize the earlier unpaid Session before replacing its reservation; it must never create overlapping holds for one browser attempt. Rate-limit the checkout endpoint by attempt identifier and network signals so repeated clicks or a malicious client cannot hold all seats or coaching opportunities.

Checkout Sessions expire after 30 minutes. An expiry webhook first locks the reservation and confirms `status=expired` and `payment_status=unpaid` before releasing its cohort seat and any selected coaching slot. Scheduled cleanup never releases by database time or unpaid status alone: it retrieves the associated Stripe Session, keeps every open Session on hold, keeps the hold during Stripe outages or ambiguous status, finalizes a verified paid Session, and releases only when both `status=expired` and `payment_status=unpaid`. A protected reconciliation runs at least every five minutes as a backstop.

Because each open Checkout Session that includes coaching owns a temporary coaching reservation, no more than three simultaneous Sessions can include the upgrade. A selected coaching spot can become temporarily unavailable while another student completes payment; it automatically returns if that Session expires unpaid.

### Live enrollment state

Create a server-only enrollment-state module backed by the inventory tables. It returns a typed view model with:

- paid enrollment count;
- active price tier;
- claimed and remaining counts for the tier;
- temporary reservation state when the last seat in a tier is currently held;
- coaching active-paid, capacity-under-review, and temporarily reserved counts;
- current button copy;
- sold-out and waitlist state;
- an `asOf` timestamp.

Marketing copy reports active paid purchases as “claimed.” Active reservations never advance the public price ladder and are never described as completed purchases. Unreopened refund or dispute allocations preserve tier capacity but are labeled unavailable under review, not paid. If every remaining $197 seat is temporarily reserved, show that the current discount is “currently held in checkout” and pause new checkout attempts; do not expose $247 until three completed-payment allocations consume the first tier. When a hold is verified expired and released, $197 reopens.

The page may cache this public view model for no more than 15 seconds and should refresh it while the enrollment section is visible. Stripe webhooks invalidate the cached state immediately. The internal checkout endpoint always performs an uncached atomic reservation.

If the price available at click time differs from the price last rendered, the atomic comparison returns the newly available amount without reserving anything. Show an interstitial and require explicit confirmation before retrying. Never silently reprice a customer.

If the student selected coaching but the last coaching spot became unavailable before the atomic reservation, return without reserving anything. Do not silently remove the upgrade or open a lower-total Checkout. If three active paid purchases consume the slots, explain that private coaching has sold out; if the spots are reserved, explain that they are currently held in checkout; if a refund or dispute retains a slot, explain that availability is under review. Ask the student to confirm cohort-only enrollment.

### Coaching availability before Stripe

The Dance With Ceech page calculates currently available coaching capacity from three total slots minus all capacity-consuming coaching allocations (`paid`, `refund_review`, and `disputed`) and active coaching reservations. It separately reports active paid coaching purchases so a refunded or disputed allocation is never called paid or sold out. The availability message may change as holds are created, reviewed, reopened, or released, so describe it as currently available rather than as a completed-purchase count. The checkout endpoint always rechecks capacity atomically.

Stripe receives the $100 coaching line item only after the student selected coaching and the server reserved it. Webhook validation accepts only the single allowlisted coaching Price ID. The Stripe page shows the selected purchase and total; it does not display a second coaching checkbox or claim continuously changing availability.

### Enrollment deadline, minimum, and refunds

Store the September 17, 2026, 11:59 p.m. Pacific new-checkout cutoff as a server-owned cohort timestamp. The atomic reservation function refuses new reservations after that instant, even if a visitor has an older page open. A Checkout Session created before the cutoff may remain valid only through its original 30-minute expiration; the system never creates or extends a Session after the deadline. Customer-facing deadline copy states that a checkout successfully opened before 11:59 p.m. retains its displayed 30-minute reservation.

The cohort requires at least eight active paid students. After the enrollment cutoff, wait until every valid pre-deadline Checkout Session is either verified paid or verified expired before evaluating the minimum and notifying Ceech. A fully refunded enrollment does not count toward eight. If fewer than eight active paid students remain at that evaluation point, Ceech can cancel or postpone the cohort. Do not automatically change dates, issue refunds, or transfer students without Ceech's decision.

The customer-facing terms, disclosed before commitment confirmation, are:

- a written refund request emailed to `dancewithceech@gmail.com` from the address used to purchase, with the subject “Running Man Method Refund Request,” and received no later than September 28, 2026, at 11:59 p.m. Pacific Time—the end of Day 5—receives a full refund, including any coaching add-on;
- no refunds after Day 5, including for missed sessions or unfinished assignments; and
- if Ceech cancels or postpones the cohort, the student may choose a full refund—including any coaching add-on—or transfer after the next cohort dates are confirmed.

The pre-purchase disclosure also states that the cohort requires eight paid students and may be canceled or postponed if that minimum is not reached. After all valid pre-deadline Sessions resolve, notify affected students by email after Ceech decides whether to run, postpone, or cancel the cohort. Refund eligibility is based on the received timestamp shown in the Dance With Ceech Gmail mailbox, not when Ceech later reads or processes it. Preserve the request email with the enrollment record as the audit evidence.

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

Inventory-consuming purchase states are `paid`, `refund_review`, and `disputed`, but only `paid` counts as an active paid student. `charge.refunded` moves an eligible purchase to `refund_review` and alerts Ceech but does not free capacity or its tier allocation. An authenticated owner action may move it to `reopened` when the full refund is confirmed and the seat can be resold. A coaching refund may reopen coaching capacity only if the service has not begun and Ceech approves it. Disputes remain capacity-consuming, trigger an alert, and never reopen inventory automatically.

### Confirmation route

Redirect Stripe to a Dance With Ceech confirmation route containing `{CHECKOUT_SESSION_ID}`. The server retrieves the Session and verifies live mode, cohort metadata, expected Price IDs, quantity one, and `payment_status=paid` before saying the seat is secured. Derive coaching status from trusted Stripe line items. Invalid, pending, or tampered Session IDs receive a neutral verification message and expose no customer data. Visiting the confirmation page is never fulfillment evidence; the signed webhook is authoritative.

### Waitlist

When all 12 seats are paid, replace the purchase action with “Join the Next Cohort Waitlist.” If fewer than 12 are paid before the deadline but all remaining final-tier seats are temporarily held, show “Remaining seats are currently held in checkout” with a refresh action—not the waitlist. If the September 17 deadline passes with fewer than 12 paid seats, show “Enrollment closed” rather than claiming the cohort sold out. A valid pre-deadline Checkout Session may still complete during its original 30-minute hold; if that payment brings the cohort to 12 paid seats, the page then changes from closed to the sold-out waitlist. Submit sold-out waitlist name, email, and explicit marketing consent to a dedicated `/api/running-man-waitlist` endpoint using the existing Systeme.io integration and a Running Man-specific tag configured by environment variable.

Validate and normalize email, make duplicate submissions idempotent, include a hidden honeypot and server-side rate limit, return accessible success and error states, and log delivery failures for owner follow-up. The copy must state that joining the waitlist is not a paid reservation.

## Error and Fallback Behavior

- If the inventory service cannot be reached, show the most recent non-sensitive snapshot with its “as of” time and label it as recently updated, not live. If no snapshot exists, show “Check current availability” without a price or scarcity claim.
- After the September 17 new-checkout cutoff, fail closed and show “Enrollment closed,” even if a cached snapshot still shows seats. Previously opened Sessions retain only their original 30-minute reservation.
- The checkout endpoint fails closed if it cannot atomically reserve a seat.
- If the displayed tier changed before click, require explicit confirmation of the new amount.
- If selected coaching became unavailable, create no reservation and require explicit confirmation before continuing without it.
- Never display fabricated scarcity, estimated purchasers, checkout starts as purchases, or stale counts labeled as live.
- Show the waitlist only after 12 paid enrollments. When current-tier seats are only held, show a temporary-hold state and refresh option without advancing the tier.
- If Stripe Session creation fails after a database hold, release the hold and show a recoverable error.
- If webhook signature verification or reconciliation fails, log the error, alert the owner, and do not mutate inventory from an untrusted payload.

## Testing and Verification

Automated tests must cover:

- initial $197 state with benefit-led copy and no “0 claimed” message;
- required commitment confirmation and recorded terms version before checkout;
- direct checkout-endpoint calls without current commitment acknowledgment are rejected;
- a terms-version change requires re-acceptance and creates no reservation;
- one and two completed $197 purchases;
- automatic transition from $197 to $247 after three purchases;
- automatic transition from $247 to $297 after six total purchases;
- sold-out and waitlist state after 12 purchases;
- only one enrollment button at every purchasable state;
- full three-tier ladder remains visible and future tiers are non-interactive;
- coaching totals for all three base prices;
- coaching availability at three, two, one, and zero remaining on the enrollment page;
- temporary coaching holds display “currently held,” while only three paid upgrades display “sold out”;
- cohort-only checkout never reserves or charges coaching;
- selected coaching is reserved atomically and appears as one fixed $100 Stripe line item;
- removal of the coaching option after the third completed coaching purchase;
- coaching sellout between page render and click requires cohort-only reconfirmation;
- atomic concurrent attempts for the final cohort and coaching slots;
- seat-tier capacity uses unreopened completed-payment allocations plus active holds, never active paid-student count;
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
- stale tier or coaching preflight returns without creating a reservation;
- server-enforced September 17 deadline, including a visitor with a stale open page;
- a Checkout Session opened before the deadline retains only its disclosed original 30-minute hold;
- no automatic waitlist or sold-out claim when the deadline passes below 12 paid seats;
- minimum-eight enrollment notification and owner-controlled cancellation or postponement;
- minimum-eight evaluation waits for every valid pre-deadline Session to become paid or verified expired;
- seven paid students plus one open pre-deadline Session evaluates as eight if that Session pays during its valid hold, and as seven only after verified expiry;
- refunded or disputed capacity is never presented as an active paid student;
- active-paid, capacity-consumed, and tier-allocation counts remain distinct through refunds and owner reopening;
- refunded or disputed coaching remains capacity-consuming until owner-approved reopening and can never expose a fourth coaching slot;
- coaching copy distinguishes active paid, temporarily held, and unavailable-under-review slots;
- full cancellation or postponement refund includes selected coaching;
- Day 5 refund boundary uses the Gmail received timestamp for requests sent to `dancewithceech@gmail.com` through September 28 at 11:59 p.m. Pacific, including immediately-before and immediately-after cases;
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

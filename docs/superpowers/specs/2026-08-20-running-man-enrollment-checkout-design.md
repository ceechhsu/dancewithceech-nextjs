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

### Stripe remains the source of truth

Use the three existing live Payment Links and their completed Checkout Sessions as the authoritative record for cohort sales. Their existing completed-payment limits remain in force:

- $197 link: 3 completed payments
- $247 link: 3 completed payments
- $297 link: 6 completed payments

The website must never infer sales from clicks or client-side state.

### Server-side enrollment state

Create a server-only enrollment-state module that uses `STRIPE_SECRET_KEY` to:

1. Count completed Checkout Sessions for each cohort Payment Link.
2. Select the first tier whose completed-payment limit has not been reached.
3. Count completed sessions containing the private-coaching Price.
4. Return a small, typed view model containing the active price, claimed count, remaining count, button copy, coaching availability, and sold-out state.

The public page receives only non-sensitive counts, prices, and public checkout destinations. Stripe secret keys and internal API responses never reach the browser.

The landing page may use a short cache for display performance, but the enrollment action must recheck Stripe without a stale cache immediately before redirecting. Stripe’s own Payment Link limits remain the final protection against selling too many cohort seats.

### Coaching optional item

Configure the $100 private-coaching Price as an optional item on the active cohort Payment Links while fewer than three coaching purchases have completed. When the third purchase completes, remove the optional item from all cohort links through the Stripe API so new Checkout Sessions cannot add it.

Stripe Payment Links do not provide shared product inventory across multiple links. Therefore, the implementation must document and test the small concurrency edge case in which multiple students already have Checkout open when the last coaching spot sells. For this 8–12-person founding cohort, the acceptable mitigation is:

- recheck coaching capacity before redirecting;
- remove the optional item immediately after the third completed purchase is detected;
- prevent the option from appearing in new sessions once sold out;
- record and surface any over-cap purchase for immediate owner review and refund or accommodation.

A future high-volume version should move coaching selection to a transactionally reserved pre-checkout step if a mathematically strict shared inventory cap becomes necessary.

### Checkout completion and confirmation

After payment, Stripe shows a confirmation page or redirects to a Dance With Ceech confirmation route. The confirmation must state that the cohort seat is secured, show whether coaching was purchased, and explain that welcome details will arrive by email.

### Waitlist

When 12 completed cohort payments have been recorded, replace the purchase action with “Join the Next Cohort Waitlist.” The waitlist must capture at least name and email and clearly state that it is not a paid reservation.

## Error and Fallback Behavior

- If Stripe cannot be reached while rendering the page, show the last known non-sensitive state when available; otherwise show a neutral “Check current availability” button without claiming a seat count.
- The click-through enrollment endpoint must fail closed rather than route a customer to a tier known to be full.
- If a lower-price link fills between page render and click, re-evaluate and route the customer to the newly active price only after clearly showing the new amount before payment.
- Never display fabricated scarcity, estimated purchasers, or counts based on checkout starts.
- If all tiers are full, never send customers to a Payment Link; send them to the waitlist.

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
- Stripe API errors and stale-display handling;
- duplicate Stripe event or repeated reconciliation does not double-count a purchase.

Manual verification must confirm that the displayed price, button destination, Stripe line items, combined total, confirmation message, and seat limits agree in live mode without completing an unauthorized test charge.

## Out of Scope

- Building the four-week course curriculum or student portal
- Automating course access after purchase
- Scheduling the two private coaching sessions
- Payment plans or subscriptions
- Coupons beyond the approved automatic founding-price ladder
- A generalized inventory platform for future Dance With Ceech programs

# Running Man Method Funnel Analytics

## Goal

Make the existing Google Analytics property useful for evaluating the new Running Man Method offer without adding a new analytics vendor or changing the visitor-facing design.

## Chosen approach

Use Google Analytics 4 custom events for the visitor journey and retain Stripe plus the existing enrollment database as the source of truth for paid enrollments. Meta Pixel remains responsible for its existing page-view tracking; this scope does not add advertising-conversion events.

This approach keeps the website fast, gives one understandable funnel in GA4, and avoids treating a confirmation-page visit as proof that a payment cleared.

## Funnel events

| Event | Meaning | Parameters |
| --- | --- | --- |
| `running_man_video_started` | The visitor starts the short Running Man demonstration. | `placement` |
| `running_man_video_half_watched` | The visitor reaches at least 50% of the demonstration. | `placement` |
| `running_man_video_completed` | The visitor reaches the end of the demonstration. | `placement` |
| `running_man_offer_cta_clicked` | The visitor clicks an offer CTA leading to the Method page or enrollment section. | `placement` |
| `running_man_private_coaching_selected` | The visitor opts into the $100 coaching add-on before checkout. | `selected` |
| `running_man_checkout_opened` | The site successfully creates a Stripe Checkout URL and is about to send the visitor there. | `tier`, `coaching_selected`, `value` |
| `running_man_waitlist_joined` | The waitlist request succeeds. | none |

`placement` distinguishes the homepage campaign banner, homepage teaser, and Method-page hero. The existing GA4 automatic `page_view` event supplies visitor counts for `/running-man-method`.

## Reliability and privacy

- Events contain no name, email address, payment details, or other personal information.
- The checkout event fires only after the website receives a valid Stripe Checkout URL, not on a disabled or failed button press.
- A paid enrollment remains a Stripe/Supabase fact. It is not inferred from a thank-you page because someone can pay and close the browser before returning.
- The analytics loader continues to defer third-party scripts until a visitor interacts or the page is idle, protecting the homepage performance work already completed.

## Implementation shape

1. Extract a small browser-only analytics helper from the existing deferred analytics component. It queues GA4 events safely even if the library has not loaded yet.
2. Introduce one reusable tracked-video component. It emits each watch milestone at most once per video view.
3. Introduce one reusable tracked-link component for Running Man offer CTAs.
4. Instrument the checkout, coaching selection, and waitlist-success moments in the enrollment panel.
5. Add focused automated source-level behavior tests and run the existing Running Man test suite, lint, and production build.

## Measurement

In GA4, use a funnel exploration with:

`page_view` for `/running-man-method` → `running_man_video_started` → `running_man_checkout_opened`

Compare that to completed paid enrollments in Stripe or the enrollment database. After enough traffic accumulates, this reveals whether the main friction is page interest, video engagement, checkout intent, or payment completion.

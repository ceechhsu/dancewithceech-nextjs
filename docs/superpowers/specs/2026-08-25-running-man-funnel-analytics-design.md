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
| `running_man_video_reached_midpoint` | Natural playback reaches the midpoint of the demonstration. | `placement` |
| `running_man_video_completed` | Playback reaches `ended`. | `placement` |
| `running_man_offer_cta_clicked` | The visitor clicks an offer CTA leading to the Method page or enrollment section. | `placement`, `destination` |
| `running_man_private_coaching_selected` | The visitor opts into the $100 coaching add-on before checkout. | `placement` |
| `running_man_checkout_opened` | The site successfully creates a Stripe Checkout URL and is about to send the visitor there. | `tier`, `coaching_selected`, `value`, `currency` |
| `running_man_waitlist_joined` | The waitlist request succeeds. | `placement` |

Parameter values are deliberately small and fixed:

- `placement`: `homepage_campaign_banner`, `homepage_teaser`, `method_page_hero`, or `method_page_enrollment`.
- `destination`: `method_page` or `enrollment_section`.
- `tier`: `founding_197`, `founding_247`, or `standard_297`.
- `coaching_selected`: `yes` or `no`.
- `value`: the final checkout amount in US dollars, including the $100 coaching add-on when selected.
- `currency`: always `USD`.

The coaching-selection event is emitted only when the visitor opts in, not when they uncheck the box. The existing GA4 automatic `page_view` event supplies visitor counts for `/running-man-method`.

## Reliability and privacy

- Events contain no name, email address, payment details, or other personal information.
- The video is not autoplayed. Start is emitted once for each mounted video when its first `play` event occurs. Midpoint is emitted once only when normal playback crosses 50%; seeking past it does not count. Completion is emitted only from `ended`. Replays do not add duplicate milestones until the visitor opens a fresh page view.
- The checkout event fires only after the website receives a valid Stripe Checkout URL, not on a disabled or failed button press. It asks GA4 to send immediately, waits for its callback for at most 250 milliseconds, then redirects to Stripe regardless. If analytics is blocked or unavailable, checkout continues normally and the event may be absent.
- A paid enrollment remains a Stripe/Supabase fact. It is not inferred from a thank-you page because someone can pay and close the browser before returning.
- The analytics loader continues to defer third-party scripts until a visitor interacts or the page is idle, protecting the homepage performance work already completed.
- The site currently has no separate cookie-consent system, so these events follow the existing GA4 behavior and contain no personal information. If Consent Mode or a consent manager is later introduced, the shared helper must send no events until analytics consent is granted.

## Implementation shape

1. Extract a small browser-only analytics helper from the existing deferred analytics component. It initializes the existing deferred tag when needed, queues normal events safely, and supports the bounded callback used before the external Stripe redirect.
2. Introduce one reusable tracked-video component. It emits each watch milestone at most once per video view.
3. Introduce one reusable tracked-link component for Running Man offer CTAs.
4. Instrument the checkout, coaching selection, and waitlist-success moments in the enrollment panel.
5. Add focused automated source-level behavior tests and run the existing Running Man test suite, lint, and production build.

## GA4 reporting setup and launch prerequisite

Before these production events are deployed, register these event-scoped custom dimensions in the existing GA4 property: `placement`, `destination`, `tier`, and `coaching_selected` as text; `value` already follows GA4's monetary-event convention alongside `currency`. This is a one-time GA4 dashboard setting and can take 24–48 hours before parameter breakdowns appear. GA4 custom dimensions are not retroactive, so this setup must be complete before launch traffic is sent. Verify the named events and their parameters in GA4 DebugView or Realtime after deployment.

Use an open funnel with a 30-day window for general interest:

1. `page_view`, filtered to `page_path` exactly `/running-man-method`.
2. `running_man_video_started` or `running_man_offer_cta_clicked`.
3. `running_man_checkout_opened`.

Use a separate same-session funnel for immediate conversion behavior. Paid enrollment counts come from Stripe/Supabase; they are compared to, rather than mixed into, GA4's checkout-start counts. This also covers checkout starts from either the method page or the homepage CTA.

Compare GA4's checkout-opened count to completed paid enrollments in Stripe or the enrollment database. After enough traffic accumulates, this reveals whether the main friction is page interest, video engagement, checkout intent, or payment completion.

# Private Lesson Free Offers Design

## Goal

Make the public private-lesson pages clearly distinguish the two public free starting points while keeping the 15-minute in-person demo as a discretionary offer that Ceech may make after a phone consultation.

## Public offers

1. **Free 30-minute phone consultation**
   - Available to prospective private-lesson clients.
   - Used to discuss goals, experience, and the appropriate lesson option.
   - Booked through the existing 30-minute Calendly link.

2. **Free video evaluation**
   - Available to prospective virtual private-lesson students.
   - Limited to one evaluation per person.
   - Uses one short, unlisted video submission.
   - Ceech responds within three business days with a private three-to-five-minute feedback video and a short written recap.
   - The feedback identifies one strength, the main problem, one corrective drill, and the first practice step.
   - The next paid step is a one-time $50, 30-minute live Follow-Up Lesson, normally $80, where Ceech watches the student apply the correction and refines it in real time.

## Non-public offer

The free 15-minute in-person demo is not advertised or promised on the website. Ceech may offer it selectively after the phone consultation when it is appropriate for a prospective in-person student.

## Page changes

- **Main private-lessons page:** Label the hero CTA, pricing CTAs, and booking section as a free 30-minute phone consultation. Remove the promise that the call leads to a free demo. Keep the video-evaluation CTA and form inside the virtual-lesson pathway, and state that it is for prospective virtual students.
- **San Jose private-lessons page:** Replace every public 15-minute consultation reference in metadata, structured FAQ data, CTA copy, and the booking section with a free 30-minute phone consultation. Do not advertise the demo. Keep the existing route to the main private-lessons page for virtual options and identify the video evaluation there as the free virtual starting point.
- **Bay Area private-lessons page:** Replace every public 15-minute consultation reference in structured FAQ data, CTA copy, and the booking section with a free 30-minute phone consultation. Do not advertise the demo. Identify the free video evaluation as the option for prospective virtual students and link it to the existing form on the main private-lessons page.
- Label the existing 30-minute Calendly destination consistently as a **phone consultation**, not a class, demo, or video evaluation.
- Use concise, consistent descriptions instead of introducing a new large comparison component.
- Preserve current pricing, lesson eligibility, forms, booking destinations, and layout unless a small copy adjustment is required.

## Video evaluation form boundary

The existing form accepts an email address, an unlisted YouTube URL, and optional notes, and it already states that the offer is limited to one evaluation per person. This change will update the promised response time to three business days and clarify that the offer is for prospective virtual students. The current form does not technically prevent duplicate email submissions; database-backed duplicate enforcement and optional marketing consent are separate implementation work and are not implied by this copy clarification.

## Evaluation follow-up workflow

The feedback delivery includes one private call to action: the evaluation recipient may book a one-time $50 Follow-Up Lesson, normally $80, within seven days while the diagnosis is fresh. The response must show the recipient's exact expiration date. The discounted offer is not displayed in public pricing. Ceech follows up approximately two days after delivery and sends one final reminder near day seven. If the student completes the paid lesson and upgrades to the $250 recurring monthly plan within 48 hours, the $50 payment is applied to the first month, leaving a $200 upgrade balance. The website may explain that evaluation recipients receive a time-limited paid next step, but the private price and reminder cadence are internal rather than public promises.

## Verification

- Add `tests/private-lessons-free-offers.test.mjs` covering the main, San Jose, and Bay Area page files plus the imported `PrivateLessonsPricing` and `VideoEvalForm` components. Reject the explicit offer patterns `15-min consultation`, `15 minute consultation`, `15-minute consultation`, `15-min demo`, `15 minute demo`, and `15-minute demo`, allowing case differences and optional words such as `free`, `phone`, `in-person`, and `class`. Also reject the exact public-offer fragments `demo class`, `demo-class`, `free demo`, `lesson or demo`, and `schedule your demo`. Travel-duration phrases that do not contain `consultation` or `demo` remain allowed.
- Confirm all three pages identify the Calendly action as a free 30-minute phone consultation, retain `https://calendly.com/ceechhsu/30min`, and give the Calendly iframe an accessible title containing `Free 30-minute phone consultation`.
- Confirm the main page and the San Jose and Bay Area virtual pathways identify the free video evaluation as intended for prospective virtual students and link to `/private-lessons#video-eval`. Confirm the form states the one-per-person limit, private three-to-five-minute feedback format, short written recap, and three-business-day response. Public page source and rendered output must not expose the private $50 Follow-Up Lesson price.
- Check rendered page copy, metadata, and structured FAQ data separately so hidden search markup cannot retain the incorrect offer.
- Run `node --test tests/private-lessons-free-offers.test.mjs`, `npm run lint`, and `npm run build`.
- Inspect all three rendered pages locally at a 1440-pixel desktop width and a 390-pixel mobile width. Acceptance requires readable copy, no overlap or clipping, working consultation and video-evaluation navigation, and no publicly visible 15-minute demo promise.

## Deployment

This change will not be deployed unless the user separately approves deployment after reviewing the local result.

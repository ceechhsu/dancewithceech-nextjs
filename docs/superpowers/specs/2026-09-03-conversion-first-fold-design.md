# Conversion First-Fold Improvements

## Goal

Improve first-fold clarity and conversion confidence on the DanceWithCeech homepage, Private Lessons page, and Running Man Method page without changing the existing visual system, navigation, analytics, or SEO structure.

## Scope

1. Homepage: add a concise supporting line to the scrolly hero that states the service, audience, and geography/online availability while preserving the existing emotional headline and primary CTA.
2. Private Lessons: make the primary CTA accurately describe the free 30-minute consultation already offered by the booking section.
3. Running Man Method: surface the existing tracked enrollment CTA immediately after the opening audience/problem statement and before the video, while retaining the existing later CTA for visitors who need more detail.

## Design

The homepage hero remains a scroll-controlled canvas experience. Its accessible and visible text stack will be: emotional hook, H1, one-sentence context (“Hip-hop dance lessons in San Jose and online for adult beginners.”), existing rhythm tagline, then the existing primary and secondary actions. The added sentence will use the existing muted text treatment and will not add a new button.

The Private Lessons hero button will read “Book Your Free 30-Minute Consultation.” This keeps the existing booking target and avoids introducing a new conversion path.

The Running Man hero will add one existing `PrimaryCta` instance after the opening paragraph and before the video. Its current tracked destination and placement will be reused so analytics remain consistent. The existing CTA below the cohort facts remains as a second decision point for visitors who continue reading. The availability language will not be changed in this pass because live seat-state logic is outside the design scope.

## Verification

- Run the focused metadata/navigation/video/image tests.
- Run the production build.
- Inspect the rendered homepage, Private Lessons hero, and Running Man hero at desktop and mobile widths where available.
- Confirm the new text and CTA appear in the accessibility tree, the Running Man CTA still targets `#enroll`, and no duplicate or broken links are introduced.

## Out of scope

- Reworking the scrolly animation or hero frame loading.
- Adding sticky mobile navigation or a new booking flow.
- Changing pricing, testimonials, seat availability, structured data, or page metadata.

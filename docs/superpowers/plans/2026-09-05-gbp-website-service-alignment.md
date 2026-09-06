# GBP Website Service Alignment

## Approved scope

Use existing pages and styling. Add concise audition/competition coaching and social-dancing sections to Private Lessons, alongside wedding choreography. Add a community college dance section to Contact identifying Mission, West Valley, and Cabrillo and explaining direct college registration. Preserve four current college teaching roles, clarifying Gavilan weight training and past hip-hop teaching (2018–2020) on About and Running Man. No pricing, payment, enrollment behavior, GBP edits, or production deployment.

## Implementation plan

1. Add source-content regression tests in `tests/gbp-service-alignment.test.mjs`; run with `node --test` and verify missing-content failures.
2. Add `SpecializedLessons` to `src/components/PrivateLessonDetails.tsx` and render after `CelebrationLessons` in `src/app/private-lessons/page.tsx`. Use two responsive cards, concrete instruction, no outcome guarantees, and one free phone consultation link.
3. Add `#community-college-classes` to `src/app/contact/page.tsx`. State enrollment is through the college, not the private lesson studio or contact form. Do not invent schedules, fees, or registration URLs.
4. Clarify teaching subjects in `src/app/about/page.tsx` and `src/app/running-man-method/RunningManMethodPage.tsx`, keeping the four-college credential.
5. Run regression tests, existing relevant tests, TypeScript and scoped lint. Verify local desktop/mobile render, headings, and links using the in-app browser. Preview Private Lessons first for approval; do not deploy or commit existing unrelated changes.

## Preservation

The worktree contains substantial earlier changes. Edit only targeted additions in place; do not reset, stage, or commit unrelated files. The user has approved the approach and requested a localhost preview.

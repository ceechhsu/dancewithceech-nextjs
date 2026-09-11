# Homepage navigation and accessibility implementation plan

> For agentic workers: use test-first implementation and independent spec/code review. Work only in this isolated checkout; preserve the original checkout and do not deploy.

**Goal:** Implement the approved lesson-first navigation and readable, controllable homepage content.

**Architecture:** Keep Next.js server navigation shell; small client disclosures for desktop/mobile. Preserve all routes, Google sign-in, booking destinations, brand assets, and review content. Replace automatic testimonial motion with static/manual presentation. Keep deferred homepage loading.

**Tech Stack:** Next.js 16.3.4, React 19, Tailwind 4, existing Node test runner, in-app browser verification.

## Task 1 — Navigation

Files: src/components/Nav.tsx, MobileMenu.tsx, CampaignNavLink.tsx; new LearnFreeMenu.tsx as needed; tests/homepage-navigation-accessibility.test.mjs and outdated navigation expectations in tests/running-man-discovery.test.mjs.

- [ ] Write and run failing tests for Private Lessons first, Learn Free with tutorials /#dance-tutorials, BeatFirst and Blog, understated Running Man, About Ceech, blue booking CTA, retained sign-in.
- [ ] Implement desktop disclosure with keyboard/Escape/outside dismissal and clear focus; mobile collapsed logo/menu, scrollable expanded panel with booking first and matching links. Preserve authenticated user menu when provided. Use appropriate expanded/controls attributes, >=44px controls, no route prefetching. Switch to desktop only when the full nav fits.
- [ ] Run tests. Verify mobile menu closes on navigation and Escape, focus returns appropriately, Learn Free works from inner routes, and no tablet overflow.

## Task 2 — Motion and contrast

Files: src/components/ScrollyHero.tsx, TestimonialsMarquee.tsx, DeferredHomeTestimonials.tsx; new ManualVideoTestimonials.tsx; tests/homepage-motion-accessibility.test.mjs.

- [ ] Add failing tests for hero play/pause control, reduced-motion support, no moving written reviews, manual video selection, accessible blue review headings.
- [ ] Retain hero video/poster and add a >=44px explicit pause/resume button with actual media state feedback. Respect reduced motion; preserve primary links.
- [ ] Replace review marquee with three readable stationary featured cards, one full-width mobile column. Keep the remaining existing reviews in a disclosure; keep source/rating links. Do not invent review text.
- [ ] Replace homepage video rotation with a stationary selected thumbnail/player and Previous/Next buttons and count; stop old player when switching. Preserve all seven video IDs and lazy loading. Remove hover-only instructions. Use accessible text blue in both review labels.
- [ ] Run tests and verify pause/resume, reduced-motion startup, review expansion, previous/next, playback, and no automatic testimonial movement in browser.

## Task 3 — Validation / handoff

- [ ] Record baseline failures before changing code; distinguish outdated content assertions from regressions.
- [ ] Run relevant regression tests, lint, type/build checks. Inspect desktop 1280px, tablet 900px, mobile 390px and small 320px. Save screenshots and QA notes.
- [ ] Independent review for spec compliance, then code quality; address findings.
- [ ] Keep local preview available; report exactly what passed and what remains unverified. No push/deploy or unrelated edits.

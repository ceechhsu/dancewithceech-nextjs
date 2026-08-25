# Running Man Method Funnel Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track the Running Man Method visitor funnel in the existing GA4 property: page interest, video engagement, CTA usage, checkout opening, coaching interest, and waitlist success.

**Architecture:** A small client-side analytics module will own safe GA4 dispatching. Reusable tracked video and CTA components will keep instrumentation out of the offer copy and preserve the existing deferred loading strategy. Stripe/Supabase remain the authority for paid enrollments; GA4 records only visitor actions and checkout openings.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, GA4 `gtag`, Node test runner via `tsx --test`.

**Workspace:** Use the current `nextjs-site` checkout. The user explicitly chose Git-only workflow, so do not create a worktree.

---

## File structure

- Create `src/lib/analytics/client.ts`: browser-only GA4 setup, generic event dispatch, and bounded callback dispatch before an external navigation.
- Create `src/components/running-man/TrackedRunningManVideo.tsx`: `<video>` wrapper that emits one start, midpoint, and completion event per mounted player.
- Create `src/components/running-man/TrackedRunningManLink.tsx`: CTA link that records placement and destination before Next navigation.
- Modify `src/components/DeferredAnalytics.tsx`: use the shared GA4 initializer while retaining delayed third-party loading and existing Meta PageView behavior.
- Modify `src/components/RunningManCampaignBanner.tsx`: replace its raw video and offer link with tracked components.
- Modify `src/components/RunningManTeaser.tsx`: replace its raw video and offer link with tracked components.
- Modify `src/app/running-man-method/RunningManMethodPage.tsx`: use tracked video and CTA for the Method-page hero.
- Modify `src/components/running-man/EnrollmentPanel.tsx`: record coaching opt-in, successful checkout opening, and successful waitlist registration.
- Modify `tests/running-man-method-page.test.mjs` and `tests/running-man-discovery.test.mjs`: assert the required analytics units and event call sites exist.
- Create `tests/running-man-analytics.test.ts`: verify event names, fixed parameter contracts, event queuing, and bounded callback behavior in the shared module.

### Task 1: Define and verify the browser analytics contract

**Files:**

- Create: `tests/running-man-analytics.test.ts`
- Create: `src/lib/analytics/client.ts`

- [ ] **Step 1: Write failing tests for named, non-PII GA4 events and parameter contracts**

Cover `running_man_video_started`, `running_man_video_reached_midpoint`, `running_man_video_completed`, `running_man_offer_cta_clicked`, `running_man_private_coaching_selected`, `running_man_checkout_opened`, and `running_man_waitlist_joined`. Assert that checkout parameters use the approved tier labels, `yes`/`no` coaching state, a USD numeric value, and no customer fields.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm exec tsx --test tests/running-man-analytics.test.ts`

Expected: FAIL because the shared client analytics module does not exist.

- [ ] **Step 3: Implement the smallest shared analytics module**

Export a `trackRunningManEvent` function that initializes `dataLayer`/`gtag` only as needed and pushes an event with only approved properties. Export a `trackRunningManCheckoutThen` helper that forces the existing GA initializer and script load before dispatching `running_man_checkout_opened`, then waits for GA's `event_callback` or an independent 250-millisecond one-shot fallback before invoking the supplied redirect function. Tests must cover callback-first and timeout-first paths and prove each redirects exactly once. If GA is unavailable or blocked, the fallback redirect must still occur.

- [ ] **Step 4: Re-run the focused test**

Run: `npm exec tsx --test tests/running-man-analytics.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the module and tests**

Run: `git add src/lib/analytics/client.ts tests/running-man-analytics.test.ts && git commit -m "Add Running Man analytics event helpers"`

### Task 2: Keep analytics loading deferred

**Files:**

- Modify: `src/components/DeferredAnalytics.tsx`
- Test: `tests/running-man-analytics.test.ts`

- [ ] **Step 1: Add a failing test for deferred loading compatibility**

Assert the analytics initializer used by the shared module retains the existing measurement ID `G-BS0RYYMYHZ`, and that the global deferred component retains its actual behavior: a first interaction schedules an idle callback (with a 1.5-second deadline), while no interaction triggers loading after three seconds. Do not import an analytics package into the server bundle.

- [ ] **Step 2: Run the test to confirm failure**

Run: `npm exec tsx --test tests/running-man-analytics.test.ts`

Expected: FAIL because the deferred component and shared module have not been connected.

- [ ] **Step 3: Refactor `DeferredAnalytics` to call the shared initializer**

Keep the existing three-second/first-interaction behavior and Meta PageView setup. Do not change metadata, layout, visual design, or consent behavior.

- [ ] **Step 4: Re-run the focused test**

Run: `npm exec tsx --test tests/running-man-analytics.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/DeferredAnalytics.tsx tests/running-man-analytics.test.ts && git commit -m "Share deferred analytics setup"`

### Task 3: Instrument reusable video and homepage CTAs

**Files:**

- Create: `src/components/running-man/TrackedRunningManVideo.tsx`
- Create: `src/components/running-man/TrackedRunningManLink.tsx`
- Modify: `src/components/RunningManCampaignBanner.tsx`
- Modify: `src/components/RunningManTeaser.tsx`
- Modify: `tests/running-man-discovery.test.mjs`

- [ ] **Step 1: Write failing source-level tests**

Assert that homepage campaign and teaser use the two new tracked components with fixed placements: `homepage_campaign_banner` and `homepage_teaser`. Assert that the CTA destination is `enrollment_section`.

- [ ] **Step 2: Run the discovery test to confirm failure**

Run: `npm exec tsx --test tests/running-man-discovery.test.mjs`

Expected: FAIL because the tracked components are absent.

- [ ] **Step 3: Implement the tracked components and adopt them on the homepage**

The video component must emit one start only at first play, midpoint only when normal playback crosses 50% (not a seek), and completion only at `ended`; it must preserve controls, poster, preload, accessibility label, and the current video file. The link component must retain the exact visual classes and Next Link behavior.

- [ ] **Step 4: Re-run the discovery test**

Run: `npm exec tsx --test tests/running-man-discovery.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/running-man/TrackedRunningManVideo.tsx src/components/running-man/TrackedRunningManLink.tsx src/components/RunningManCampaignBanner.tsx src/components/RunningManTeaser.tsx tests/running-man-discovery.test.mjs && git commit -m "Track Running Man video and homepage CTA engagement"`

### Task 4: Instrument the Method page and enrollment funnel

**Files:**

- Modify: `src/app/running-man-method/RunningManMethodPage.tsx`
- Modify: `src/components/running-man/EnrollmentPanel.tsx`
- Modify: `tests/running-man-method-page.test.mjs`

- [ ] **Step 1: Write failing source-level tests**

Assert the Method hero uses a tracked video with placement `method_page_hero`. Enumerate and instrument all current Method-page enrollment CTAs: the hero `PrimaryCta`, the final “I Understand and Am Ready to Enroll” CTA, and the mobile “View Enrollment” CTA. The hero uses placement `method_page_hero`; the final and mobile CTAs use placement `method_page_enrollment`; all use destination `enrollment_section`. Also assert coaching opt-in is recorded only on selection and successful `checkoutUrl` handling calls the bounded checkout tracker before `window.location.assign`. Assert a successful waitlist response records `running_man_waitlist_joined` with placement `method_page_enrollment`.

- [ ] **Step 2: Run the Method-page test to confirm failure**

Run: `npm exec tsx --test tests/running-man-method-page.test.mjs`

Expected: FAIL because those event call sites are absent.

- [ ] **Step 3: Implement the minimal event call sites**

Replace only the existing hero video/CTA, the two remaining enrollment CTAs, and add event calls after successful state transitions. Preserve the checkout request payload, availability algorithm, acknowledgement gate, privacy copy, and all error messages. A checkout that returns `confirmationUrl` must continue exactly as it does today and must not be mislabeled as a new Stripe checkout opening.

- [ ] **Step 4: Re-run the Method-page test**

Run: `npm exec tsx --test tests/running-man-method-page.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/running-man-method/RunningManMethodPage.tsx src/components/running-man/EnrollmentPanel.tsx tests/running-man-method-page.test.mjs && git commit -m "Track Running Man enrollment funnel actions"`

### Task 5: Verify the complete implementation

**Files:**

- Verify only.

- [ ] **Step 1: Run the full Running Man regression suite**

Run: `npm run test:running-man`

Expected: PASS.

- [ ] **Step 2: Run lint and production build**

Run: `npm run lint && npm run build`

Expected: both commands PASS with no new errors.

- [ ] **Step 3: Manually verify locally**

Confirm in the browser console/data layer that each CTA and video placement emits its intended event, clicking the checkout CTA still reaches Stripe, and failed checkout/waitlist actions do not emit success events.

- [ ] **Step 4: Prepare GA4 before production deployment**

In the existing GA4 property, create event-scoped custom dimensions for `placement`, `destination`, `tier`, and `coaching_selected` as text. This must happen before the production deploy because GA4 does not backfill custom dimensions.

- [ ] **Step 5: Deploy and verify production safely**

Deploy only after the user confirms the GA4 dimension setup is complete. Use GA4 DebugView or Realtime to verify events on the live page. Confirm completed enrollment counts separately in Stripe/Supabase rather than using the confirmation page as purchase proof.

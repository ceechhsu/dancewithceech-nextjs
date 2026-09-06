# Conversion First-Fold Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve first-fold clarity and conversion confidence on the homepage, Private Lessons page, and Running Man Method page.

**Architecture:** Reuse the current hero components, links, tracking helpers, and visual styles. Add only explanatory copy, refine one CTA label, and reposition the existing tracked Running Man CTA so it appears before the hero video.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind utility classes, existing focused tests.

---

### Task 1: Clarify the homepage hero promise

**Files:**
- Modify: `src/components/ScrollyHero.tsx`
- Test: `tests/priority-metadata.test.mjs` only if an existing focused test covers hero text; otherwise verify through the accessibility tree and build.

- [ ] **Step 1: Add one concise context sentence** beneath the hero phase text and above the CTA group: `Hip-hop dance lessons in San Jose and online for adult beginners.` Use the existing muted/centered visual treatment and keep it present in the server-rendered markup.
- [ ] **Step 2: Run the production build** to catch JSX, TypeScript, and styling errors.

### Task 2: Clarify the Private Lessons CTA

**Files:**
- Modify: `src/app/private-lessons/page.tsx`

- [ ] **Step 1: Replace the hero label** `Book a Free Consultation` with `Book Your Free 30-Minute Consultation` while preserving the `#booking` target and existing styling.
- [ ] **Step 2: Run the production build** and confirm the booking target remains unchanged.

### Task 3: Surface the Running Man enrollment CTA earlier

**Files:**
- Modify: `src/app/running-man-method/RunningManMethodPage.tsx`

- [ ] **Step 1: Render the existing `PrimaryCta`** after the introductory audience/problem paragraph and before the hero video, preserving the existing `method_page_hero` tracking placement and `#enroll` destination.
- [ ] **Step 2: Keep the existing CTA** below the cohort facts so visitors still have a second action after reading dates and seat information.
- [ ] **Step 3: Run the production build** and inspect the accessibility tree to confirm both buttons have clear names and point to the enrollment section.

### Task 4: Verify the combined result

**Files:**
- Verify: `src/components/ScrollyHero.tsx`
- Verify: `src/app/private-lessons/page.tsx`
- Verify: `src/app/running-man-method/RunningManMethodPage.tsx`

- [ ] **Step 1: Run focused tests** for image references, navigation prefetch, metadata, and video poster.
- [ ] **Step 2: Run the production build.**
- [ ] **Step 3: Inspect desktop first-fold rendering** for all three live routes.
- [ ] **Step 4: Confirm the new homepage context, the full consultation label, and the early Running Man CTA are visible and readable.**
- [ ] **Step 5: Confirm no metadata, analytics, image, or navigation changes were introduced.**

Reference design: `docs/superpowers/specs/2026-09-03-conversion-first-fold-design.md`.

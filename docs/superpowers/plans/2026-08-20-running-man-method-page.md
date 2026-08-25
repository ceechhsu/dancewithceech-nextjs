# Running Man Method Signup Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a premium, responsive signup page at `/running-man-method` using the approved offer copy, teaching image, testimonials, pricing, policies, and qualification details.

**Architecture:** Build a server-rendered Next.js route within the existing site. Keep metadata and structured data in `page.tsx`, keep the long-form sales experience in a focused page component, and use semantic HTML plus native `<details>` elements so the page remains accessible without extra client-side state. Preserve the existing global brand, navigation, footer, analytics, and unrelated routes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Next Image, Node's built-in test runner.

---

### Task 1: Establish the Hero Contract and First Meaningful Preview

**Files:**
- Create: `tests/running-man-method-page.test.mjs`
- Create: `src/app/running-man-method/page.tsx`
- Create: `src/app/running-man-method/RunningManMethodPage.tsx`
- Copy: `public/images/ceech/running-man-method-class.jpg`

- [ ] **Step 1: Write the failing route-content test**

Create a Node test that asserts the route and component files exist and that the source includes the approved headline, cohort dates, starting price, enrollment deadline, age limit, and a descriptive image alt.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/running-man-method-page.test.mjs`

Expected: FAIL because the `/running-man-method` route has not been created.

- [ ] **Step 3: Add the approved photo and minimal hero implementation**

Build the first viewport with the existing `Nav`, the approved teaching image, the concise hero copy, the Running Man definition, cohort facts, founding price, and primary CTA. Add route-specific title, description, canonical, Open Graph, and X metadata.

- [ ] **Step 4: Run the contract test and build**

Run: `node --test tests/running-man-method-page.test.mjs`

Expected: PASS.

Run: `npm run build`

Expected: Next.js build succeeds and `/running-man-method` is generated without errors.

- [ ] **Step 5: Start the existing development site and hand off the first preview**

Run: `npm run dev`

Confirm the exact route returns a non-error response, then open `/running-man-method` in the Codex preview.

### Task 2: Complete the Approved Sales Narrative

**Files:**
- Modify: `tests/running-man-method-page.test.mjs`
- Modify: `src/app/running-man-method/RunningManMethodPage.tsx`

- [ ] **Step 1: Expand the test with the approved page-section contract**

Assert the source contains the problem section, rhythm-first distinction, five-stage method, audience qualification, Beat First prerequisite, program inclusions, instructor authority, George/Martin/Jordan testimonials, three price tiers, private coaching upgrade, refund/retake policies, FAQ, and closing CTA.

- [ ] **Step 2: Run the expanded test and verify RED**

Run: `node --test tests/running-man-method-page.test.mjs`

Expected: FAIL because the first preview includes only the hero slice.

- [ ] **Step 3: Implement the complete page**

Add semantic sections in the approved order. Use restrained blue/gold accents, readable section widths, video embeds with descriptive titles, clear privacy language, native FAQ accordions, and a mobile sticky CTA. Keep the founding-cohort purchase buttons as a single configurable destination so checkout can be connected later without rewriting the page.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test tests/running-man-method-page.test.mjs`

Expected: PASS.

### Task 3: Discovery, Accessibility, and Responsive Safeguards

**Files:**
- Modify: `tests/running-man-method-page.test.mjs`
- Modify: `src/app/running-man-method/RunningManMethodPage.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Add failing checks for discoverability and accessible structure**

Assert that the sitemap includes `/running-man-method`, the page has one H1, video frames have titles, external links are safe, the FAQ uses semantic disclosure elements, and the primary CTA remains available on small screens.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/running-man-method-page.test.mjs`

Expected: FAIL until sitemap and accessibility safeguards are complete.

- [ ] **Step 3: Implement the minimal safeguards**

Add the route to the sitemap, complete accessible labels, include course/event structured data, and refine mobile spacing and sticky CTA behavior.

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/running-man-method-page.test.mjs`

Expected: PASS.

### Task 4: Final Verification

**Files:**
- Verify only; no planned product edits.

- [ ] **Step 1: Run focused tests**

Run: `node --test tests/running-man-method-page.test.mjs`

Expected: All tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Build succeeds with `/running-man-method` included.

- [ ] **Step 3: Check the isolated branch diff**

Run: `git status --short` and `git diff --check`

Expected: Only planned page, image, sitemap, test, and plan changes appear; no whitespace errors.

- [ ] **Step 4: Present the completed local preview and remaining checkout dependency**

Explain that the page is ready for review and that purchase buttons will need the final checkout destination before public enrollment can open.

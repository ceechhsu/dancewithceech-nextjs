# Private Lesson Free Offers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicly distinguish the free 30-minute phone consultation from the free video evaluation for prospective virtual students while keeping the 15-minute demo and $50 follow-up offer private.

**Architecture:** Preserve the existing routes, layout, Calendly destination, and video-evaluation form. Use two focused red-green cycles: first consultation consistency, then virtual-evaluation clarity. Verify source, rendered HTML, metadata, JSON-LD, navigation, and six responsive page/viewport combinations without adding a new testing framework.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript/TSX, Node.js test runner, ESLint

---

## Files

- Create `tests/private-lessons-free-offers.test.mjs`
- Modify `src/app/private-lessons/page.tsx`
- Modify `src/app/private-lessons/san-jose/page.tsx`
- Modify `src/app/private-lessons/bay-area/page.tsx`
- Modify `src/components/PrivateLessonsPricing.tsx`
- Modify `src/components/VideoEvalForm.tsx`

## Worktree safety

Run `rtk git status --short` before editing and record it. The three page files are already modified; preserve every existing hunk. Capture the exact baseline with `rtk git diff --output=/private/tmp/private-offers-baseline.diff -- src/app/private-lessons/page.tsx src/app/private-lessons/san-jose/page.tsx src/app/private-lessons/bay-area/page.tsx src/components/PrivateLessonsPricing.tsx src/components/VideoEvalForm.tsx`. The two shared components are currently clean. After editing, write the same path set to `/private/tmp/private-offers-post.diff` and compare it with `rtk git diff --no-index /private/tmp/private-offers-baseline.diff /private/tmp/private-offers-post.diff`; exit code 1 is expected when approved new hunks exist. Do not stage or commit production files as whole files. Keep this implementation unstaged for user review. Inspect the untracked test directly because ordinary `git diff` does not show untracked content.

### Task 1: Make the phone consultation consistent

**Files:**
- Create: `tests/private-lessons-free-offers.test.mjs`
- Modify: three page files and `PrivateLessonsPricing.tsx`

- [ ] **Step 1: Write consultation-only failing tests**

Create the test helpers and these assertions:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const main = read("src/app/private-lessons/page.tsx");
const sanJose = read("src/app/private-lessons/san-jose/page.tsx");
const bayArea = read("src/app/private-lessons/bay-area/page.tsx");
const pricing = read("src/components/PrivateLessonsPricing.tsx");
const consultationSources = { main, sanJose, bayArea, pricing };

test("public pages never advertise the discretionary demo or a 15-minute consultation", () => {
  const durationBeforeOffer = /\b15[- ]min(?:ute)?\b[^\n"'<]{0,50}\b(?:consultation|demo)\b/i;
  const offerBeforeDuration = /\b(?:consultation|demo)\b[^\n"'<]{0,50}\b15[- ]min(?:ute)?\b/i;
  const demoPromises = /demo class|demo-class|free demo|lesson or demo|schedule your demo/i;
  for (const [name, source] of Object.entries(consultationSources)) {
    assert.doesNotMatch(source, durationBeforeOffer, `${name} has a 15-minute offer`);
    assert.doesNotMatch(source, offerBeforeDuration, `${name} has a reversed 15-minute offer`);
    assert.doesNotMatch(source, demoPromises, `${name} publicly promises the demo`);
  }
});

test("every consultation surface names the 30-minute phone call", () => {
  assert.match(main, />\s*Book Your Free 30-Minute Phone Consultation\s*</);
  assert.match(main, /Book your free 30-minute phone consultation/);
  assert.match(main, /src="https:\/\/calendly\.com\/ceechhsu\/30min"[\s\S]{0,180}title="Free 30-minute phone consultation with Ceech"/);
  assert.equal((pricing.match(/buttonText: "Book a Free 30-Minute Phone Consultation"/g) ?? []).length, 5);
  assert.match(sanJose, /Free 30-minute phone consultation/);
  assert.match(sanJose, /src="https:\/\/calendly\.com\/ceechhsu\/30min"[\s\S]{0,180}title="Free 30-minute phone consultation with Ceech in San Jose"/);
  assert.match(bayArea, /Free 30-minute phone consultation/);
  assert.match(bayArea, /src="https:\/\/calendly\.com\/ceechhsu\/30min"[\s\S]{0,180}title="Free 30-minute phone consultation with Ceech for Bay Area students"/);
});
```

- [ ] **Step 2: Verify RED**

Run `rtk node --test tests/private-lessons-free-offers.test.mjs`. Expect failures for current demo/15-minute wording, incomplete CTA labels, and iframe titles.

- [ ] **Step 3: Implement only consultation changes**

- Main hero: `Book Your Free 30-Minute Phone Consultation`.
- Main booking section: `Book your free 30-minute phone consultation`; describe a phone conversation about goals, experience, and options; remove the demo promise.
- Pricing: change all five plan buttons to `Book a Free 30-Minute Phone Consultation`; replace the demo footer and vague demo discount with a simple explanation of the phone call.
- San Jose: update Open Graph/Twitter descriptions, FAQ JSON-LD, hero CTA, and booking section to `free 30-minute phone consultation`; remove `lesson or demo`.
- Bay Area: update FAQ JSON-LD, hero CTA, and booking section to the same offer.
- Preserve all three `https://calendly.com/ceechhsu/30min` sources and use the exact accessible iframe titles asserted above.

- [ ] **Step 4: Verify GREEN**

Run `rtk node --test tests/private-lessons-free-offers.test.mjs`. Expect both consultation tests to pass before continuing.

### Task 2: Clarify the virtual evaluation

**Files:**
- Modify: `tests/private-lessons-free-offers.test.mjs`
- Modify: `src/components/PrivateLessonsPricing.tsx`
- Modify: `src/components/VideoEvalForm.tsx`
- Modify: both location page files

- [ ] **Step 1: Append virtual-evaluation failing tests**

```js
const videoEval = read("src/components/VideoEvalForm.tsx");
const allPublicSource = [main, sanJose, bayArea, pricing, videoEval].join("\n");

test("each virtual pathway links to the evaluation for prospective virtual students", () => {
  assert.match(pricing, /href="\/private-lessons#video-eval"[\s\S]{0,220}prospective virtual students/i);
  assert.match(sanJose, /href="\/private-lessons#video-eval"[\s\S]{0,220}prospective virtual students/i);
  assert.match(bayArea, /href="\/private-lessons#video-eval"[\s\S]{0,220}prospective virtual students/i);
});

test("normal evaluation state defines the audience and four-part deliverable", () => {
  assert.match(videoEval, /prospective virtual/i);
  assert.match(videoEval, /private three-to-five-minute feedback video/i);
  assert.match(videoEval, /short written recap/i);
  assert.match(videoEval, /one thing you are doing correctly/i);
  assert.match(videoEval, /main problem/i);
  assert.match(videoEval, /one corrective drill/i);
  assert.match(videoEval, /what to practice first/i);
  assert.match(videoEval, /within three business days/i);
  assert.match(videoEval, /One free evaluation per person/i);
});

test("successful submission repeats the response deadline", () => {
  assert.match(videoEval, /status === "success"[\s\S]{0,900}within three business days/i);
});

test("private discount details remain out of public source", () => {
  assert.doesNotMatch(allPublicSource, /\$50|normally \$80|\$200|seven-day|seven days|within 7 days|same-day[^\n]{0,80}(?:discount|special rate)/i);
});
```

- [ ] **Step 2: Verify RED while consultation tests remain GREEN**

Run `rtk node --test tests/private-lessons-free-offers.test.mjs`. Expect only the newly added virtual-evaluation tests to fail.

- [ ] **Step 3: Implement only virtual-evaluation changes**

- Replace the shared component's scroll-only virtual CTA with an anchor to `/private-lessons#video-eval` and identify it as the free starting point for prospective virtual students.
- In the normal form state, state that Ceech sends a private three-to-five-minute feedback video plus a short written recap within three business days. List one correct behavior, the main problem, one corrective drill, and what to practice first.
- In the success state, explicitly repeat `within three business days`.
- Keep `One free evaluation per person`.
- Remove the old public sentence promising a same-day package discount or unspecified special rate.
- Add direct `/private-lessons#video-eval` links to San Jose and Bay Area virtual pathways with `prospective virtual students` in the nearby copy.
- Do not publish the $50 price, normal $80 comparison, $200 upgrade balance, seven-day deadline, or reminder cadence. The page may say evaluation recipients receive a time-limited paid next step without giving private details.

- [ ] **Step 4: Verify complete GREEN**

Run `rtk node --test tests/private-lessons-free-offers.test.mjs`. Expect all tests to pass.

### Task 3: Full verification and review

- [ ] **Step 1: Inspect changes safely**

Run `rtk git status --short`, inspect the new test with `rtk sed -n '1,240p' tests/private-lessons-free-offers.test.mjs`, create `/private/tmp/private-offers-post.diff` using the exact `rtk git diff --output=...` path set above, and compare it to the baseline with `rtk git diff --no-index`. Confirm the added differences are limited to the approved offer copy. Do not stage the production files.

- [ ] **Step 2: Run automated checks**

```bash
rtk node --test tests/private-lessons-free-offers.test.mjs
rtk npm run lint
rtk npm run build
```

Expect focused tests to pass, lint to report no new errors, and the production build to succeed.

- [ ] **Step 3: Start or reuse the local server**

If port 3000 is not serving the current checkout, run `rtk npm run dev` from the project root and keep its returned session ID. Wait until Next.js reports ready before browser checks.

- [ ] **Step 4: Verify visible rendered content and navigation**

Inspect `/private-lessons`, `/private-lessons/san-jose`, and `/private-lessons/bay-area`. On each route, verify visible consultation wording and its booking-section navigation. Verify the main and both location virtual-evaluation links arrive at `/private-lessons#video-eval`. Do not submit the form or send a real email.

- [ ] **Step 5: Verify metadata and FAQ JSON-LD separately**

Inspect each route's document head for the approved descriptions. Separately inspect each page's `application/ld+json` blocks. Confirm no 15-minute consultation or demo promise remains, the correct 30-minute phone wording appears where applicable, and no private discount details appear.

- [ ] **Step 6: Verify the success branch deterministically in source**

Because the project has no DOM/component-test harness and a real submission sends email, use the branch-specific Node assertion from Task 2 to verify the success-state deadline. Do not add a testing framework or perform an external side effect solely for this copy change.

- [ ] **Step 7: Capture six responsive checks**

Capture screenshots for all combinations: three routes at 1440-pixel desktop width and the same three routes at 390-pixel mobile width. For each, verify no overlap, clipping, broken wrapping, or ambiguous adjacent CTAs. At both widths, exercise the consultation and video-evaluation links relevant to that page.

- [ ] **Step 8: Stop before deployment**

Show the local pages to the user. Keep production changes unstaged and do not deploy until explicitly requested.

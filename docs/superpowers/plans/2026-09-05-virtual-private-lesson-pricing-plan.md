# Virtual Private Lesson Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all outdated public virtual private-lesson prices and subscription terms with the approved one-time Virtual Coaching Cycle offers, then show the revised pages on localhost for user review.

**Architecture:** Keep the existing pricing component and page structure. Put the complete cycle definition in the shared pricing section, mirror the same facts in the Bay Area visible copy and FAQ structured data, and protect the offer with focused source tests. No payment, subscription, scheduling, or deployment work is included.

**Tech Stack:** Next.js App Router, React, TypeScript, Node test runner, existing GlassyPricingSection component.

Run all commands from the `nextjs-site` project root.

---

## File Map

- Modify `src/components/PrivateLessonsPricing.tsx`: render the three approved virtual offers and define a complete coaching cycle.
- Modify `src/app/private-lessons/page.tsx`: standardize directly affected virtual-service copy and metadata on Google Meet.
- Modify `src/app/private-lessons/bay-area/page.tsx`: update visible pricing, metadata, JSON-LD FAQ answers, and Google Meet wording.
- Modify `tests/private-lessons-free-offers.test.mjs`: replace obsolete membership assertions with cycle, expiration, workflow, and stale-copy protections.
- No deployment files or payment code will change.

Because these production files already contain user-approved uncommitted work, implementation changes will remain uncommitted until the user reviews the localhost result. Do not stage or overwrite unrelated edits.

### Task 1: Protect the approved offer with failing tests

**Files:**
- Modify: `tests/private-lessons-free-offers.test.mjs`

- [ ] **Step 1: Replace the obsolete pricing test**

Add focused assertions that require:

```js
test("virtual pricing uses complete one-time coaching cycles", () => {
  assert.match(pricing, /One complete cycle includes one video submission/i);
  assert.match(pricing, /recorded feedback within three business days/i);
  assert.match(pricing, /30-minute Live Coaching Session on Google Meet/i);

  assert.match(pricing, /planName: "5-Cycle Pack"[\s\S]{0,260}price: "\$300"/i);
  assert.match(pricing, /5 complete coaching cycles/i);
  assert.match(pricing, /Use within 3 months of purchase/i);

  assert.match(pricing, /planName: "10-Cycle Pack"[\s\S]{0,260}price: "\$500"/i);
  assert.match(pricing, /10 complete coaching cycles/i);
  assert.match(pricing, /Use within 6 months of purchase/i);

  assert.match(pricing, /planName: "Single Cycle"[\s\S]{0,260}price: "\$80"/i);
  assert.match(pricing, /1 complete coaching cycle/i);
  assert.match(pricing, /All options are one-time purchases/i);
});
```

- [ ] **Step 2: Add Bay Area consistency assertions**

Require the Bay Area visible source and JSON-LD source to contain `$80`, `$300`, `$500`, the three-part cycle, and three-month/six-month expirations.

- [ ] **Step 3: Add stale-offer and platform assertions**

Check the main page, pricing component, and Bay Area page for the forbidden old offer terms:

```js
const virtualOfferSource = [main, bayArea, pricing].join("\n");
assert.doesNotMatch(virtualOfferSource, /Monthly Membership|One-Month Pack|\$250\/month|\$280|auto-renews monthly|auto-renewing|membership auto-renews|60 days/i);
assert.doesNotMatch(virtualOfferSource, /\bZoom\b/i);
```

- [ ] **Step 4: Run the focused test and verify failure**

Run: `node --test tests/private-lessons-free-offers.test.mjs`

Expected: FAIL because the production source still contains the former membership and four-session pack.

### Task 2: Replace the shared virtual pricing cards

**Files:**
- Modify: `src/components/PrivateLessonsPricing.tsx`
- Test: `tests/private-lessons-free-offers.test.mjs`

- [ ] **Step 1: Define the complete cycle in the section subtitle**

Use this meaning in concise visible copy and state that all options are one-time purchases with no automatic renewal:

```text
One complete cycle includes one video submission, private recorded feedback within three business days, and one 30-minute Live Coaching Session on Google Meet.
```

- [ ] **Step 2: Replace the three plans**

Render, in order:

1. `5-Cycle Pack`, `$300`, `/ 5 cycles`, `$60/cycle`, saves `$100`, use within three months of purchase. Describe it as the balanced option for steady progress.
2. `10-Cycle Pack`, `$500`, `/ 10 cycles`, `$50/cycle`, saves `$300`, use within six months of purchase. Describe it as the best per-cycle value.
3. `Single Cycle`, `$80`, `/ cycle`, one complete cycle. Describe it as the lowest-commitment starting point.

Use the primary button treatment for the 5-Cycle Pack, but do not set `isPopular` on any virtual plan. Preserve the free consultation buttons and the free preliminary video-evaluation link.

- [ ] **Step 3: Run the focused test**

Run: `node --test tests/private-lessons-free-offers.test.mjs`

Expected: pricing-component assertions pass; Bay Area and main-page consistency assertions may still fail until Task 3.

### Task 3: Synchronize page copy and structured data

**Files:**
- Modify: `src/app/private-lessons/page.tsx`
- Modify: `src/app/private-lessons/bay-area/page.tsx`
- Test: `tests/private-lessons-free-offers.test.mjs`

- [ ] **Step 1: Update the main private-lessons page**

Replace Zoom-only virtual references in metadata and visible copy with Google Meet. Keep the existing free 30-minute phone consultation, pricing anchor, in-person information, and preliminary evaluation flow intact.

- [ ] **Step 2: Update Bay Area metadata and visible descriptions**

Replace Zoom-only wording with Google Meet while retaining the page's Bay Area and San Jose intent.

- [ ] **Step 3: Update Bay Area FAQ structured data**

State that virtual lessons use complete coaching cycles and list:

- Single cycle: $80.
- 5-Cycle Pack: $300, use within three months of purchase.
- 10-Cycle Pack: $500, use within six months of purchase.

Define a cycle as the submitted video, recorded feedback within three business days, and one 30-minute Google Meet session. State that all three purchase options are one-time purchases with no automatic renewal.

- [ ] **Step 4: Update Bay Area visible pricing**

Show the same three prices and expiration periods measured from purchase. State that all options are one-time purchases with no automatic renewal. Remove membership, monthly, four-session, positive renewal promises, and 60-day language. Add a short cycle definition below the prices.

- [ ] **Step 5: Run the focused test**

Run: `node --test tests/private-lessons-free-offers.test.mjs`

Expected: PASS with no failures.

### Task 4: Verify and show the localhost result

**Files:**
- Verify only; no new files expected.

- [ ] **Step 1: Search for stale public pricing**

Run a source search across `src` for `$250/month`, `$280`, `Monthly Membership`, `One-Month Pack`, `auto-renew`, and `60 days`.

Expected: no current public virtual-offer copy remains. Unrelated historical content, if any, must be evaluated rather than changed automatically.

- [ ] **Step 2: Run the focused tests and the site build**

Run:

```bash
node --test tests/private-lessons-free-offers.test.mjs
npm run build
```

Expected: both commands exit successfully.

- [ ] **Step 3: Start or reuse the local development server**

Open `http://127.0.0.1:3000/private-lessons#pricing`. If the existing server is stale, restart it with the project's normal development command.

- [ ] **Step 4: Review responsive layouts**

Inspect the main private-lessons pricing section and Bay Area pricing section at approximately 390-pixel mobile width and 1440-pixel desktop width. Confirm that all cards remain readable, prices and expiration terms are visible, and no card overlaps or truncates content.

- [ ] **Step 5: Hand control back for approval**

Leave the in-app browser on the revised localhost private-lessons pricing section. Do not deploy and do not commit implementation files until the user approves the result.

# Dance With Ceech SEO Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the site's homepage performance, internal discoverability, local-business accuracy, metadata, sitemap signals, and BeatFirst search content without redesigning approved pages or deploying.

**Architecture:** Keep the existing Next.js App Router structure. Isolate the hero frame-selection logic in a pure utility that is easy to test, then make targeted content and metadata changes in existing pages. Add source-level regression tests for SEO facts that are otherwise difficult to exercise through unit tests.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner, Tailwind CSS, JSON-LD.

**Workspace constraint:** Work in the current Git workspace only. Do not create a worktree. Do not push, deploy, or change external services; Google Search Console is read-only.

---

### Task 1: Progressive homepage hero loading

**Files:**
- Create: `src/lib/hero-frames.ts`
- Modify: `src/components/ScrollyHero.tsx`
- Test: `tests/hero-frame-loader.test.ts`

- [ ] Write tests proving `getInitialFrameIndices(197, 12)` starts with `0`, ends with `196`, contains exactly 12 unique evenly distributed frames, and `getFrameNeighborhood(current, 197, 2, 6)` stays within bounds and contains no more than nine unique frames.
- [ ] Run the focused test and confirm it fails because the helper does not exist.
- [ ] Implement the pure frame-planning helper.
- [ ] Replace eager loading with on-demand loading driven by the helper.
- [ ] Add a source assertion proving the eager all-frame image-source loop is gone and the opening frame is requested before idle fallback loading.
- [ ] Run the focused test and confirm it passes.

### Task 2: Local pages, facts, and internal links

**Files:**
- Modify: `src/app/private-lessons/page.tsx`
- Modify: `src/app/private-lessons/san-jose/page.tsx`
- Modify: `src/app/private-lessons/bay-area/page.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/content/posts/hip-hop-dance-move-running-man.md`
- Test: `tests/seo-content.test.mjs`

- [ ] Write failing source-level checks for coordinates `37.3488633,-121.8944247` in all three local JSON-LD blocks, removal of `37.3382,-121.8863`, exact `https://dancewithceech.com/#organization` identifiers, and required links.
- [ ] Run the test and confirm the current sources fail those checks.
- [ ] Correct coordinates and entity identifiers.
- [ ] Assert and implement the exact four employers: Mission College, West Valley College, Gavilan College, and Cabrillo College.
- [ ] Assert and implement the exact guest-teaching list: Stanford, UC Berkeley, UC Santa Cruz, Santa Clara University, De Anza College, San Jose City College, and Ohlone College.
- [ ] Record the current 24+/25+ teaching-year strings before editing and assert they remain unchanged in this pass.
- [ ] Add contextual local links and the Running Man offer link.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Metadata, BeatFirst, and sitemap

**Files:**
- Modify: `src/app/blog/page.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/beat-first/page.tsx`
- Modify: `src/app/blog/[slug]/page.tsx`
- Modify: `src/lib/posts.ts`
- Modify: `src/content/posts/hip-hop-dance-move-running-man.md`
- Modify: `src/app/locking-fundamentals-volume-1/page.tsx`
- Modify: `src/app/ftl-popping-training-series-volume-1/page.tsx`
- Modify: `src/app/sitemap.ts`
- Test: `tests/seo-content.test.mjs`

- [ ] Extend the failing checks for social metadata, canonicals, BeatFirst schema/content, stable sitemap dates, and the two training routes.
- [ ] Implement metadata and structured-data changes.
- [ ] Add crawlable BeatFirst explanation and FAQ content below the game.
- [ ] Add optional `seoTitle` post frontmatter support and use it for the Running Man guide.
- [ ] Assert canonical, Open Graph, and Twitter metadata on both 30-day training pages.
- [ ] Add `STATIC_ROUTE_LAST_MODIFIED` with the exact route/date mapping from the spec; assert that no static route or post fallback uses deployment-time `new Date()`.
- [ ] Run the focused tests and confirm they pass.

### Task 4: Search Console review

**Files:**
- No repository files required.

- [ ] Open Search Console in the in-app browser.
- [ ] Confirm the authenticated property and date range.
- [ ] Record leading queries and pages, indexing issues, Core Web Vitals status, and sitemap status.
- [ ] Make no external configuration changes.

### Task 5: Full verification

**Files:**
- Modify only if verification exposes a scoped regression.

- [ ] Run focused SEO and hero tests.
- [ ] Run `npx tsx --test tests/*.test.ts tests/*.test.mjs` to cover every existing and new TypeScript and MJS test.
- [ ] Run `npm run check:redirects` and `npm run check:sitemap-canonicals`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Start the local site and inspect the homepage, BeatFirst, private-lessons pages, Running Man article, and mobile layouts.
- [ ] Assert the hero phrases, `Book a Private Lesson` and `Meet Ceech` CTAs, and all existing homepage section imports remain present.
- [ ] Assert the Running Man campaign still contains its live availability, dynamic price, teaser video, and founding-cohort CTA references and that no enrollment code was changed.
- [ ] Report the exact verified changes and any remaining Search Console limitations.

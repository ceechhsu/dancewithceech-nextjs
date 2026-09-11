# Sold-Out Stamp Design QA

## Source and implementation

- Source visual truth: `/Users/ceechhsu/.codex/generated_images/01a0208a-321b-7881-8000-ab7d16d9d8d2/exec-aa3c8b8c-febd-4444-93e4-6f30469fd21b.png` (selected ideation direction 2)
- Rendered implementation: local enrollment page reviewed in the in-app browser at `http://localhost:3000/running-man-method#enroll`
- Shared stamp asset: `/Volumes/ACASIS4T/DanceWithCeech.com/Running Man Method/public/running-man/sold-out-stamp-option-2.png`
- Source pixels: 1487 × 1058
- Implementation pixels: 1413 × 1239
- Capture context: desktop dark-theme enrollment view with the $197 tier sold out, $247 tier active, and private coaching sold out. The comparison was normalized to the shared enrollment region rather than browser canvas height.

## Comparison

The implementation now uses one shared image asset derived from the selected option 2 treatment, so both sold-out states use the same distressed red ink, condensed lettering, double outline, and diagonal stamp language. The $247 tier remains the only visually active offer. The $197 price and live claim count remain readable, and the private-coaching checkbox remains visibly disabled.

Focused review covered:

- Typography and copy hierarchy for both sold-out states and the active $247 state.
- Stamp placement, angle, margins, border treatment, and clipping at the desktop viewport.
- Red semantic state color against the existing black, amber, and blue palette.
- The live seat counts and the private-coaching availability text.
- The disabled coaching control and the single active enrollment path.

## Findings

No actionable P0, P1, or P2 issues found.

P3 follow-up: the browser’s red “1 Issue” pill is an annotation/review overlay, not page content. A DOM inspection found no matching page element, so it will not appear to visitors.

## Final result

passed

## Blog editorial update — September 10, 2026

Option 2 implemented at `/blog`. Visual inspection at 1328px desktop and 390px mobile; 320px width also checked without horizontal overflow. Reference hierarchy retained: centered heading, topic pills, search, large lead with two supporting cards, compact discovery row. Real article images and descriptions intentionally replace concept imagery. Mobile stacks the editorial sections and wraps topic controls into two columns.

Verified: wellbeing filter (2 articles), House filter, Running Man search, empty search recovery, pagination (88 articles, page 2 shows 13–24). Five automated filtering/date/query tests pass; scoped lint and TypeScript checks pass. Canonical and social metadata retained. Existing article routes unchanged.

Desktop evidence: `docs/reviews/2026-09-10-blog-editorial/desktop.png`.

Result: passed for local preview review. Not deployed; production build was not rerun for this update.

## Category consistency follow-up — September 10, 2026

The article detail page now uses the same three-topic classifier as `/blog`. Verified representative detail pages: the college showcase is **Stories & Community**, the mental-benefits article is **Dance & Wellbeing**, and Running Man is **Learn to Dance**. Breadcrumbs, category pills, related-article headings, and category links all follow the shared topic. All 88 published articles classify to one of the three topics.

Result: passed for local preview review.

## Final blog review — September 10, 2026

Reviewed desktop and mobile layout, filter/search/pagination state, representative article navigation, image alt text, form labeling, focus treatment, and hover feedback. No horizontal overflow or browser errors observed in the preview. Seven focused blog-library tests, TypeScript, and scoped lint pass.

Result: passed for local preview review.

## Five-style learning taxonomy follow-up — September 10, 2026

Learning articles now show their child style prominently while retaining “Learn to Dance” as the parent section. The five available style filters are Hip-Hop, Locking, Breaking, Popping & Funk, and House. Detail-page breadcrumbs and pills use the same child style, and link directly back to that filtered collection. Three broad learning-advice articles remain intentionally marked as cross-style learning advice rather than being assigned an arbitrary style.

Result: passed for local preview review.

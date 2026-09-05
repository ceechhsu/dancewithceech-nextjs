# Virtual Private Lesson Pricing Update

Date: September 5, 2026
Status: Approved direction, pending implementation

## Goal

Replace the outdated public virtual-lesson offers with the approved Virtual Coaching Cycle model. Every public price, visible description, FAQ answer, and structured-data answer must describe the same offer.

## Approaches Considered

### 1. Focused consistency update (recommended and approved)

Update the existing private-lessons pricing component, the Bay Area page's visible pricing and FAQ structured data, and the related tests. Also replace outdated Zoom-only wording in the directly affected private-lesson copy with Google Meet. This fixes the current contradiction without creating a new page or checkout flow.

### 2. Pricing cards only

Change only the three visible cards. This is faster, but rejected because search engines and visitors could still encounter old membership prices in the Bay Area FAQ and structured data.

### 3. New virtual-lessons landing page

Create a dedicated page for the full workflow and route all virtual calls to action there. This may be useful after real students validate the offer, but it is deferred because it adds scope before the workflow has been tested in practice.

## Approved Public Offers

- One Virtual Coaching Cycle: $80.
- 5-Cycle Pack: $300. It expires three months after purchase. This equals $60 per cycle and saves $100 compared with five single cycles.
- 10-Cycle Pack: $500. It expires six months after purchase. This equals $50 per cycle and saves $300 compared with ten single cycles.
- These are one-time purchases. No auto-renew plan is publicly offered.

## Definition of One Virtual Coaching Cycle

Every public explanation must treat a cycle as one connected training unit:

1. The student submits one dance video.
2. Ceech sends a short private recorded feedback video within three business days.
3. The student schedules one 30-minute Live Coaching Session with Ceech through Google Meet.

The page must not describe a cycle as only a video review or only a live appointment.

## Pricing Presentation

The virtual pricing section will retain the existing three-card visual system.

- The 5-Cycle Pack appears first as the balanced package.
- The 10-Cycle Pack appears second and is described as the best per-cycle value.
- The Single Cycle appears third as the lowest-commitment starting point.
- None of the virtual cards uses the "Most Popular" badge because no customer-volume evidence supports that claim yet.
- The 5-Cycle Pack may use the primary button treatment to provide visual hierarchy without making an unsupported popularity claim.
- The section subtitle defines the three-part coaching cycle once so each card can focus on price, savings, and expiration.
- The existing link to the free preliminary video evaluation remains below the cards.

## Content Updates

Update the following sources of public offer information:

- `src/components/PrivateLessonsPricing.tsx`: replace Monthly Membership and One-Month Pack cards with the approved 5-Cycle and 10-Cycle packs; rewrite the single card as one complete cycle; remove renewal and 60-day language.
- `src/app/private-lessons/bay-area/page.tsx`: replace old visible prices, membership terms, FAQ answers, and JSON-LD FAQ answers with the approved cycle model and expiration periods. Replace Zoom-only descriptions in metadata, structured data, and visible copy with Google Meet so every representation of this service uses the approved platform.
- `src/app/private-lessons/page.tsx`: update virtual-service wording in metadata and visible copy to Google Meet and ensure the page does not reduce the offer to a standalone 30-minute call.
- `tests/private-lessons-free-offers.test.mjs`: replace tests for the old recurring and one-time four-session plans with assertions for all three approved cycle options, expirations, workflow language, and absence of auto-renew claims.

Other sitewide references to online lessons may remain unchanged unless they state an outdated price, package, expiration, or auto-renew term. Every reference within the main private-lessons page, its pricing component, and the Bay Area private-lessons page must use Google Meet rather than Zoom or an ambiguous choice of platforms. This update does not create a new virtual landing page, payment system, scheduling system, or subscription.

## Preserved Content

- In-person prices and package terms remain unchanged.
- The free 30-minute phone consultation remains the main call to action.
- The free preliminary video evaluation remains a one-time prospect offer and is not renamed as a paid Video Progress Check.
- The private 15-minute in-person demo remains separate from virtual coaching.
- The Running Man Method remains a separate cohort product with its own terms and pricing.

## Verification

- Run the focused private-lessons tests.
- Search all public source files for `$250/month`, `$280`, `Monthly Membership`, `One-Month Pack`, `auto-renew`, and `60 days`; none may remain as current virtual offer copy.
- Search the main private-lessons page, pricing component, and Bay Area private-lessons page for Zoom references; none may remain in visible copy, metadata, or structured data.
- Confirm that `$80`, `$300`, and `$500` appear with the correct cycle counts.
- Confirm that the 5-Cycle and 10-Cycle expiration periods are three and six months.
- Confirm that a complete cycle is described as video submission, recorded feedback within three business days, and one 30-minute Google Meet session.
- Build the site successfully.
- Review both the main private-lessons page and the Bay Area private-lessons page at desktop and mobile widths before deployment.

## Deferred Decisions

- Whether a corrected resubmission receives another recorded review within the same paid cycle.
- Whether to introduce public auto-renew plans after three to five students have used the workflow.
- Whether to build a dedicated virtual-private-lessons page.
- The expiration policy for an unused single cycle.

Public content must not invent answers to these deferred questions.

# Blog UI/UX audit — September 10, 2026

## Verdict

Keep the dark visual identity and existing article URLs. The main opportunity is to turn a long archive into an easy-to-browse learning library. This is a review of the local preview, not a claim about the currently deployed site. No application changes were made during this audit.

## Scope and evidence

Reviewed the blog index at 1328 × 1239 and 390 × 844, the Hip-Hop category destination, keyboard focus on the category links, rendered colors and dimensions, and the blog index source. Screenshots below were captured and opened during this audit. No analytics, user testing, live performance benchmarks, screen reader session or complete article-content review was performed.

## 1. Desktop entry — clear identity, too many competing choices

![Desktop blog entry](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/docs/reviews/2026-09-10-blog-audit/01-desktop.png)

**Strengths:** Strong heading, consistent site navigation, real dance imagery and recognizable style names. Real links support normal browser navigation.

**High priority:** There are 88 article cards and no search, result count, sorting control or pagination. The five-column directory of 15 long tutorial links precedes the cards and repeats information already represented by categories and articles. A newcomer must read a lot before choosing.

**Recommendation:** Add search by move or topic, a result count and a manageable first page of about 12 articles. Preserve category landing pages and crawlable article URLs. Keep three clearly selected starting tutorials, with the full directory available through a deliberate browse action. Do not claim a tutorial is beginner-safe without reviewing its difficulty.

**Accessibility:** Small blue labels use #2563eb, giving approximately 3.83:1 against #0a0a0a and 3.65:1 against #111111. These are below the 4.5:1 requirement for ordinary small text. The existing lighter #60a5fa gives approximately 7.43:1 against the panel. See [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## 2. Mobile entry — responsive, but slow to reach article cards

![Mobile blog entry](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/docs/reviews/2026-09-10-blog-audit/02-mobile.png)

**Strengths:** Heading and category chips wrap without horizontal overflow at the tested width. The shared phone menu is compact.

**High priority:** The first ordinary article card begins about 1,676 pixels from the page top—roughly two 844-pixel screen heights. The earlier featured links are usable, but the page gives them much more space than the visual article selection. The full page is about 36,021 pixels tall at this width, burying the bottom coaching/practice choices.

**Recommendation:** Shorten the intro spacing, replace the long mobile directory with a compact starting section, and bring search and article results upward. Use pagination or an accessible Load more pattern that preserves state on Back. Place one quiet, relevant coaching invitation after the first article batch rather than relying on the bottom of all 88 items.

**Accessibility:** Category chips are 38 pixels tall; increasing them to around 44 pixels would make tapping more comfortable. This is a usability recommendation, not a claim that a 38-pixel target automatically fails WCAG. Native keyboard focus was visible on the tested Hip-Hop link. The active All state lacks aria-current.

## 3. Choosing Hip-Hop — link works, browsing controls disappear

![Hip-Hop category destination](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/docs/reviews/2026-09-10-blog-audit/03-category.png)

**Strengths:** Clicking the Hip-Hop chip successfully opens the category page and shows relevant article cards.

**High priority:** The pills look like filters, but open a separate style landing page. That destination no longer shows the category row or a direct All articles/Browse library control near its heading. Switching styles requires Back or navigation elsewhere. This is inconsistent, not a broken link.

**Recommendation:** Keep the existing style URLs but use the same category navigation on each destination, highlight the current style and offer All articles. If adding in-place filters later, distinguish them from links to full style guides and preserve filter state in the URL.

## 4. Choosing an article — useful content, inconsistent presentation

![Mobile article cards](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/docs/reviews/2026-09-10-blog-audit/04-mobile-cards.png)

**Strengths:** Card titles are readable, whole cards are links, image space is reserved when an image exists, and dates are provided.

**Medium priority:** The first ordinary card is a Krazy.Deals story with no image, followed by a wellness article, even though the page promises a dance-move library. On desktop the image-free card creates a large empty area alongside illustrated cards. Long titles dominate the cards, and dates alone do not help a beginner choose a move. The Running Man and Waving source files both record September 6, 2026 updates, yet their index cards display June 2024 publication dates; the listing currently ignores that updated metadata.

**Recommendation:** Keep stories but offer a distinct Stories & Tips grouping. Lead the library with tutorials. Use consistent thumbnail treatment or an intentional text-only card variant. Introduce shorter display titles plus a one-line learning outcome; retain full article titles and URLs. Add difficulty or duration only from verified metadata. Use actual updated dates when available rather than relabeling old content as new. Match the coaching invitation to the established Book a Free Call wording and destination.

## Recommended first implementation pass

1. Search + consistent style browsing + result count/pagination.
2. Compact featured section and clearer tutorial/story grouping.
3. Consistent cards and accessible blue labels.

Keep the current colors, logo and navigation. This is an organization and readability improvement, not a brand redesign.

## Implementation pointers

- [Blog index: category navigation](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/src/app/blog/page.tsx:60): preserve active state and make destination behavior clear.
- [Blog index: featured links](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/src/app/blog/page.tsx:94): five narrow columns; reduce repeated content and mobile height.
- [Blog index: cards](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/src/app/blog/page.tsx:125): all articles rendered; optional image has no deliberate fallback layout.
- [Blog index: labels](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/src/app/blog/page.tsx:146): replace dark accent text with the accessible token.
- [Blog index: image hover](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/src/app/blog/page.tsx:141): add reduced-motion handling for hover scaling.
- [Blog index: card image alt](/Volumes/ACASIS4T/DanceWithCeech.com/homepage-navigation-accessibility/src/app/blog/page.tsx:136): the DOM snapshot repeats the full article title in link names through image alt and heading; use descriptive alt if the image adds information, or empty alt if redundant.

Code checks were guided by the current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Findings are not a full accessibility certification.

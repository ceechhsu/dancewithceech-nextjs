# Dance With Ceech SEO Improvements Design

## Objective

Improve the site's search visibility and loading experience without redesigning the approved pages or changing the Running Man enrollment flow.

## Homepage section decisions

1. **Animated hero:** Preserve the existing scroll animation, copy, and calls to action. Replace eager loading of all 197 frames with progressive loading. `getInitialFrameIndices(197, 12)` must return frame `0` first plus 11 evenly distributed fallback frames ending at frame `196`. `getFrameNeighborhood(current, 197, 2, 6)` must return the current frame, at most two preceding frames, and at most six upcoming frames, clamped to valid indices and without duplicates. The component must request frame `0` immediately, defer the sparse fallback set until the browser is idle, and request the bounded neighborhood as scrolling advances. It must never assign a URL to all 197 images during setup.
2. **Statistics bar:** Preserve the layout. Do not change the teaching-year figure until the owner's exact start date is reconciled separately.
3. **Running Man campaign:** Preserve the current live availability, price, teaser video, and call to action.
4. **Ceech credibility:** Clarify the difference between Ceech's four college employers and guest-teaching institutions.
5. **Testimonials:** Preserve both testimonial sections. No SEO-critical change is required.
6. **BeatFirst teaser:** Preserve the homepage teaser; improve the BeatFirst destination page instead.
7. **Dance styles and featured tutorials:** Preserve; these already provide good crawlable internal links.
8. **Academy:** Preserve.
9. **Private lessons:** Add contextual links to the San Jose and Bay Area landing pages.
10. **Footer:** Add the two local landing pages so they are reachable from every page that uses the shared footer.

## Internal linking

- Add prominent, natural links from the private-lessons hub to the San Jose and Bay Area pages.
- Add the same destinations to the shared footer.
- Add a contextual Running Man Method invitation to the Running Man tutorial article.
- Use descriptive link text rather than generic “click here” labels.

## Local-business accuracy

- Use the verified coordinates for 196 Jackson St, San Jose: latitude `37.3488633`, longitude `-121.8944247`.
- Use exactly `https://dancewithceech.com/#organization` as the stable identifier for the Dance With Ceech entity on the homepage and local-business pages.
- Correct the college-employment wording to exactly Mission College, West Valley College, Gavilan College, and Cabrillo College.
- Describe exactly Stanford, UC Berkeley, UC Santa Cruz, Santa Clara University, De Anza College, San Jose City College, and Ohlone College as guest-teaching institutions, not employers.
- Do not change the 24+/25+ teaching-year claim in this pass; it needs a separate source-of-truth decision.

## Metadata and sitemap

- Add complete Open Graph and Twitter metadata to Blog, About, and Contact.
- Improve the short BeatFirst description and add WebApplication structured data.
- Add crawlable explanatory and FAQ content below the BeatFirst game without blocking gameplay.
- Add the two public 30-day training programs to the sitemap and give them canonical/social metadata.
- Replace deployment-time sitemap dates with a `STATIC_ROUTE_LAST_MODIFIED` route/date map. Pages materially changed by this pass use `2026-08-24`; unchanged routes use their most recent Git content dates: Academy `2026-05-11`, Running Man Method `2026-08-22`, Hip-Hop/Locking/Breaking/Funk category pages `2026-05-11`, and House Dance `2026-05-19`. Blog posts continue to use their published dates. No deployment-time `new Date()` fallback is allowed in the sitemap.
- Do not bulk-rewrite all blog titles before Search Console shows which pages receive impressions. Shorten the Running Man tutorial's search title because it is directly connected to the current offer.

## Search Console

Use the authenticated in-app browser to review Performance, Pages/Indexing, Core Web Vitals, and Sitemaps. Record the leading queries and pages, but do not change Search Console settings or submit removals.

## Verification

- Test the progressive frame selection independently.
- Add source-level SEO regression checks for coordinates, internal links, metadata, sitemap behavior, and corrected college statements.
- Run the complete project test suite, lint, production build, sitemap/canonical checks, and rendered mobile/desktop checks.
- Do not deploy during this pass. Present the verified local result for approval first.
- Work only in the current Git workspace. Do not create a worktree, push, deploy, or make external changes; Search Console review is read-only.

# Monthly review summary maintenance

The website displays verified snapshots of Google and Yelp overall ratings and review counts from `src/lib/reviews.ts`. It calls no Windsor, Google Business Profile, or Yelp review APIs. Website Google sign-in is separate and unchanged.

Verified on the public business pages on October 27, 2026:

- Google: 5.0 stars, 60 reviews — https://share.google/E6jTuMATZ1KCtAPBZ
- Yelp: 5.0 stars, 30 recommended reviews — https://www.yelp.com/biz/dance-with-ceech-san-jose-3

The existing Codex monthly task checks both pages on the first day of each month at 9 a.m. America/Los_Angeles. A verified change updates the snapshot and related expectations, validates a preview, commits, pushes, deploys, and verifies the live website. Unchanged values require no release. Start from the current production commit to preserve other releases.

If a page blocks access or its identity or totals are unclear, preserve that source's values and request help. Never guess from old snippets or bypass access restrictions. The local task needs the computer on, the app running, and workspace/browser/deployment access available. These are monthly snapshots, not live counts.

Public evidence and check history live under `/Volumes/ACASIS4T/DanceWithCeech.com/yelp-review-maintenance/` for both sources. Automation ID `update-yelp-rating-and-review-count-monthly` is retained to preserve its schedule and history; its display name covers Google and Yelp.

Windsor integration code and its deployment check have been removed. The website no longer needs `WINDSOR_API_KEY` or `WINDSOR_GOOGLE_BUSINESS_LOCATION_ID` in Vercel. Preserve `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, which support sign-in.

Focused validation: `node --conditions=react-server --import tsx --test tests/reviews-snapshot.test.ts`.

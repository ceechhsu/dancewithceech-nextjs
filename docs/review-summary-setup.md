# Dynamic Review Summary Setup

When provider credentials are configured, the site reads review ratings and total review counts on the server and caches them for 24 hours. Refreshes are request-driven, not an exact daily schedule, and are not instantaneous. If a provider is unavailable or its credentials are not configured, the site uses a manually maintained static fallback, not a persisted last-successful API response.

## Required server-only variables

Add these to the deployment environment. Do not prefix them with `NEXT_PUBLIC_`.

```text
GOOGLE_BUSINESS_PROFILE_CLIENT_ID=
GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET=
GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN=
GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID=
GOOGLE_BUSINESS_PROFILE_LOCATION_ID=
YELP_API_KEY=
YELP_BUSINESS_ID=
```

Google requires OAuth access to the verified Business Profile location. The review-list response supplies the average rating and total review count. Yelp requires a Places API key and the business ID; its Business Details response supplies the rating and review count.

Until these variables are present, the pages display the fallback values of 5.0 Google / 58 reviews (verified September 5, 2026) and 5.0 Yelp / 30 reviews. The displayed wording intentionally says “reviews,” not “five-star reviews,” because the provider count represents total reviews.

Production settings checked September 5, 2026: the five Google Business Profile variables and the two Yelp variables are absent. Automatic review updates are therefore not active. Existing Google sign-in credentials alone do not authorize Business Profile access. A verified-location OAuth connection is still required before claiming this feature works in production.

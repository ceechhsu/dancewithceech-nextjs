# Dynamic Review Summary Setup

When provider credentials are configured, the site reads review ratings and total review counts on the server and caches them for 24 hours. Refreshes are request-driven, not an exact daily schedule, and are not instantaneous. If a provider is unavailable or its credentials are not configured, the site uses a manually maintained static fallback, not a persisted last-successful API response.

## Google through the existing Windsor connection

The connected Dance With Ceech Business Profile returned a 5.0 rating and 60 all-time reviews on October 27, 2026. The website can use this existing connection when its own server API key is configured:

```text
WINDSOR_API_KEY=<private Production secret>
WINDSOR_GOOGLE_BUSINESS_LOCATION_ID=locations/9606510620043048085
```

The location setting and the API key are configured in Vercel Production as of October 27, 2026. The key is stored as a production-only secret. Obtain any replacement through Windsor Settings → API Access and store it privately in the linked Vercel project. Never paste it in chat, put it in source, or include it in screenshots. A new production deployment is required after changing the secret.

The adapter requests only the selected location's ID, all-time rating and all-time review count. It rejects ambiguous, incomplete or other-location responses, times out after eight seconds, and suppresses secret-bearing provider errors. Google data obtained by direct OAuth, when available and valid, remains preferred. No Yelp connection is added by this change.

## Direct Google and Yelp server-only variables

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

When no configured provider succeeds, pages display the fallback values of 5.0 Google / 60 reviews (verified October 27, 2026) and 5.0 Yelp / 30 reviews (older snapshot). The displayed wording intentionally says “reviews,” not “five-star reviews,” because the provider count represents total reviews.

Direct Google credentials remain optional because the Windsor connection supplies this profile's review totals. Existing website Google sign-in does not grant Business Profile access. The daily cache is request-driven, so updates are not immediate or tied to an exact scheduled time. Verify each activation using `node --conditions=react-server --import tsx scripts/check-google-review-connection.ts` in the deployment environment; it fails if no valid live provider response is available and prints only public totals on success.

## References

- https://windsor.ai/api-documentation/
- https://windsor.ai/answers/

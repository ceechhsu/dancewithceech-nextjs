import 'server-only';

import { unstable_cache } from 'next/cache';

export type ReviewSourceSummary = {
  rating: number;
  reviewCount: number;
};

export type ReviewSummary = {
  google: ReviewSourceSummary;
  yelp: ReviewSourceSummary;
};

const fallbackSummary: ReviewSummary = {
  // Manually verified on the Google Business Profile on September 5, 2026.
  // This is a static fallback, not a persisted last-successful API response.
  google: { rating: 5, reviewCount: 58 },
  yelp: { rating: 5, reviewCount: 30 },
};

function numericOrFallback(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  if (!response.ok) return null;

  const data = await response.json() as { access_token?: string };
  return data.access_token ?? null;
}

async function fetchGoogleSummary(): Promise<ReviewSourceSummary | null> {
  const accountId = process.env.GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID;
  const locationId = process.env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID;
  const accessToken = await getGoogleAccessToken();
  if (!accountId || !locationId || !accessToken) return null;

  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=1`,
    { headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
  );
  if (!response.ok) return null;

  const data = await response.json() as { averageRating?: number; totalReviewCount?: number };
  return {
    rating: numericOrFallback(data.averageRating, fallbackSummary.google.rating),
    reviewCount: numericOrFallback(data.totalReviewCount, fallbackSummary.google.reviewCount),
  };
}

async function fetchYelpSummary(): Promise<ReviewSourceSummary | null> {
  const apiKey = process.env.YELP_API_KEY;
  const businessId = process.env.YELP_BUSINESS_ID;
  if (!apiKey || !businessId) return null;

  const response = await fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(businessId)}`, {
    headers: { authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;

  const data = await response.json() as { rating?: number; review_count?: number };
  return {
    rating: numericOrFallback(data.rating, fallbackSummary.yelp.rating),
    reviewCount: numericOrFallback(data.review_count, fallbackSummary.yelp.reviewCount),
  };
}

async function loadReviewSummary(): Promise<ReviewSummary> {
  const [google, yelp] = await Promise.allSettled([fetchGoogleSummary(), fetchYelpSummary()]);
  return {
    google: google.status === 'fulfilled' && google.value ? google.value : fallbackSummary.google,
    yelp: yelp.status === 'fulfilled' && yelp.value ? yelp.value : fallbackSummary.yelp,
  };
}

export const getReviewSummary = unstable_cache(loadReviewSummary, ['review-summary', JSON.stringify(fallbackSummary)], {
  revalidate: 60 * 60 * 24,
});

export function formatReviewProof(summary: ReviewSummary, ending = 'All earned, all from real students.') {
  return `${summary.yelp.rating.toFixed(1)} on Yelp from ${summary.yelp.reviewCount} reviews. ${summary.google.rating.toFixed(1)} on Google from ${summary.google.reviewCount} reviews. ${ending}`;
}

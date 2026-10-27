import 'server-only';

export type ReviewSourceSummary = {
  rating: number;
  reviewCount: number;
};

export type ReviewSummary = {
  google: ReviewSourceSummary;
  yelp: ReviewSourceSummary;
};

const reviewSnapshot: ReviewSummary = {
  // Verified on the public Google and Yelp business pages on October 27, 2026.
  // Maintained by the monthly review check; no provider API is called by the site.
  google: { rating: 5, reviewCount: 60 },
  yelp: { rating: 5, reviewCount: 30 },
};

export async function getReviewSummary(): Promise<ReviewSummary> {
  return {
    google: { ...reviewSnapshot.google },
    yelp: { ...reviewSnapshot.yelp },
  };
}

export function formatReviewProof(summary: ReviewSummary, ending = 'All earned, all from real students.') {
  return `${summary.yelp.rating.toFixed(1)} on Yelp from ${summary.yelp.reviewCount} reviews. ${summary.google.rating.toFixed(1)} on Google from ${summary.google.reviewCount} reviews. ${ending}`;
}

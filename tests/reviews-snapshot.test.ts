import test from 'node:test';
import assert from 'node:assert/strict';
import { getReviewSummary, formatReviewProof } from '../src/lib/reviews';

test('review totals remain available without network access or provider credentials', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Review summaries must not call a provider'); });
  const summary = await getReviewSummary();
  assert.deepEqual(summary, {
    google: { rating: 5, reviewCount: 60 },
    yelp: { rating: 5, reviewCount: 30 },
  });
  assert.equal(formatReviewProof(summary), '5.0 on Yelp from 30 reviews. 5.0 on Google from 60 reviews. All earned, all from real students.');
  assert.equal(fetchMock.mock.callCount(), 0);
});

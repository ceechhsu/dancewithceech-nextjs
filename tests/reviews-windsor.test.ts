import test from 'node:test';
import assert from 'node:assert/strict';
import { getWindsorGoogleSummary } from '../src/lib/reviews-windsor';

const locationId = 'locations/9606510620043048085';
const config = { apiKey: 'test-secret', locationId };
const row = { location_id: locationId, review_average_rating_total: 5, review_total_count: 60 };
const response = (data: unknown) => new Response(JSON.stringify({ data }));

test('missing or malformed connection does not call a provider', async () => {
  const fetcher = async () => { throw new Error('must not fetch'); };
  for (const values of [{}, { apiKey: 'test-secret' }, { locationId }, { ...config, locationId: 'other' }]) {
    assert.equal(await getWindsorGoogleSummary(values, fetcher), null);
  }
});

test('uses all-time totals for only the selected location and keeps credentials server-side', async () => {
  let called = false;
  const result = await getWindsorGoogleSummary(config, async (input, init) => {
    called = true;
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://connectors.windsor.ai');
    assert.equal(url.pathname, '/google_my_business');
    assert.equal(url.searchParams.get('select_accounts'), locationId);
    assert.equal(url.searchParams.get('api_key'), config.apiKey);
    assert.equal(url.searchParams.get('fields'), 'location_id,review_average_rating_total,review_total_count');
    assert.equal(url.searchParams.get('date_preset'), 'last_1d');
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal);
    return response([row]);
  });
  assert.equal(called, true);
  assert.deepEqual(result, { rating: 5, reviewCount: 60 });
  assert.doesNotMatch(JSON.stringify(result), /test-secret|locations/);
});

test('does not display another location or ambiguous responses', async () => {
  for (const data of [[], [{ ...row, location_id: 'locations/123' }], [row, row], null, {}, [null]]) {
    assert.equal(await getWindsorGoogleSummary(config, async () => response(data)), null);
  }
});

test('only accepts a complete valid total and rating; zero reviews is a valid total', async () => {
  for (const update of [
    { review_total_count: -1 }, { review_total_count: 60.5 }, { review_total_count: '60' },
    { review_total_count: null }, { review_total_count: Number.MAX_SAFE_INTEGER + 1 },
    { review_average_rating_total: -1 }, { review_average_rating_total: 5.1 },
    { review_average_rating_total: '5' }, { review_average_rating_total: null },
  ]) {
    assert.equal(await getWindsorGoogleSummary(config, async () => response([{ ...row, ...update }])), null);
  }
  assert.deepEqual(await getWindsorGoogleSummary(config, async () => response([{ ...row, review_total_count: 0 }])), { rating: 5, reviewCount: 0 });
});

test('service, malformed JSON, pending and network errors fail safely', async () => {
  const fetchers = [
    async () => new Response('denied', { status: 401 }),
    async () => new Response('upstream unavailable', { status: 503 }),
    async () => new Response('not json'),
    async () => new Response(JSON.stringify({ status: 'pending' })),
    async () => { throw new Error('request failed with secret-bearing URL'); },
    async () => { throw new DOMException('aborted', 'AbortError'); },
  ];
  for (const fetcher of fetchers) assert.equal(await getWindsorGoogleSummary(config, fetcher), null);
});

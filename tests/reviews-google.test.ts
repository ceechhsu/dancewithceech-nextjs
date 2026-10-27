import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchGoogleSummary } from '../src/lib/reviews';

const locationId = 'locations/9606510620043048085';
const settingNames = ['GOOGLE_BUSINESS_PROFILE_CLIENT_ID','GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET','GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN','GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID','GOOGLE_BUSINESS_PROFILE_LOCATION_ID','WINDSOR_API_KEY','WINDSOR_GOOGLE_BUSINESS_LOCATION_ID'];
function setConnections(t: import('node:test').TestContext) {
  const previous = new Map(settingNames.map(name => [name, process.env[name]]));
  for (const name of settingNames) process.env[name] = name === 'WINDSOR_GOOGLE_BUSINESS_LOCATION_ID' ? locationId : 'fixture-only';
  t.after(() => { for (const [name,value] of previous) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });
}

test('invalid direct Google data tries the connected Windsor source instead of substituting static totals', async t => {
  setConnections(t);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input: unknown) => {
    calls++;
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'fixture-access' });
    if (url.startsWith('https://mybusiness.googleapis.com/')) return Response.json({});
    assert.ok(url.startsWith('https://connectors.windsor.ai/google_my_business?'));
    return Response.json({ data: [{ location_id: locationId, review_average_rating_total: 4.9, review_total_count: 61 }] });
  });
  assert.deepEqual(await fetchGoogleSummary(), { rating: 4.9, reviewCount: 61 });
  assert.equal(calls, 3);
});

test('complete direct Google totals remain preferred over Windsor', async t => {
  setConnections(t);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    assert.ok(calls <= 2, 'must not call Windsor when direct data is valid');
    return Response.json(calls === 1 ? { access_token: 'fixture-access' } : { averageRating: 5, totalReviewCount: 62 });
  });
  assert.deepEqual(await fetchGoogleSummary(), { rating: 5, reviewCount: 62 });
  assert.equal(calls, 2);
});

import 'server-only';

type WindsorConfig = { apiKey?: string; locationId?: string };

/** Read only all-time review totals for the explicitly configured business. */
export async function getWindsorGoogleSummary(config: WindsorConfig, fetcher: typeof fetch = fetch) {
  const apiKey = config.apiKey?.trim();
  const locationId = config.locationId?.trim();
  if (!apiKey || !locationId || !/^locations\/\d+$/.test(locationId)) return null;

  try {
    const url = new URL('https://connectors.windsor.ai/google_my_business');
    // Windsor supports query-key authentication only. Never log this server URL.
    url.search = new URLSearchParams({
      api_key: apiKey,
      select_accounts: locationId,
      fields: 'location_id,review_average_rating_total,review_total_count',
      date_preset: 'last_1d',
      _max_rows: '2',
    }).toString();
    const response = await fetcher(url, {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return null;
    const { data, status } = body as { data?: unknown; status?: unknown };
    if (status !== undefined && status !== 'done') return null;
    if (!Array.isArray(data) || data.length !== 1) return null;
    const row = data[0];
    if (!row || typeof row !== 'object' || row.location_id !== locationId) return null;
    const rating: unknown = row.review_average_rating_total;
    const reviewCount: unknown = row.review_total_count;
    if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0 || rating > 5) return null;
    if (typeof reviewCount !== 'number' || !Number.isSafeInteger(reviewCount) || reviewCount < 0) return null;
    return { rating, reviewCount };
  } catch {
    // A provider failure must not break the page or expose secret-bearing errors.
    return null;
  }
}

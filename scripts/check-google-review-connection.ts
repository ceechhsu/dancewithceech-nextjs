import { fetchGoogleSummary } from '../src/lib/reviews';

async function checkConnection() {
  const summary = await fetchGoogleSummary();
  if (!summary) throw new Error('Google review connection is not returning a valid live total.');
  // Only public totals are printed. Never print credentials or provider request URLs.
  console.log(`Google review connection verified: ${summary.reviewCount} reviews, ${summary.rating.toFixed(1)} stars.`);
}

void checkConnection().catch(() => {
  console.error('Google review connection verification failed. Check the private server configuration and provider access.');
  process.exitCode = 1;
});

import fs from 'node:fs';

const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
const analyticsPath = 'src/components/DeferredAnalytics.tsx';
const analytics = fs.existsSync(analyticsPath) ? fs.readFileSync(analyticsPath, 'utf8') : '';
const clientAnalytics = fs.readFileSync('src/lib/analytics/client.ts', 'utf8');

const checks = [
  ['layout renders DeferredAnalytics', /<DeferredAnalytics\s*\/>/.test(layout)],
  ['layout no longer schedules analytics with lazyOnload', !layout.includes('strategy="lazyOnload"')],
  ['analytics initializes immediately', /initializeGoogleAnalytics\(\);/.test(analytics)],
  ['analytics keeps marketing pixel deferred', /setTimeout|requestIdleCallback/.test(analytics)],
  ['analytics prevents duplicate initialization', /data-dwc-analytics/.test(clientAnalytics)],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length > 0) {
  console.error(failures.map(([name]) => `FAIL: ${name}`).join('\n'));
  process.exit(1);
}

console.log(`PASS: ${checks.length} deferred analytics checks`);

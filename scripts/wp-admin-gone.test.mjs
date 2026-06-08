import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const routeSource = readFileSync(
  new URL('../src/app/wp-admin/admin-ajax.php/route.ts', import.meta.url),
  'utf8',
);

test('legacy WordPress admin ajax endpoint returns 410 Gone', () => {
  assert.match(routeSource, /status:\s*410/);
  assert.match(routeSource, /Gone/);
  assert.match(routeSource, /noindex/i);
});

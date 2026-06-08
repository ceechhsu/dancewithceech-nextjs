import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const proxySource = readFileSync(new URL('../src/proxy.ts', import.meta.url), 'utf8');

test('legacy WordPress probe URLs return 410 Gone from proxy', () => {
  assert.equal(proxySource.includes('pathname === "/*"'), true);
  assert.equal(proxySource.includes('pathname.startsWith("/wp-content/")'), true);
  assert.equal(proxySource.includes('pathname.startsWith("/wp-admin/")'), true);
  assert.equal(proxySource.includes('/^\\/wp-[^/]*\\.php$/'), true);
  assert.equal(proxySource.includes('status: 410'), true);
  assert.equal(proxySource.includes('"x-robots-tag": "noindex, nofollow"'), true);
  assert.equal(proxySource.includes('matcher: "/:path*"'), true);
});

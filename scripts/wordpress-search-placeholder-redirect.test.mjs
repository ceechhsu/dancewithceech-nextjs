import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const proxyPath = new URL('../src/proxy.ts', import.meta.url);

test('legacy WordPress search placeholder redirects to the homepage', () => {
  assert.equal(existsSync(proxyPath), true);

  const source = readFileSync(proxyPath, 'utf8');

  assert.match(source, /export function proxy/);
  assert.match(source, /WORDPRESS_SEARCH_PLACEHOLDER\s*=\s*"\{search_term_string\}"/);
  assert.match(source, /searchParams\.get\("s"\)\s*===\s*WORDPRESS_SEARCH_PLACEHOLDER/);
  assert.match(source, /cleanUrl\.search\s*=\s*""/);
  assert.match(source, /NextResponse\.redirect\(cleanUrl,\s*308\)/);
  assert.match(source, /matcher:\s*"\/:path\*"/);
});

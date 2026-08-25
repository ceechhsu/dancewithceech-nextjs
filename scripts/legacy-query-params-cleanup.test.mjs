import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const proxySource = readFileSync(new URL('../src/proxy.ts', import.meta.url), 'utf8');

test('legacy crawl query parameters redirect to clean canonical URLs', () => {
  assert.match(proxySource, /LEGACY_QUERY_PARAMS\s*=\s*\["et_blog"\]/);
  assert.match(proxySource, /LEGACY_REFERRERS.*\["aftership"\]/);
  assert.match(proxySource, /cleanUrl\.searchParams\.delete\(param\)/);
  assert.match(proxySource, /cleanUrl\.searchParams\.delete\("ref"\)/);
  assert.match(proxySource, /const cleanQueryUrl = getCleanQueryUrl\(request\)/);
  assert.match(proxySource, /NextResponse\.redirect\(cleanQueryUrl,\s*308\)/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const proxySource = readFileSync(new URL('../src/proxy.ts', import.meta.url), 'utf8');

test('legacy archive pagination URLs redirect to current topic pages', () => {
  assert.equal(proxySource.includes('LEGACY_ARCHIVE_DESTINATIONS'), true);
  assert.equal(proxySource.includes('["/locking-dance-moves/page/", "/locking-dance-moves"]'), true);
  assert.equal(proxySource.includes('["/funk-style-dance-moves/page/", "/funk-style-dance-moves"]'), true);
  assert.equal(proxySource.includes('["/hip-hop-dance-moves/page/", "/hip-hop-dance-moves"]'), true);
  assert.equal(
    proxySource.includes('["/category/dance-moves/locking-dance-moves/page/", "/locking-dance-moves"]'),
    true,
  );
  assert.equal(proxySource.includes('NextResponse.redirect(archiveUrl, 308)'), true);
});

test('legacy WordPress feed and uncategorized URLs return 410 Gone', () => {
  assert.equal(proxySource.includes('pathname.endsWith("/feed/")'), true);
  assert.equal(proxySource.includes('pathname.endsWith("/feed")'), true);
  assert.equal(proxySource.includes('pathname === "/category/uncategorized/"'), true);
  assert.equal(proxySource.includes('pathname === "/category/uncategorized"'), true);
  assert.equal(proxySource.includes('status: 410'), true);
});

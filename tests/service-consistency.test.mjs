import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const publicFiles = ['src/components/Nav.tsx', 'src/components/MobileMenu.tsx', 'src/components/Footer.tsx', 'src/components/ProgressTab.tsx', 'src/app/page.tsx', 'src/app/about/page.tsx', 'src/app/blog/page.tsx', 'src/app/blog/[slug]/page.tsx', 'src/app/links/LinksContent.tsx', 'src/app/links/page.tsx', 'src/app/contact/ContactForm.tsx', ...['hip-hop-dance-moves', 'locking-dance-moves', 'breaking-dance-moves', 'funk-style-dance-moves', 'house-dance'].map(p => 'src/app/' + p + '/page.tsx')];
test('public pages do not promote retired Academy or Zoom lessons', () => {
  for (const p of publicFiles) assert.doesNotMatch(read(p), /\bAcademy\b|\/academy|\bZoom\b/i, p);
  assert.doesNotMatch(read('src/app/sitemap.ts'), /\/academy/);
  assert.doesNotMatch(read('src/lib/llms.ts'), /academy|\bZoom\b/i);
  assert.ok(!JSON.parse(read('src/content/redirects.json')).some(r => r.destination === '/academy'));
});
test('Academy routes are retired without accepting subscriptions', () => {
  assert.match(read('src/app/academy/page.tsx'), /notFound\(\)/);
  for (const p of ['src/app/api/academy-waitlist/route.ts', 'src/app/api/academy-waitlist/count/route.ts']) {
    assert.match(read(p), /status: 410/);
    assert.doesNotMatch(read(p), /fetch\(|MAILERLITE/);
  }
});
test('evaluation has accurate privacy and no fixed response-video duration', () => {
  const s = read('src/components/VideoEvalForm.tsx');
  assert.doesNotMatch(s, /three-to-five-minute|only Ceech can view/i);
  assert.match(s, /anyone with the link/i);
  assert.match(s, /within three business days/i);
});
test('About states confirmed teaching history and qualification', () => {
  const s = read('src/app/about/page.tsx');
  assert.match(s, /1998/); assert.match(s, /2002/); assert.match(s, /Master of Arts in Kinesiology/);
});
test('free programs do not imply an unspecified paid membership', () => {
  for (const p of ['ftl-popping-training-series-volume-1', 'locking-fundamentals-volume-1']) {
    const s = read('src/app/' + p + '/page.tsx');
    assert.doesNotMatch(s, /paid program|paid members/i);
    assert.match(s, /free, self-directed/i);
  }
});

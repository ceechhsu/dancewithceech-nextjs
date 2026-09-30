import test from 'node:test';
import assert from 'node:assert/strict';
import { sitemapDate, postLastModified } from '../src/lib/sitemap-date';
import { getAllPosts } from '../src/lib/posts';
import { createConsultationTracker, trackConsultation } from '../src/lib/analytics/consultation';

test('date normalization preserves legacy day and rejects impossible dates', () => {
  assert.equal(sitemapDate('2024-05-11 10:27:14'), '2024-05-11');
  assert.equal(sitemapDate('2024-02-29'), '2024-02-29');
  for (const value of ['2023-02-29', '2024-04-31', '2024-13-01', '2024-01-01 25:00:00', '2024-01-01 garbage', '2024-01-01T24:00:00Z', '2024-01-01T12:00:00+24:00', '']) assert.equal(sitemapDate(value), undefined);
  assert.equal(sitemapDate('2024-05-11T10:27:14Z'), '2024-05-11T10:27:14.000Z');
  assert.equal(postLastModified({updated:'invalid',date:'2024-05-11'}), '2024-05-11');
  assert.equal(postLastModified({updated:'2026-09-01',date:'2024-05-11'}), '2026-09-01');
});
test('every existing post has a valid recorded sitemap date', () => {
  const posts = getAllPosts();
  assert.equal(posts.length, 88);
  for (const post of posts) assert.ok(postLastModified(post), post.slug);
});
test('booking confirmation requires trusted origin, frame and provider success; repeats deduplicate', () => {
  const events: string[] = [];
  const source = {};
  const tracker = createConsultationTracker(event => events.push(event));
  const data = { event:'calendly.event_scheduled', payload:{event:{uri:'https://api.calendly.com/scheduled_events/abc-123'},invitee:{email:'secret@example.com'}} };
  tracker({origin:'https://evil.example',source,data},source);
  tracker({origin:'https://calendly.com',source:{},data},source);
  tracker({origin:'https://calendly.com',source,data:{event:'calendly.event_scheduled'}},source);
  assert.deepEqual(events, []);
  for (let i=0;i<2;i++) {
    tracker({origin:'https://calendly.com',source,data:{event:'calendly.date_and_time_selected'}},source);
    tracker({origin:'https://calendly.com',source,data},source);
  }
  assert.deepEqual(events, ['consultation_form_started','consultation_booking_confirmed']);
});

test('sitemap emits all 104 pages with valid lastmod values', async () => {
  const { default: sitemap } = await import('../src/app/sitemap');
  const entries = sitemap();
  assert.equal(entries.length, 104);
  for (const entry of entries) {
    assert.equal(typeof entry.lastModified, 'string');
    assert.ok(sitemapDate(entry.lastModified), entry.url);
  }
});


test('funnel events contain only allowlisted metadata and never initialize analytics', () => {
  const previous = globalThis.window;
  const sent: unknown[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { gtag: (...args: unknown[]) => sent.push(args) } });
  try {
    trackConsultation('consultation_booking_confirmed', 'private_lessons');
    trackConsultation('inquiry_confirmed', 'contact_form');
    assert.deepEqual(sent, [
      ['event', 'consultation_booking_confirmed', {surface:'private_lessons',provider:'calendly',consultation_type:'phone_30min'}],
      ['event', 'inquiry_confirmed', {surface:'contact_form'}],
    ]);
    Object.defineProperty(globalThis, 'window', {configurable:true,value:{}});
    trackConsultation('consultation_booking_confirmed', 'private_lessons');
    assert.equal((globalThis.window as unknown as {gtag?: unknown}).gtag, undefined);
    Object.defineProperty(globalThis, 'window', {configurable:true,value:{gtag:()=>{throw new Error('blocked');}}});
    assert.doesNotThrow(()=>trackConsultation('inquiry_confirmed', 'contact_form'));
  } finally { Object.defineProperty(globalThis, 'window', {configurable:true,value:previous}); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('private lessons explicitly offer audition coaching and social dancing', () => {
  const details = read('src/components/PrivateLessonDetails.tsx');
  assert.match(details, /Competition and audition coaching/);
  assert.match(details, /Dance for social events/);
  assert.match(details, /Competition results and audition selection are not guaranteed/);
  assert.match(details, /adults 18\+/);
  assert.match(details, /id="specialized-lessons"/);
  assert.match(read('src/app/private-lessons/page.tsx'), /<SpecializedLessons\s*\/>/);
});

test('contact page distinguishes college enrollment from private lessons', () => {
  const page = read('src/app/contact/page.tsx');
  assert.match(page, /id="community-college-classes"/);
  for (const name of ['Mission College', 'West Valley College', 'Cabrillo College']) assert.ok(page.includes(name));
  assert.match(page, /Register directly through the college/);
  assert.match(page, /Schedules and fees vary by college and semester/);
  assert.match(page, /not through this contact form/);
});

test('biography preserves four college roles and explains Gavilan history', () => {
  const page = read('src/app/about/page.tsx');
  assert.match(page, /weight training at Gavilan College/);
  assert.match(page, /hip-hop at Gavilan from 2018 to 2020/);
  for (const name of ['Mission College', 'West Valley College', 'Cabrillo College', 'Gavilan College']) assert.ok(page.includes(name));
});

test('Running Man retains four-college credential with current subjects', () => {
  const page = read('src/app/running-man-method/RunningManMethodPage.tsx');
  assert.match(page, /Professor at four Bay Area colleges/);
  assert.match(page, /weight training at Gavilan College/);
  for (const name of ['Mission College', 'West Valley College', 'Cabrillo College']) assert.ok(page.includes(name));
});

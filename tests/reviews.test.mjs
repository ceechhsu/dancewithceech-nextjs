import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('review proof uses cached dynamic summary data on all review surfaces', () => {
  const reviewModule = read('src/lib/reviews.ts');
  const privateLessons = read('src/app/private-lessons/page.tsx');
  const homepage = read('src/app/page.tsx');
  const deferredTestimonials = read('src/components/DeferredHomeTestimonials.tsx');
  const sanJose = read('src/app/private-lessons/san-jose/page.tsx');
  const bayArea = read('src/app/private-lessons/bay-area/page.tsx');
  const marquee = read('src/components/TestimonialsMarquee.tsx');

  assert.match(reviewModule, /unstable_cache/);
  assert.match(reviewModule, /totalReviewCount/);
  assert.match(reviewModule, /review_count/);
  assert.match(privateLessons, /getReviewSummary/);
  assert.match(homepage, /getReviewSummary/);
  assert.match(deferredTestimonials, /summary/);
  assert.match(sanJose, /getReviewSummary/);
  assert.match(bayArea, /getReviewSummary/);
  assert.match(marquee, /summary/);
  assert.doesNotMatch(sanJose, /30 five-star reviews on Yelp/);
  assert.doesNotMatch(bayArea, /30 five-star reviews on Yelp/);
  assert.doesNotMatch(marquee, /56 reviews/);
});

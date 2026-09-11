import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../src/components/${name}`, import.meta.url), 'utf8');

test('hero exposes a persistent control wired to real media playback', () => {
  const source = read('ScrollyHero.tsx');
  assert.ok(source.includes('Pause animation'), 'missing visible pause control');
  assert.ok(source.includes('Resume animation'), 'missing resume state');
  assert.match(source, /\.pause\(\)/);
  assert.match(source, /\.play\(\)/);
  assert.match(source, /onPlay=/);
  assert.match(source, /onPause=/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /aria-controls="hero-background-video"/);
});

test('written reviews are stationary and all original reviews remain reachable', () => {
  const source = read('TestimonialsMarquee.tsx');
  assert.doesNotMatch(source, /<Marquee\b|rotateX\(|rotateY\(|pauseOnHover/);
  assert.match(source, /grid-cols-1/);
  assert.match(source, /<details/);
  assert.match(source, /Read more student reviews/);
  for (const name of ['Jason L.', 'Shirley V.', 'Hoaxin L.', 'Nicole R.', 'Debbie C.', 'Dillan M.', 'Kelley', 'Alia W.', 'Jadyn R.', 'Dan W.']) {
    assert.ok(source.includes(name), `missing existing review: ${name}`);
  }
});

test('homepage video testimonials require manual selection rather than automatic rotation', () => {
  const deferred = read('DeferredHomeTestimonials.tsx');
  assert.doesNotMatch(deferred, /Hover to pause|CircularGallery/);
  assert.match(deferred, /ManualVideoTestimonials/);
  const filename = new URL('../src/components/ManualVideoTestimonials.tsx', import.meta.url);
  assert.ok(existsSync(filename), 'manual video component missing');
  const source = readFileSync(filename, 'utf8');
  assert.match(source, /Previous testimonial/);
  assert.match(source, /Next testimonial/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /requestAnimationFrame|setInterval|rotateY/);
});

test('small review labels use the existing accessible text blue', () => {
  for (const filename of ['TestimonialsMarquee.tsx', 'DeferredHomeTestimonials.tsx']) {
    const source = read(filename);
    assert.match(source, /var\(--accent-primary-accessible\)/);
    assert.doesNotMatch(source, /color: ['"]var\(--accent-primary\)['"]/);
  }
});

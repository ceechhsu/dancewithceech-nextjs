import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lessonFaqs, sanJoseFaqs, bayAreaFaqs } from '../src/lib/private-lesson-details';

const read = (path: string) => readFileSync(path, 'utf8');

test('all lesson FAQs explain appointment windows without promising walk-in hours', () => {
  for (const faqs of [lessonFaqs, sanJoseFaqs, bayAreaFaqs]) {
    const answer = faqs.find(faq => faq.question === 'Where and when are in-person lessons held?')?.answer ?? '';
    assert.match(answer, /by appointment only/);
    assert.match(answer, /9 a\.m\. and 5 p\.m\./);
    assert.match(answer, /special request/);
  }
});

test('all lesson FAQs explain paid street parking', () => {
  for (const faqs of [lessonFaqs, sanJoseFaqs, bayAreaFaqs]) {
    assert.ok(faqs.some(faq => /Paid street parking only/.test(faq.answer)));
  }
});

test('shared and homepage footers use the official spaced business name', () => {
  assert.doesNotMatch(read('src/components/Footer.tsx'), /DanceWithCeech/);
  assert.match(read('src/app/page.tsx'), /font-bold text-lg mb-2">Dance With Ceech/);
});

test('review fallback reflects the verified September 5 snapshot', () => {
  assert.match(read('src/lib/reviews.ts'), /google: \{ rating: 5, reviewCount: 58 \}/);
});

test('a changed fallback invalidates the previous review cache', () => {
  assert.ok(read('src/lib/reviews.ts').includes("['review-summary', JSON.stringify(fallbackSummary)]"));
});

test('legacy courses keep their intentional older YouTube channel links', () => {
  for (const route of ['ftl-popping-training-series-volume-1', 'locking-fundamentals-volume-1']) {
    assert.match(read(`src/app/${route}/page.tsx`), /https?:\/\/youtube\.com\/nustudios/);
  }
});

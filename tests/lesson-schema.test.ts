import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonSchema, lessonFaqs, sanJoseFaqs, bayAreaFaqs, businessSchema } from '../src/lib/private-lesson-details';

test('structured FAQs use exactly the same answers as the visible FAQ component', () => {
  for (const faqs of [lessonFaqs, sanJoseFaqs, bayAreaFaqs]) {
    const schema = buildLessonSchema('/private-lessons', 'Private lessons', faqs);
    const faq = schema['@graph'].find(node => node['@type'] === 'FAQPage');
    assert.ok(faq && 'mainEntity' in faq, 'FAQPage must exist and contain its questions');
    assert.deepEqual(faq.mainEntity, faqs.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })));
    assert.equal(new Set(faqs.map(f => f.question)).size, faqs.length);
  }
});
test('business identity and current virtual workflow are factual and stable', () => {
  assert.equal(businessSchema.name, 'Dance With Ceech');
  assert.equal(businessSchema.address.streetAddress, '196 Jackson St');
  const answers = lessonFaqs.map(f => f.answer).join(' ');
  assert.match(answers, /within three business days/);
  assert.match(answers, /next available 30-minute Live Coaching Session on Google Meet/);
  assert.match(answers, /10-Cycle Pack is \$500/);
  assert.match(answers, /5-Cycle Pack is \$300/);
  assert.match(answers, /Single Cycle is \$80/);
  assert.doesNotMatch(answers, /within (?:7|seven) days|unlimited|auto-renews|Calendly/);
});

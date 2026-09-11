import test from 'node:test';
import assert from 'node:assert/strict';
import { getBlogTopic, getBlogStyleLabel, filterBlogPosts, blogDate, readBlogQuery, blogHref } from '../src/lib/blog-library';
import { getAllPosts } from '../src/lib/posts';

const post = (slug: string, category = 'general', title = slug) => ({ slug, category, title, date: '2026-04-13' });
test('stories, wellbeing and learning advice have distinct topics', () => {
  assert.equal(getBlogTopic(post('how-krazy-deals-started')), 'stories');
  assert.equal(getBlogTopic(post('dancing-increases-your-lifespan')), 'wellbeing');
  assert.equal(getBlogTopic(post('i-almost-quit-dancing')), 'learn');
  assert.equal(getBlogTopic(post('a-move', 'locking-dance-moves')), 'learn');
});
test('every published article belongs to one of the three blog sections', () => {
  const topics = new Set(['learn', 'wellbeing', 'stories']);
  const posts = getAllPosts();
  assert.equal(posts.length, 88);
  assert.ok(posts.every((p) => topics.has(getBlogTopic(p))));
});
test('dance tutorials expose their five child style categories', () => {
  assert.equal(getBlogStyleLabel(post('a-move', 'hip-hop-dance-moves')), 'Hip-Hop');
  assert.equal(getBlogStyleLabel(post('a-move', 'locking-dance-moves')), 'Locking');
  assert.equal(getBlogStyleLabel(post('a-move', 'breaking-dance-moves')), 'Breaking');
  assert.equal(getBlogStyleLabel(post('a-move', 'funk-style-dance-moves')), 'Popping & Funk');
  assert.equal(getBlogStyleLabel(post('a-move', 'house-dance')), 'House');
  assert.equal(getBlogStyleLabel(post('general-advice')), null);
});
test('search combines topic and style and ignores case/extra spaces', () => {
  const posts = [post('run', 'hip-hop-dance-moves', 'Running Man'), post('wave', 'funk-style-dance-moves', 'Arm Wave'), post('how-krazy-deals-started')];
  assert.deepEqual(filterBlogPosts(posts, { topic: 'learn', style: 'hip-hop-dance-moves', q: '  RUNNING  ' }).map(p => p.slug), ['run']);
  assert.equal(filterBlogPosts(posts, { topic: 'all', style: '', q: 'not-a-move' }).length, 0);
});
test('invalid query parameters are normalized and styles apply only to learning', () => {
  assert.deepEqual(readBlogQuery({ topic: 'bad', page: '-4', q: [' hi ', 'bye'], style: 'bad' }), { topic: 'all', style: '', q: 'hi', page: 1 });
  assert.equal(readBlogQuery({ topic: 'stories', style: 'hip-hop-dance-moves' }).style, '');
});
test('article dates do not shift to the previous day', () => {
  assert.equal(blogDate('2026-04-13'), 'Apr 13, 2026');
  assert.equal(blogDate('2026-09-06T22:27:21-07:00'), 'Sep 6, 2026');
});
test('pagination URLs preserve search, topic and style', () => {
  const href = blogHref({ topic: 'learn', style: 'house-dance', q: 'cross', page: 2 });
  const params = new URL(href, 'https://example.com').searchParams;
  assert.equal(params.get('q'), 'cross');
  assert.equal(params.get('page'), '2');
  assert.equal(params.get('style'), 'house-dance');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { blogMetadata } from '../src/lib/blog-metadata';
import { getAllPosts } from '../src/lib/posts';
import { STYLES, filterBlogPosts, readBlogQuery } from '../src/lib/blog-library';

const posts = getAllPosts();
const meta = (params: Record<string, string | string[] | undefined>) => blogMetadata(params, posts);
const base = 'https://dancewithceech.com/blog';

test('overview and explicit first page equivalents normalize consistently', () => {
  for (const params of [{}, { page: '1' }, { topic: 'all', page: '01' }, { topic: 'invalid' }]) {
    assert.equal(meta(params).canonical, base);
    assert.equal('robots' in meta(params), false);
  }
  assert.equal(meta({ view: 'all', page: '1' }).canonical, `${base}?view=all`);
});
test('genuine later pages use normalized self canonicals', () => {
  for (const page of [2, 3, 8]) {
    assert.equal(meta({ page: String(page) }).canonical, `${base}?view=all&page=${page}`);
    assert.equal('robots' in meta({ page: String(page) }), false);
  }
  assert.equal(meta({ page: '02', topic: 'all', style: 'ignored', utm_source: 'test', view: 'all' }).canonical, `${base}?view=all&page=2`);
  assert.equal(meta({ page: ['2', '3'] }).canonical, `${base}?view=all&page=2`);
});
test('useful filtered pagination gets its rendered canonical without changing robots', () => {
  const params = { page: '2', style: 'hip-hop-dance-moves', topic: 'learn', view: 'all' };
  assert.equal(meta(params).canonical, `${base}?view=all&topic=learn&style=hip-hop-dance-moves&page=2`);
  assert.equal('robots' in meta(params), false);
  assert.equal(meta({ q: '  Running  ', view: 'all' }).canonical, base);
  assert.equal(meta({ topic: 'stories' }).canonical, `${base}?view=all&topic=stories`);
  for (const style of Object.keys(STYLES)) {
    const params = { topic: 'learn', style, page: '2' };
    const pages = Math.ceil(filterBlogPosts(posts, readBlogQuery(params)).length / 12);
    assert.equal(meta(params).canonical, `${base}?view=all&topic=learn&style=${style}${pages > 1 ? '&page=2' : ''}`);
    assert.equal('robots' in meta(params), false);
  }
  assert.equal(meta({ topic: 'learn', style: 'hip-hop-dance-moves', page: '3' }).canonical, `${base}?view=all&topic=learn&style=hip-hop-dance-moves&page=3`);
});
test('invalid, empty and out-of-range pages cannot extend the canonical sequence', () => {
  for (const page of ['0', '-1', '1.5', 'abc', '', 'Infinity', '9007199254740992', '2e0']) {
    const normalizedPage = Number(page) === 2 ? '&page=2' : '';
    assert.equal(meta({ view: 'all', page }).canonical, `${base}?view=all${normalizedPage}`, page);
    assert.equal('robots' in meta({ page }), false);
  }
  assert.equal(meta({ page: '999' }).canonical, `${base}?view=all&page=8`);
  assert.equal('robots' in meta({ page: '999' }), false);
  assert.equal(meta({ q: 'no-matching-article', page: '2' }).canonical, base);
});

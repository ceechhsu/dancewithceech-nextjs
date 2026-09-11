import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (name) => readFile(new URL(`../src/components/${name}`, import.meta.url), 'utf8');
test('navigation prioritizes lessons, groups free learning and preserves auth on mobile', async () => {
  const nav = await read('Nav.tsx');
  assert.match(nav, /LearnFreeMenu/);
  assert.match(nav, /Book a Free Call/);
  assert.match(nav, /About Ceech/);
  assert.match(nav, /MobileMenu user=\{user\}/);
  assert.doesNotMatch(nav, /href="\/contact"/);
});
test('mobile overlay exposes state, traps focus and follows actual header height', async () => {
  const mobile = await read('MobileMenu.tsx');
  assert.match(mobile, /aria-expanded=\{open\}/);
  assert.match(mobile, /aria-controls=/);
  assert.match(mobile, /getBoundingClientRect/);
  assert.match(mobile, /Escape/);
  assert.match(mobile, /Tab/);
  assert.match(mobile, /overflow-y-auto/);
  assert.match(mobile, /UserMenu/);
  assert.match(mobile, /SignInButton/);
  assert.doesNotMatch(mobile, /57px/);
});
test('route changes reset disclosure state so browser Back cannot reopen menus', async () => {
  for (const file of ['MobileMenu.tsx', 'LearnFreeMenu.tsx']) {
    const source = await read(file);
    assert.match(source, /if \(pathname !== openedPath\)/);
  }
});

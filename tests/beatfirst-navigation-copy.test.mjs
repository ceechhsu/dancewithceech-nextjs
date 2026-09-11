import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('BeatFirst Rhythm Trainer appears under Learn Free without a duplicate free CTA', () => {
  const nav = fs.readFileSync(path.join(root, 'src/components/Nav.tsx'), 'utf8');
  const mobile = fs.readFileSync(path.join(root, 'src/components/MobileMenu.tsx'), 'utf8');
  const learning = fs.readFileSync(path.join(root, 'src/components/LearnFreeMenu.tsx'), 'utf8');
  assert.match(nav, /<LearnFreeMenu \/>/);
  assert.match(learning, /Learn Free/);
  assert.match(learning, /label: "BeatFirst Rhythm Trainer", href: "\/beat-first"/);
  assert.doesNotMatch(nav, />\s*Play Free\s*<\/Link>/);
  assert.match(mobile, /freeLinks\.map/);
});

test('Beat First hero states the training purpose directly', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/BeatFirstGame.tsx'), 'utf8');
  assert.match(source, /Train Your Rhythm<br \/>Before You Dance/);
});

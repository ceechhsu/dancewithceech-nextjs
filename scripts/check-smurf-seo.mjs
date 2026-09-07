import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const articlePath = new URL('../src/content/posts/hip-hop-dance-move-smurf.md', import.meta.url);

test('Smurf article teaches Buddha Stretch’s version and preserves useful search coverage', () => {
  const source = readFileSync(articlePath, 'utf8');

  assert.match(source, /title: "Smurf Dance: How to Do the 1980s Hip-Hop Move"/);
  assert.match(source, /description: "[^\"]*step by step[^\"]*beginner[^\"]*"/i);
  assert.match(source, /## What is the Smurf dance\?/);
  assert.match(source, /## How do you do the Smurf dance\?/);
  assert.match(source, /Buddha Stretch/);
  assert.match(source, /Phom Bandy/);
  assert.match(source, /https:\/\/www\.youtube\.com\/watch\?feature=shared&v=1BESmZUXIJs/);
  assert.match(source, /the demonstration does not teach the Smurf/i);
  assert.match(source, /video:\n/);
  assert.match(source, /\/hip-hop-dance-moves/);
  assert.match(source, /\/beat-first/);
  assert.doesNotMatch(source, /evolved from an earlier 1960s dance called "The Frug"/i);
});

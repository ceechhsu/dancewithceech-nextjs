import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const articlePath = new URL('../src/content/posts/hip-hop-dance-move-smurf.md', import.meta.url);

test('Smurf article leads with a beginner-focused answer and useful internal links', () => {
  const source = readFileSync(articlePath, 'utf8');

  assert.match(source, /title: "How to Do the Smurf Dance: Beginner 80s Hip-Hop Tutorial"/);
  assert.match(source, /description: "[^\"]*beginner[^\"]*step-by-step[^\"]*"/i);
  assert.match(source, /## What Is the Smurf Dance\?/);
  assert.match(source, /## How To Do the Smurf Dance/);
  assert.match(source, /\/hip-hop-dance-moves/);
  assert.match(source, /\/running-man-method/);
});

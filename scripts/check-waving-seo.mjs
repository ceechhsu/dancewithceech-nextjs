import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const articlePath = new URL('../src/content/posts/mastering-the-art-of-waving-a-fluid-funk-style-dance-move.md', import.meta.url);

test('waving article leads with a beginner-focused answer and useful internal links', () => {
  const source = readFileSync(articlePath, 'utf8');

  assert.match(source, /title: "How to Do the Waving Dance: Beginner Arm Wave Tutorial"/);
  assert.match(source, /description: "[^\"]*beginner[^\"]*step-by-step[^\"]*"/i);
  assert.match(source, /## What Is Waving\?/);
  assert.match(source, /## How To Do the Waving Dance/);
  assert.match(source, /\/funk-style-dance-moves/);
  assert.match(source, /\/running-man-method/);
});

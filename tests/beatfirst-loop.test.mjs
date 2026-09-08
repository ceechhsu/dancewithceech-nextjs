import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('BeatFirst bounds both preview and game repeat events', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/BeatFirstGame.tsx'), 'utf8');
  const intervalCount = (source.match(/window\.setInterval\(/g) || []).length;
  const clearCount = (source.match(/window\.clearInterval\(/g) || []).length;

  assert.equal(intervalCount, 2, 'expected preview and game beat loops');
  assert.ok(clearCount >= 2, 'each beat loop should be explicitly cleared when it ends');
  assert.match(source, /const beatLoopRef\s*=\s*useRef<number \| null>\(null\)/);
  assert.ok((source.match(/beatLoopRef\.current !== null/g) || []).length >= 3);
  assert.match(source, /const previewTotalSteps = beat\.bars \* STEPS_PER_BAR/);
  assert.match(source, /if \(step >= previewTotalSteps\)/);
  assert.match(source, /if \(step >= totalSteps\)/);
});

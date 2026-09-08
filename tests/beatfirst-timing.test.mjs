import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('BeatFirst scoring clock aligns with the first timed audio beat', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/BeatFirstGame.tsx'), 'utf8');
  assert.match(source, /startTimeRef\.current = performance\.now\(\) \+ stepMs/);
});

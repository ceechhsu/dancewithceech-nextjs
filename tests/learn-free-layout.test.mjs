import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Learn Free dropdown explicitly stacks links despite navigation nowrap styles', () => {
  const source = fs.readFileSync(new URL('../src/components/LearnFreeMenu.tsx', import.meta.url), 'utf8');
  assert.match(source, /className="absolute[^"]*\bgrid\b[^"]*whitespace-normal/);
});

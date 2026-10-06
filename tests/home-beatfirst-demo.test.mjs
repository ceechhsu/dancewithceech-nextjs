import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage offers the actual playable trainer instead of a screenshot', async () => {
 const home = await read('src/app/page.tsx');
 assert.match(home, /<HomeBeatFirstDemo\s*\/>/);
 assert.doesNotMatch(home, /beatfirst-current-ui\.png|beatfirst-results\.jpg/);
});

test('homepage sample reuses level one and provides a stop and full-trainer path', async () => {
 const demo = await read('src/components/HomeBeatFirstDemo.tsx');
 assert.match(demo, /beatfirst-preview\/ClapGame/);
 assert.match(demo, /levelId=\{1\}/);
 assert.match(demo, /Stop round/);
 assert.match(demo, /router\.push\('\/beat-first'\)/);
 assert.doesNotMatch(demo, /fetch\(|useProgress|localStorage|signIn\(/);
});

test('sample personal best survives replay within the page', async () => {
 const demo = await read('src/components/HomeBeatFirstDemo.tsx');
 assert.match(demo, /personalBest=\{best\}/);
 assert.match(demo, /Math\.max\(current \?\? 0, scoreAttempt\(attempt\)\.score\)/);
});

test('starting on a phone brings the tap pad into view below the fixed navigation', async () => {
 const demo = await read('src/components/HomeBeatFirstDemo.tsx');
 const css = await read('src/components/HomeBeatFirstDemo.module.css');
 assert.match(demo, /scrollIntoView\(\{ behavior: 'instant', block: 'start' \}\)/);
 assert.match(css, /scroll-margin-top: 88px/);
});

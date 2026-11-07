import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as timeline from '../public/practice/timeline.mjs';
const app=fs.readFileSync(new URL('../public/practice/app.js',import.meta.url),'utf8');

test('local playback stops at the parsed video end when Safari doubles fragmented MP4 duration',()=>{
 const duration=timeline.playbackDuration;
 assert.equal(typeof duration,'function');
 assert.equal(duration(24.873333333333335,12.395),12.395);
 assert.equal(duration(12.550333333333333,12.573),12.550333333333333);
 assert.equal(duration(12.48,undefined),12.48);
 assert.equal(duration(12.48,NaN),12.48);
 assert.equal(duration(12.48,0),12.48);
 const declaration=app.match(/function comparisonBounds\(value\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(declaration,'comparison timing must use the bounded media durations');
 const context={ref:{duration:12.550333333333333},stu:{duration:24.873333333333335},activeSyncJob:{local:true,reference:{duration:12.573},student:{duration:12.395}},playbackDuration:duration,reviewBounds:timeline.playbackBounds};
 vm.createContext(context);vm.runInContext(declaration,context);
 const bounds=vm.runInContext('comparisonBounds(-.5493333333333333)',context);
 assert.equal(bounds.end,12.944333333333333);
 assert.equal(app.includes('reviewBounds(ref.duration,stu.duration,'),false,'initial playback, timing edits, and restored windows all use the same limits');
});

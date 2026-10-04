import test from 'node:test';
import assert from 'node:assert/strict';
import {reusableEvidence} from '../public/practice/local-store.mjs';
test('cached analysis carries its verified frame clock into another comparison of the same bytes',()=>{
 const saved={analysis:{events:[]},samples:[{time:0,duration:.0334}],duration:1,videoTimeline:{version:2,clockOffset:-.011144444}};
 const reused=reusableEvidence(saved,{});
 assert.deepEqual(reused.videoTimeline,saved.videoTimeline);assert.deepEqual(reused.samples,saved.samples);assert.equal(reused.duration,1);
 const legacy=reusableEvidence({...saved,videoTimeline:{version:1}},{});
 assert.equal(legacy.videoTimeline,undefined);assert.equal(legacy.samples,undefined);
});

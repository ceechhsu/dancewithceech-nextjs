import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationSamples,calibrateVideoTimeline} from '../public/practice/local-video.mjs';

test('an edit excludes frames before and after its presentation interval without changing positive timestamps',()=>{
 const samples=presentationSamples([{time:.725811111,duration:.0334},{time:.759211111,duration:.0334},{time:13.550922222,duration:.0334},{time:13.617722222,duration:.0334}],{mediaStart:.748066667,duration:12.8081});
 assert.equal(samples.length,2);
 assert.ok(Math.abs(samples[0].time-.011144444)<1e-8);
 assert.ok(Math.abs(samples[1].time-12.802855555)<1e-8);
 assert.ok(Math.abs(samples[1].duration-.005244445)<1e-8);
});
function videoFor(samples,offset,{drift=0,failed=false}={}){
 let callback,id=0;
 const handlers=new Map();
 return {duration:1,requestVideoFrameCallback(fn){callback=fn;return ++id;},cancelVideoFrameCallback(){},addEventListener(type,fn){handlers.set(type,fn);},removeEventListener(type){handlers.delete(type);},set currentTime(t){
  const sample=[...samples].reverse().find(s=>s.time+offset<=t+1e-6)||samples[0];
  queueMicrotask(()=>{if(failed){handlers.get('error')?.();return;}callback?.(0,{mediaTime:sample.time+offset+(sample.time>.1?drift:0)});handlers.get('seeked')?.();});
 }};
}
const samples=Array.from({length:10},(_,i)=>({time:.011144444+i*.0334,duration:.0334}));
test('an edited camera file can use the measured browser-normalized clock, verified at beginning, middle and end',async()=>{
 const prepared={samples,duration:samples.at(-1).time+.0334,edited:true};
 const result=await calibrateVideoTimeline(videoFor(samples,-samples[0].time),prepared);
 assert.equal(result.clockOffset,-samples[0].time);
 assert.equal(result.samples[0].time,0);
 assert.ok(Math.abs(result.samples[5].time-5*.0334)<1e-10);
});
test('an edited file whose browser keeps the movie timestamps is left on that clock',async()=>{
 const prepared={samples,duration:1,edited:true};
 const result=await calibrateVideoTimeline(videoFor(samples,0),prepared);
 assert.equal(result.clockOffset,0);
 assert.strictEqual(result.samples,samples);
});
test('a differing frame or changing browser clock cannot be accepted as a timing correction',async()=>{
 const prepared={samples,duration:1,edited:true};
 await assert.rejects(()=>calibrateVideoTimeline(videoFor(samples,-samples[0].time,{drift:.012}),prepared),/timeline/);
 await assert.rejects(()=>calibrateVideoTimeline(videoFor(samples,-.04),prepared),/timeline/);
});
test('normal recorder samples skip calibration and retain their exact times',async()=>{
 const prepared={samples,duration:1,edited:false};
 const result=await calibrateVideoTimeline({},prepared);
 assert.strictEqual(result.samples,samples);assert.equal(result.clockOffset,0);
});


test('a first-frame gap near the frame duration still probes inside the first frame on either browser clock',async()=>{
 const frames=Array.from({length:10},(_,i)=>({time:.028+i*.0334,duration:.0334}));
 const prepared={samples:frames,duration:1,edited:true};
 const result=await calibrateVideoTimeline(videoFor(frames,-.028),prepared);
 assert.equal(result.samples[0].time,0);
});

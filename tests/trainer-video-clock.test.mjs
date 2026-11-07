import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationSamples,calibrateVideoTimeline} from '../public/practice/local-video.mjs';
import {pairTrial} from '../public/practice/local-contacts.mjs';
import {timingGrade} from '../public/practice/foot-review.mjs';

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
test('zero-origin recorder samples skip calibration and retain their exact times',async()=>{
 const prepared={samples:samples.map(s=>({...s,time:s.time-samples[0].time})),duration:1,edited:false};
 const result=await calibrateVideoTimeline({},prepared);
 assert.strictEqual(result.samples,prepared.samples);assert.equal(result.clockOffset,0);
});

test('fragmented recorder timestamps normalize only when the browser exposes the first frame at zero',async()=>{
 const frames=Array.from({length:10},(_,i)=>({time:.043333333+(i ? .021666667+(i-1)*.033333333 : 0),duration:i ? .033333333 : .021666667}));
 const prepared={samples:frames,duration:1,edited:false};
 const result=await calibrateVideoTimeline(videoFor(frames,-frames[0].time),prepared);
 assert.equal(result.clockOffset,-frames[0].time);
 assert.equal(result.samples[0].time,0);
 assert.ok(Math.abs(result.samples[5].time-(.021666667+4*.033333333))<1e-9);
});
test('a recorder clock that keeps source timestamps is not retimed',async()=>{
 const prepared={samples,duration:1,edited:false};
 const result=await calibrateVideoTimeline(videoFor(samples,0),prepared);
 assert.strictEqual(result.samples,samples);assert.equal(result.clockOffset,0);
});
test('a recorder clock with an arbitrary shift or drift cannot produce a verified timeline',async()=>{
 const prepared={samples,duration:1,edited:false};
 await assert.rejects(()=>calibrateVideoTimeline(videoFor(samples,-.005),prepared),/timeline/);
 await assert.rejects(()=>calibrateVideoTimeline(videoFor(samples,-samples[0].time,{drift:.012}),prepared),/timeline/);
});


test('a first-frame gap near the frame duration still probes inside the first frame on either browser clock',async()=>{
 const frames=Array.from({length:10},(_,i)=>({time:.028+i*.0334,duration:.0334}));
 const prepared={samples:frames,duration:1,edited:true};
 const result=await calibrateVideoTimeline(videoFor(frames,-.028),prepared);
 assert.equal(result.samples[0].time,0);
});

test('mapping frame and audio clocks together preserves early, on-beat and late scores',()=>{
 const shift=-.043333333,offset=.2;
 const reference=[-151,-100,-67,0,67,100,151].map((_,i)=>({beat:i+1,time:1+i*.6,foot:i%2?'right':'left'}));
 const events=reference.map((r,i)=>({id:String(i),foot:r.foot,time:r.time+offset+[-151,-100,-67,0,67,100,151][i]/1000}));
 const source=pairTrial(events,reference,offset);
 const browser=pairTrial(events.map(e=>({...e,time:e.time+shift})),reference,offset+shift);
 for(let i=0;i<source.length;i++){
  assert.ok(Math.abs(source[i].delta_ms-browser[i].delta_ms)<1e-9);
  assert.deepEqual(timingGrade(source[i].delta_ms),timingGrade(browser[i].delta_ms));
 }
});

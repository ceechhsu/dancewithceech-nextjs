import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/practice/local-engine.mjs',import.meta.url),'utf8').replace(/^import .*$/gm,'').replaceAll('export ','');
for(const initialFrame of [0,2,3])test(`retry analysis requests a different frame when initially displaying source frame ${initialFrame}`,async()=>{
 const samples=[{time:0,duration:1/600},{time:1/600,duration:25/600},{time:26/600,duration:12/600},{time:38/600,duration:26/600}];
 let frame=initialFrame;const seeks=[];
 const video={get currentTime(){return samples[frame].time;},duration:.15,videoWidth:1080,videoHeight:1920,requestVideoFrameCallback(){},pause(){}};
 class Worker {postMessage(data){queueMicrotask(()=>this.onmessage({data:data.type==='init'?{ready:true}:{row:{time:data.time},inferenceMs:1}}));}terminate(){}}
 const context={document:{hidden:false,addEventListener(){},removeEventListener(){}},navigator:{wakeLock:{request:async()=>({addEventListener(){},release:async()=>{}})}},Worker,OffscreenCanvas:class{},createImageBitmap:async()=>({}),performance,setTimeout,clearTimeout,CONTACT_VERSION:5,detectLocalContacts:()=>[],
  seekVideoFrame:async(_video,target)=>{
   const index=samples.findLastIndex(s=>s.time<=target);seeks.push(index);
   // Safari can finish a same-frame seek without submitting a new frame to
   // the compositor, so a new video-frame callback would never arrive.
   if(index===frame)throw Error('Video decoding paused. Keep this page open and retry.');
   frame=index;return {mediaTime:samples[index].time};
  }};
 vm.createContext(context);vm.runInContext(source,context);
 const result=await context.analyzeOnDevice(video,samples);
 assert.equal(result.frames,2);
 assert.deepEqual(seeks,initialFrame===0?[2,0,2]:[0,2]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {alignRecordedAudio} from '../public/practice/audio-alignment.mjs';

const sampleRate=16000,audioStart=.8,danceEnd=12.8;
function track(offset=0,{noise=false,cut=0,drift=0,unrelated=false,missing=[]}={}){
 const pcm=new Float32Array(Math.ceil((14+offset-cut)*sampleRate));
 for(let beat=0;beat<20;beat++){
  if(missing.includes(beat))continue;
  const start=audioStart+beat*.6+offset+(beat>=12?drift:0);
  const gain=beat%2?.24:.07,frequency=beat%2?2800:100;
  for(let i=0;i<Math.round(.42*sampleRate);i++){
   const t=i/sampleRate,index=Math.round(start*sampleRate)+i;
   if(index<0||index>=pcm.length)continue;
   const attack=Math.min(1,t/.004)*Math.exp(-t/.055);
   pcm[index]+=gain*attack*Math.sin(2*Math.PI*(unrelated?650:frequency)*t);
  }
 }
 if(noise)for(let i=0;i<pcm.length;i++){
  const t=i/sampleRate;
  const speech=(.08+.35*Math.exp(-(((t-4.47)/.19)**2))+.45*Math.exp(-(((t-6.86)/.16)**2))+.3*Math.exp(-(((t-10.9)/.2)**2)));
  pcm[i]+=speech*(Math.sin(2*Math.PI*380*t)+.35*Math.sin(2*Math.PI*720*t));
 }
 return pcm;
}
async function align(reference,student,{rate=sampleRate,stereo=false}={}){
 const old=globalThis.AudioContext;
 const buffers=[reference,student].map(pcm=>({sampleRate:rate,numberOfChannels:stereo?2:1,getChannelData:i=>i?Float32Array.from(pcm,x=>-x):pcm}));
 globalThis.AudioContext=class{async decodeAudioData(){return buffers.shift();}async close(){}};
 try{return await alignRecordedAudio(new Blob(),new Blob(),audioStart);}
 finally{if(old)globalThis.AudioContext=old;else delete globalThis.AudioContext;}
}

test('musical timing survives loud unrelated background audio and unequal beat volumes',async()=>{
 for(const offset of [-.296,.432]){
  const result=await align(track(),track(offset,{noise:true}));
  assert.equal(result.verified,true,result.reason);
  assert.ok(Math.abs(result.offset-offset)<=.01,JSON.stringify(result));
 }
});
test('noise cannot manufacture a match when the soundtrack is different',async()=>{
 const result=await align(track(),track(.432,{noise:true,unrelated:true}));
 assert.equal(result.verified,false);
});
test('noisy music with a changing dance clock still stops scoring',async()=>{
 const result=await align(track(),track(.432,{noise:true,drift:.09}));
 assert.equal(result.verified,false);
});
test('a noisy incomplete dance cannot match an earlier repeating section',async()=>{
 const student=track(.432,{noise:true});
 const result=await align(track(),student.slice(0,Math.round((danceEnd+.432-1.2)*sampleRate)));
 assert.equal(result.verified,false);
});

test('musical timing is independent of stereo polarity and decoder sample rate',async()=>{
 const rate=48000;
 const resample=pcm=>Float32Array.from({length:pcm.length*3},(_,i)=>pcm[Math.floor(i/3)]);
 const result=await align(resample(track()),resample(track(-.296,{noise:true})),{rate,stereo:true});
 assert.equal(result.verified,true,result.reason);
 assert.ok(Math.abs(result.offset+.296)<=.01);
});
test('noise cannot replace a missing final musical beat',async()=>{
 const result=await align(track(),track(.432,{noise:true,missing:[19]}));
 assert.equal(result.verified,false);
});
test('a few obscured musical hits do not discard consistent timing through all four bars',async()=>{
 const result=await align(track(),track(.432,{noise:true,missing:[6,11,14]}));
 assert.equal(result.verified,true,result.reason);
 assert.ok(Math.abs(result.offset-.432)<=.01);
});

test('extra beginning hits cannot disguise a cropped dance as an earlier complete section',async()=>{
 for(const earlyHits of [1,2]){
  const actualOffset=1.3;
  const student=track(actualOffset,{noise:true}).slice(0,Math.round((danceEnd+actualOffset-.8)*sampleRate));
  for(let hit=0;hit<earlyHits;hit++)for(let i=0;i<Math.round(.42*sampleRate);i++){
   const t=i/sampleRate,index=Math.round((audioStart+.1+hit*.6)*sampleRate)+i;
   const attack=Math.min(1,t/.004)*Math.exp(-t/.055);
   student[index]+=(hit%2?.24:.07)*attack*Math.sin(2*Math.PI*(hit%2?2800:100)*t);
  }
  const result=await align(track(),student);
  assert.equal(result.verified,false,`cropped dance with ${earlyHits} early hits: ${JSON.stringify(result)}`);
 }
});

function addBetweenBeatBursts(student,offset){
 for(const beat of [2,4,8,13])for(let i=0;i<Math.round(.24*sampleRate);i++){
  const t=i/sampleRate,index=Math.round((audioStart+beat*.6+offset+.2)*sampleRate)+i;
  if(index>=student.length)continue;
  const attack=Math.min(1,t/.004)*Math.exp(-t/.055);
  student[index]+=2*attack*(Math.sin(2*Math.PI*100*t)+Math.sin(2*Math.PI*2800*t));
 }
 return student;
}
test('loud bursts between musical attacks do not overpower the complete beat sequence',async()=>{
 for(const offset of [-.084,.432]){
  const result=await align(track(),addBetweenBeatBursts(track(offset),offset));
  assert.equal(result.verified,true,result.reason);
  assert.equal(result.method,'musical_attacks');
  assert.ok(Math.abs(result.offset-offset)<=.01,JSON.stringify(result));
 }
});
test('between-beat bursts cannot hide a changed musical clock',async()=>{
 const offset=-.084;
 const result=await align(track(),addBetweenBeatBursts(track(offset,{drift:.09}),offset));
 assert.equal(result.verified,false);
});
test('between-beat bursts cannot replace a missing ending',async()=>{
 const offset=-.084;
 const result=await align(track(),addBetweenBeatBursts(track(offset,{missing:[19]}),offset));
 assert.equal(result.verified,false);
});
test('between-beat bursts cannot manufacture the reference music from unrelated sound',async()=>{
 const offset=-.084;
 const result=await align(track(),addBetweenBeatBursts(track(offset,{unrelated:true}),offset));
 assert.equal(result.verified,false);
});

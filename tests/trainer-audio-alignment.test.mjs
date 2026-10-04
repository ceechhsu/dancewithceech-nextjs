import test from 'node:test';
import assert from 'node:assert/strict';
import {alignEnvelopes,envelope,alignRecordedAudio,ALIGNMENT_VERSION} from '../public/practice/audio-alignment.mjs';
import {localJob} from '../public/practice/local-video.mjs';
function signals(offset,unique=true){
 const rate=500,a=new Float32Array(6500),b=new Float32Array(7500);let seed=12;
 for(let i=400;i<6300;i++){
  seed=(seed*1664525+1013904223)>>>0;
  a[i]=unique&&i<1600?(seed/4294967296):Math.exp(-((i-400)%300)/22);
 }
 for(let i=0;i<a.length;i++){let j=i+Math.round(offset*rate);if(j>=0&&j<b.length)b[j]=a[i]*.4;}
 return [a,b];
}
test('the complete dance retains known shifts despite repeating drums',()=>{
 for(const offset of [-.168,-.768,.432]){const r=alignEnvelopes(...signals(offset),{audioStart:.8});assert.equal(r.verified,true);assert.equal(r.offset,offset);}
});
test('complete repeating drums with a verifiable ending retain their correct shift',()=>{
 const result=alignEnvelopes(...signals(-.168,false),{audioStart:.8});assert.equal(result.verified,true);assert.equal(result.offset,-.168);
});
test('silence cannot verify alignment',()=>assert.equal(alignEnvelopes(new Float32Array(6500),new Float32Array(6500),{audioStart:.8}).verified,false));
for(const lesson of ['marching','2step'])test(`${lesson} withholds scoring pairs until audio alignment is verified`,()=>{
 const record={id:'local-test',lesson:{id:lesson},offset:0,reference:{events:[{beat:1,foot:'right',time:3}],frame_times:[3]},samples:[{time:3}],analysis:{events:[{id:'a',foot:'right',time:3}]}};
 assert.equal(localJob(record,'ref','take').student.detected_landings.length,0);
 record.audioAlignment={verified:true};
 assert.equal(localJob(record,'ref','take').student.detected_landings.length,1);
});
test('44.1 kHz decoding retains the exact envelope clock over a 12 second track',()=>{
 assert.equal(envelope(new Float32Array(44100*12),44100).length,6000);
});
test('matches the known soundtrack ending rather than extra unrelated recording audio',()=>{
 const [a,b]=signals(-.168),reference=new Float32Array(9500),student=new Float32Array(10500);
 reference.set(a);student.set(b);
 for(let i=6500;i<reference.length;i++)reference[i]=(i%41)/41;
 for(let i=6500;i<student.length;i++)student[i]=(i%73)/73;
 const result=alignEnvelopes(reference,student,{audioStart:.8,audioDuration:12});
 assert.equal(result.verified,true);assert.equal(result.offset,-.168);
});
test('the complete dance establishes its own shift despite a different count-in peak',()=>{
 const [a,b]=signals(-.168);
 // Room sound can smear spoken syllables differently from the musical attacks.
 for(let i=1600;i>=400;i--)b[i-84+6]=a[i]*.4;
 const result=alignEnvelopes(a,b,{audioStart:.8,audioDuration:12});
 assert.equal(result.verified,true);assert.ok(Math.abs(result.offset+.168)<=.004);
});
test('a mismatch in the middle cannot be hidden by an aligned count-in and ending',()=>{
 const [a,b]=signals(-.168);
 for(let i=1900;i<3100;i++)b[i-84]=a[i-30]*.4;
 const result=alignEnvelopes(a,b,{audioStart:.8,audioDuration:12});
 assert.equal(result.verified,false);
});
test('a large timing change later in the take is flagged instead of time-warped',()=>{
 const [a,b]=signals(-.168);
 for(let i=4800;i<6200;i++)b[i-84]=a[i-35]*.4;
 assert.equal(alignEnvelopes(a,b,{audioStart:.8,audioDuration:12}).verified,false);
});
function waveform(rate,offset=0,gain=1){
 const [shape]=signals(0),out=new Float32Array(Math.ceil(13.4*rate));
 for(let i=0;i<out.length;i++){
  const t=i/rate-offset,index=Math.floor(t*500);
  out[i]=index>=0&&index<shape.length?gain*shape[index]*Math.sin(2*Math.PI*1000*t):0;
 }
 return out;
}
test('different decoder sample rates and microphone gain retain the same offset',()=>{
 for(const offset of [-.174,.432]){
  const result=alignEnvelopes(envelope(waveform(44100),44100),envelope(waveform(48000,offset,.3),48000),{audioStart:.8});
  assert.equal(result.verified,true);assert.ok(Math.abs(result.offset-offset)<=.002);
 }
});
test('a silent left channel does not prevent browser audio matching',async()=>{
 const previous=globalThis.AudioContext;let closed=false;
 const buffers=[0,.432].map(offset=>{
  const samples=waveform(16000,offset);
  return {sampleRate:16000,numberOfChannels:2,getChannelData:i=>i===0?new Float32Array(samples.length):samples};
 });
 globalThis.AudioContext=class{async decodeAudioData(){return buffers.shift();}async close(){closed=true;}};
 try{
  const blob=new Blob(),result=await alignRecordedAudio(blob,blob,.8);
  assert.equal(result.verified,true);assert.equal(result.offset,.432);assert.equal(result.version,ALIGNMENT_VERSION);
  assert.equal(closed,true);
 }finally{if(previous)globalThis.AudioContext=previous;else delete globalThis.AudioContext;}
});

test('stable dance music supplies the offset when speech has a 66 ms difference',()=>{
 const [a,b]=signals(-.08);
 // Count-in is 66 ms earlier than the consistent dance music.
 b.fill(0,0,1560);
 for(let i=400;i<1600;i++)b[i-73]=a[i]*.4;
 const result=alignEnvelopes(a,b,{audioStart:.8});
 assert.equal(result.verified,true);assert.equal(result.offset,-.08);
 assert.equal(result.method,'complete_dance');
});
test('a larger speech disagreement does not reject a consistently matched dance',()=>{
 const [a,b]=signals(-.08);b.fill(0,0,1560);
 for(let i=400;i<1600;i++)b[i-110]=a[i]*.4;
 const result=alignEnvelopes(a,b,{audioStart:.8});assert.equal(result.verified,true);assert.equal(result.offset,-.08);
});

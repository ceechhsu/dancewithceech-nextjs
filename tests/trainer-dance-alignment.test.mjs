import test from 'node:test';
import assert from 'node:assert/strict';
import {alignEnvelopes} from '../public/practice/audio-alignment.mjs';

const rate=500,audioStart=.8,danceStart=3.2,danceEnd=12.8;
function recording(offset,{repeat=false}={}){
 const reference=new Float32Array(7000),student=new Float32Array(8000);
 let seed=81;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Independent speech shapes. Matching the spoken count-in cannot establish the shift.
 for(let i=400;i<1600;i++)reference[i]=random();
 for(let i=400;i<1600;i++)student[i+Math.round(offset*rate)]=random()*.4;
 for(let beat=0;beat<16;beat++){
  const at=Math.round(danceStart*rate)+beat*300;
  for(let i=0;i<300;i++)reference[at+i]=repeat?Math.exp(-i/24):
   Math.exp(-i/(15+beat%5*4))+.6*Math.exp(-(((i-(60+beat*7%100))/14)**2));
 }
 for(let i=1600;i<6400;i++)student[i+Math.round(offset*rate)]=reference[i]*.4;
 return [reference,student];
}
const align=(pair)=>alignEnvelopes(...pair,{audioStart,audioDuration:12,bpm:100,beats:16});

test('the complete sixteen-beat dance establishes the shift without matching speech',()=>{
 for(const offset of [-.174,.432]){
  const result=align(recording(offset));
  assert.equal(result.verified,true,result.reason);
  assert.ok(Math.abs(result.offset-offset)<=.002);
  assert.equal(result.method,'complete_dance');
  assert.equal(result.windows.length,16);
  assert.equal(result.referenceStart,danceStart);
  assert.equal(result.referenceEnd,danceEnd);
 }
});
test('changing only the count-in waveform cannot change the dance offset',()=>{
 const pair=recording(.432),before=align(pair);
 pair[1].fill(0,0,Math.round((danceStart+.432-.02)*rate));
 const after=align(pair);
 assert.equal(after.verified,true,after.reason);
 assert.equal(after.offset,before.offset);
});
test('a reference ending between envelope bins does not require a nonexistent extra bin',()=>{
 const start=.573,first=Math.round((start+2.4)*rate),end=Math.floor((start+12)*rate);
 const reference=new Float32Array(end),student=new Float32Array(end+300),shift=100;
 for(let i=first;i<end;i++){
  reference[i]=Math.exp(-((i-first)%300)/24);
  student[i+shift]=reference[i]*.4;
 }
 const result=alignEnvelopes(reference,student,{audioStart:start});
 assert.equal(result.verified,true,result.reason);
 assert.equal(result.offset,.2);
 assert.equal(result.referenceEnd,end/rate);
});
test('all sixteen beat checks catch a mismatch at the first dance beat',()=>{
 const pair=recording(.432),start=Math.round((danceStart+.432)*rate);
 pair[1].fill(.02,start,start+300);
 const result=align(pair);
 assert.equal(result.verified,false);
 assert.equal(result.recovery,'retake');
});
test('one shifted dance beat cannot hide inside an otherwise aligned section',()=>{
 const pair=recording(.432),start=Math.round((danceStart+.432+7*.6)*rate);
 pair[1].copyWithin(start,start-40,start+260);
 assert.equal(align(pair).verified,false);
});
test('a quieter shifted beat cannot be hidden by the louder beats around it',()=>{
 const reference=new Float32Array(7000),student=new Float32Array(8000),shift=216;
 for(let beat=0;beat<16;beat++){
  const start=1600+beat*300,volume=beat%2?.05:1;
  for(let i=0;i<300;i++)reference[start+i]=volume*(Math.exp(-i/24)+.6*Math.exp(-(((i-70)/14)**2)));
  for(let i=0;i<300;i++)student[start+i+shift]=reference[start+i]*.4;
 }
 assert.equal(align([reference,student]).verified,true);
 const start=1600+7*300+shift;
 student.fill(0,start,start+300);
 for(let i=0;i<255;i++)student[start+45+i]=reference[1600+7*300+i]*.4;
 assert.equal(align([reference,student]).verified,false);
});
test('missing final musical beats cannot be replaced by an earlier repeating section',()=>{
 const [reference,student]=recording(.432);
 const result=align([reference,student.slice(0,Math.round((danceEnd+.432-1.2)*rate))]);
 assert.equal(result.verified,false);
 assert.equal(result.recovery,'retake');
});
test('matching repeating music must include the actual ending, not an earlier identical bar',()=>{
 const pair=recording(.432,{repeat:true}),result=align(pair);
 assert.equal(result.verified,true,result.reason);
 assert.equal(result.offset,.432);
});
test('a recording that continues the repeating rhythm beyond every candidate ending stays unverified',()=>{
 const reference=new Float32Array(10000),student=new Float32Array(10000);
 for(let i=0;i<10000;i++)reference[i]=student[i]=Math.exp(-(i%300)/24);
 const result=align([reference,student]);
 assert.equal(result.verified,false);
 assert.equal(result.recovery,'retake');
});

// Offsets always mean student time = reference time + offset.
export const ALIGNMENT_VERSION=3;
export function envelope(samples,sampleRate,rate=500){
 // A rounded, fixed block size changes the clock at 44.1 kHz. Bin by time.
 const out=new Float32Array(Math.floor(samples.length*rate/sampleRate));
 for(let i=0;i<out.length;i++){
  const start=Math.floor(i*sampleRate/rate),end=Math.floor((i+1)*sampleRate/rate);
  let power=0;for(let j=start;j<end;j++)power+=samples[j]**2;
  out[i]=Math.sqrt(power/Math.max(1,end-start));
 }
 return out;
}
function smooth(signal,rate){
 const radius=Math.max(1,Math.round(.006*rate));
 return Float32Array.from(signal,(_,i)=>{
  let sum=0,n=0;for(let j=Math.max(0,i-radius);j<=Math.min(signal.length-1,i+radius);j++){sum+=signal[j];n++;}
  return sum/n;
 });
}
function correlation(a,b,start,end,shift){
 let x=0,y=0,xx=0,yy=0,xy=0,n=0;
 for(let i=start;i<end;i++){const j=i+shift;if(j<0||j>=b.length)return -1;const u=a[i],v=b[j];x+=u;y+=v;xx+=u*u;yy+=v*v;xy+=u*v;n++;}
 const denominator=Math.sqrt((xx-x*x/n)*(yy-y*y/n));return denominator>1e-10?(xy-x*y/n)/denominator:-1;
}
function match(reference,student,start,end,min,max){
 let best={score:-1,shift:min};
 for(let shift=min;shift<=max;shift++){
  const score=correlation(reference,student,start,end,shift);
  if(score>best.score)best={score,shift};
 }
 return best;
}
export function alignEnvelopes(reference,student,{audioStart,audioDuration=12,rate=500,maxOffset=3}={}){
 if(!Number.isFinite(audioStart))return {verified:false,reason:'The reference count-in position is missing.'};
 if(!Number.isFinite(audioDuration)||audioDuration<8)return {verified:false,reason:'Not enough music to check alignment throughout the take.'};
 reference=smooth(reference,rate);student=smooth(student,rate);
 const start=Math.round(audioStart*rate),end=Math.round((audioStart+2.4)*rate);
 if(end>reference.length)return {verified:false,reason:'The reference count-in is incomplete.'};
 const scores=[];
 for(let shift=-Math.round(maxOffset*rate);shift<=maxOffset*rate;shift++)scores.push({shift,score:correlation(reference,student,start,end,shift)});
 scores.sort((a,b)=>b.score-a.score);const best=scores[0],rival=scores.find(s=>Math.abs(s.shift-best.shift)>.15*rate);
 if(best.score<.65||best.score-(rival?.score??-1)<.08)return {verified:false,reason:'The spoken count-in did not give a unique audio match.',correlation:best.score};
 // Check the lesson soundtrack, not silence or room noise after it finishes.
 const expectedEnd=Math.round((audioStart+audioDuration-.15)*rate),width=Math.round(2.2*rate);
 if(expectedEnd>reference.length)return {verified:false,reason:'The reference ending audio is incomplete.'};
 const musicEnd=Math.min(expectedEnd,student.length-best.shift-Math.round(.15*rate));
 if(musicEnd<(audioStart+8)*rate)return {verified:false,reason:'Not enough recorded music to check alignment through the ending.'};
 const first=Math.round((audioStart+3.2)*rate),last=musicEnd-width;
 const starts=[first,Math.round((first+last)/2),last],radius=Math.round(.15*rate);
 const windows=starts.map(at=>({start:at,end:at+width,...match(reference,student,at,at+width,best.shift-radius,best.shift+radius)}));
 const shifts=[best.shift,...windows.map(w=>w.shift)],spread=(Math.max(...shifts)-Math.min(...shifts))/rate*1000;
 const diagnostics={correlation:best.score,endingCorrelation:windows.at(-1).score,driftMs:(windows.at(-1).shift-best.shift)/rate*1000,spreadMs:spread,
  windows:windows.map(w=>({referenceStart:w.start/rate,offset:w.shift/rate,correlation:w.score}))};
 const musicShifts=windows.map(w=>w.shift).sort((a,b)=>a-b);
 const musicSpreadMs=(musicShifts.at(-1)-musicShifts[0])/rate*1000;
 const countInDifferenceMs=Math.abs(musicShifts[1]-best.shift)/rate*1000;
 // A unique spoken match establishes beat identity. Allow only a small refinement
 // when every dance-music window independently gives a strong, stable match.
 // Never stretch video or move individual contacts to follow a changing offset.
 const stableMusic=windows.every(w=>w.score>=.85)&&musicSpreadMs<=10&&countInDifferenceMs<=100;
 Object.assign(diagnostics,{countInOffset:best.shift/rate,musicSpreadMs,countInDifferenceMs});
 if(windows.some(w=>w.score<.5)||(spread>30&&!stableMusic))return {verified:false,reason:'The count-in, middle, and ending do not agree closely enough. Review alignment.',...diagnostics};
 // Musical attacks are less affected by speech coloration. Their median refines
 // the count-in match without moving individual beats or changing playback speed.
 const sorted=windows.map(w=>w.shift).sort((a,b)=>a-b),shift=sorted[1];
 return {verified:true,offset:shift/rate,method:spread>30?'stable_music_refinement':'count_in_and_music',...diagnostics};
}
export async function alignRecordedAudio(referenceBlob,studentBlob,audioStart,{audioDuration=12,signal}={}){
 const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!Audio)throw Error('Audio decoding is unavailable on this browser.');
 const context=new Audio({sampleRate:16000});
 try{
  signal?.throwIfAborted();
  const buffers=await Promise.all([referenceBlob,studentBlob].map(async blob=>context.decodeAudioData(await blob.arrayBuffer())));
  signal?.throwIfAborted();
  // Combine channel energy, avoiding stereo phase cancellation or a silent left channel.
  const signals=buffers.map(buffer=>{
   const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>envelope(buffer.getChannelData(i),buffer.sampleRate));
   return Float32Array.from(channels[0],(_,i)=>Math.sqrt(channels.reduce((sum,c)=>sum+c[i]**2,0)/channels.length));
  });
  await new Promise(resolve=>setTimeout(resolve,0));signal?.throwIfAborted();
  return {version:ALIGNMENT_VERSION,...alignEnvelopes(...signals,{audioStart,audioDuration})};
 }finally{await context.close();}
}

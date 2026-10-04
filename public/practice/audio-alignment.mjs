// Offsets always mean student time = reference time + offset.
export const ALIGNMENT_VERSION=4;
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
function repeatPeriod(reference,start,end,beatWidth){
 // Detect the reference's own repeating cadence. It can otherwise match an
 // earlier bar that still has more dance music after its purported ending.
 for(const beats of [1,2,4]){
  const width=beats*beatWidth;
  if(end-2*width>=start&&correlation(reference,reference,end-width,end,-width)>=.85)return width;
 }
 return 0;
}
function power(signal,start,end){
 let sum=0;for(let i=start;i<end;i++)sum+=signal[i]**2;return sum;
}
function variance(signal,start,end){
 let sum=0,squares=0;
 for(let i=start;i<end;i++){const value=signal[i];sum+=value;squares+=value*value;}
 const n=end-start;return n>0?(squares-sum*sum/n)/n:0;
}
function endingContinues(reference,student,end,shift,period,beatWidth,rate){
 if(!period)return false;
 const available=student.length-end-shift;
 const width=Math.min(period,Math.floor(available/beatWidth)*beatWidth);
 if(width<beatWidth)return false;
 const at=end+shift,start=end-period,radius=Math.round(.03*rate);
 // A smoothing tail after the final attack can correlate despite being almost
 // silent. Continued music must retain meaningful energy, as well as its shape.
 if(power(student,at,at+width)<.2*power(student,at-period,at-period+width))return false;
 return match(reference,student,start,start+width,shift+period-radius,shift+period+radius).score>=.65;
}
export function alignEnvelopes(reference,student,{audioStart,audioDuration=12,bpm=100,beats=16,countInBeats=4,rate=500,maxOffset=3}={}){
 const fail=(reason,diagnostics={})=>({verified:false,recovery:'retake',reason,...diagnostics});
 if(!Number.isFinite(audioStart)||audioStart<0||!Number.isFinite(bpm)||bpm<=0||!Number.isInteger(beats)||beats<4||!Number.isInteger(countInBeats)||countInBeats<0||!Number.isFinite(rate)||rate<=0||!Number.isFinite(maxOffset)||maxOffset<0)
  return fail('The lesson music timing is unavailable.');
 // envelope() retains complete bins only. Use the same convention at the fixed
 // musical ending instead of demanding an extra bin beyond the decoded file.
 const beatSeconds=60/bpm,first=Math.round((audioStart+countInBeats*beatSeconds)*rate),end=Math.floor((audioStart+(countInBeats+beats)*beatSeconds)*rate);
 if(!Number.isFinite(audioDuration)||audioDuration+.002<(countInBeats+beats)*beatSeconds||end>reference.length)
  return fail('The complete reference dance audio is unavailable.');
 // The reference count-in and trailing sound are outside the matching signal.
 reference=smooth(Float32Array.from(reference,(value,i)=>i>=first&&i<end?value:0),rate);student=smooth(student,rate);
 const scores=[],limit=Math.round(maxOffset*rate);
 // Compare the entire fixed dance section. Never shorten it to fit a candidate
 // or use the spoken count-in's waveform to select/refine the audio shift.
 for(let shift=-limit;shift<=limit;shift++)scores.push({shift,score:correlation(reference,student,first,end,shift)});
 scores.sort((a,b)=>b.score-a.score);
 if(scores[0].score<.65)return fail('The complete dance music did not match confidently.',{correlation:scores[0].score});
 const peaks=[];
 for(const candidate of scores){
  if(candidate.score<.5)break;
  if(!peaks.some(p=>Math.abs(p.shift-candidate.shift)<=.15*rate))peaks.push(candidate);
 }
 const beatWidth=Math.round(beatSeconds*rate),period=repeatPeriod(reference,first,end,beatWidth),radius=Math.min(Math.round(.1*rate),Math.floor(beatWidth/4)),consistencyRadius=Math.min(radius,Math.round(.03*rate));
 const checked=peaks.map(candidate=>{
  const windows=Array.from({length:beats},(_,i)=>{
   const start=Math.round(first+i*beatSeconds*rate),stop=i===beats-1?end:Math.round(first+(i+1)*beatSeconds*rate);
   const trim=Math.min(Math.round(.04*rate),Math.floor((stop-start)/4));
   const interiorVariance=variance(student,start+trim+candidate.shift,stop-trim+candidate.shift);
   // Exclude smoothing from the next attack. Otherwise a loud neighbor can
   // mask this beat. Each beat must match within 30 ms of the whole-section
   // clock; these checks cannot compensate for a shifted individual beat.
   const checkEnd=stop-Math.max(1,Math.round(.006*rate));
   return {beat:i+1,start,end:stop,interiorVariance,...match(reference,student,start,checkEnd,candidate.shift-consistencyRadius,candidate.shift+consistencyRadius)};
  });
  // Individual attacks can have broad or differently shaped peaks after room
  // recording. Overlapping two-beat sections test the clock throughout the
  // whole dance without letting that one-attack uncertainty look like drift.
  const sections=Array.from({length:beats-1},(_,i)=>{
   const start=windows[i].start,stop=windows[i+1].end;
   return {firstBeat:i+1,lastBeat:i+2,start,end:stop,...match(reference,student,start,stop,candidate.shift-radius,candidate.shift+radius)};
  });
  const shifts=sections.map(w=>w.shift),spreadMs=(Math.max(candidate.shift,...shifts)-Math.min(candidate.shift,...shifts))/rate*1000;
  const continues=endingContinues(reference,student,end,candidate.shift,period,beatWidth,rate);
  return {...candidate,windows,sections,spreadMs,continues,valid:!continues&&spreadMs<=30&&windows.every(w=>w.score>=.5&&w.interiorVariance>1e-10)};
 });
 const viable=checked.filter(c=>c.valid),best=viable[0],rival=viable[1];
 if(!best||best.score<.65)return fail('We could not match every dance beat and its ending consistently.',{correlation:scores[0].score});
 const diagnostics={correlation:best.score,endingCorrelation:best.windows.at(-1).score,referenceStart:first/rate,referenceEnd:end/rate,
  studentStart:(first+best.shift)/rate,studentEnd:(end+best.shift)/rate,beats,spreadMs:best.spreadMs,
  driftMs:(best.sections.at(-1).shift-best.sections[0].shift)/rate*1000,endingChecked:true,
  sections:best.sections.map(w=>({firstBeat:w.firstBeat,lastBeat:w.lastBeat,offset:w.shift/rate,correlation:w.score})),
  windows:best.windows.map(w=>({beat:w.beat,referenceStart:w.start/rate,referenceEnd:w.end/rate,offset:w.shift/rate,correlation:w.score}))};
 if(rival&&best.score-rival.score<.08)return fail('More than one complete dance section matches. We could not identify the correct first and last beats.',{...diagnostics,rivalOffset:rival.shift/rate});
 // Only this one whole-section offset affects playback/scoring. Beat checks
 // verify consistency; they never shift individual contacts or stretch time.
 return {verified:true,offset:best.shift/rate,method:'complete_dance',...diagnostics};
}
export async function alignRecordedAudio(referenceBlob,studentBlob,audioStart,{audioDuration=12,bpm=100,beats=16,signal}={}){
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
  return {version:ALIGNMENT_VERSION,...alignEnvelopes(...signals,{audioStart,audioDuration,bpm,beats})};
 }finally{await context.close();}
}

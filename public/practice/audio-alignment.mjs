// Offsets always mean student time = reference time + offset.
export const ALIGNMENT_VERSION=6;
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
function endingContinues(reference,student,end,shift,period,beatWidth,rate,minimumWidth=beatWidth){
 if(!period)return false;
 const available=student.length-end-shift;
 const width=Math.min(period,minimumWidth<beatWidth?Math.floor(available):Math.floor(available/beatWidth)*beatWidth);
 if(width<minimumWidth)return false;
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

// Keep independent frequency bands: speech or another sound can dominate the
// broadband loudness while musical attacks remain identifiable in other bands.
// Centered windows share the envelope clock, including at different decode rates.
function musicBands(buffer,rate=500){
 const sampleRate=buffer.sampleRate;
 let size=1;while(size<sampleRate*.032)size*=2;
 const half=size/2,window=Float64Array.from({length:size},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(size-1)));
 const reverse=new Uint32Array(size),bits=Math.log2(size);
 for(let i=0;i<size;i++){let value=i,r=0;for(let j=0;j<bits;j++){r=r*2+(value&1);value>>=1;}reverse[i]=r;}
 const ranges=[[40,200],[200,500],[500,1500],[1500,4000],[4000,7500]];
 const binBand=Int8Array.from({length:half+1},(_,i)=>ranges.findIndex(([lo,hi])=>i*sampleRate/size>=lo&&i*sampleRate/size<Math.min(hi,sampleRate/2)));
 const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 const length=Math.floor(channels[0].length*rate/sampleRate),bands=ranges.map(()=>new Float32Array(length));
 const real=new Float64Array(size),imag=new Float64Array(size);
 for(let frame=0;frame<length;frame++){
  const center=Math.floor(frame*sampleRate/rate);
  for(const samples of channels){
   for(let i=0;i<size;i++){real[reverse[i]]=(samples[center+i-half]||0)*window[i];imag[reverse[i]]=0;}
   for(let width=2;width<=size;width*=2){
    const angle=-2*Math.PI/width,wr=Math.cos(angle),wi=Math.sin(angle);
    for(let start=0;start<size;start+=width){
     let ur=1,ui=0;
     for(let i=0;i<width/2;i++){
      const left=start+i,right=left+width/2,tr=ur*real[right]-ui*imag[right],ti=ur*imag[right]+ui*real[right];
      real[right]=real[left]-tr;imag[right]=imag[left]-ti;real[left]+=tr;imag[left]+=ti;
      const next=ur*wr-ui*wi;ui=ur*wi+ui*wr;ur=next;
     }
    }
   }
   for(let i=1;i<=half;i++)if(binBand[i]>=0)bands[binBand[i]][frame]+=(real[i]**2+imag[i]**2)/channels.length;
  }
 }
 return bands.map(band=>Float32Array.from(band,Math.sqrt));
}

function alignMusicalPattern(reference,student,{audioStart,audioDuration=12,bpm=100,beats=16,countInBeats=4,rate=500,maxOffset=3,attacksOnly=false}={}){
 const fail=(reason,details={})=>({verified:false,recovery:'retake',reason,...details});
 if(!Number.isFinite(audioStart)||audioStart<0||!Number.isFinite(audioDuration)||!Number.isFinite(bpm)||bpm<=0||!Number.isInteger(beats)||beats<4||!Number.isInteger(countInBeats)||countInBeats<0||!Number.isFinite(rate)||rate<=0||!Number.isFinite(maxOffset)||maxOffset<0)
  return fail('The lesson music timing is unavailable.');
 const beatSeconds=60/bpm,trackStart=Math.round(audioStart*rate),first=Math.round((audioStart+countInBeats*beatSeconds)*rate),end=Math.floor((audioStart+(countInBeats+beats)*beatSeconds)*rate),beatWidth=Math.round(beatSeconds*rate);
 if(!Number.isFinite(trackStart)||trackStart<0||!Number.isFinite(end)||end>reference[0].length||audioDuration+.002<(countInBeats+beats)*beatSeconds)return fail('The complete reference dance audio is unavailable.');
 const rp=reference.map(b=>power(b,first,end)),sp=student.map(b=>power(b,0,b.length));
 const active=reference.map((_,i)=>i).filter(i=>rp[i]>=Math.max(...rp)*.005&&sp[i]>=Math.max(...sp)*.0001&&rp[i]>1e-10&&sp[i]>1e-10);
 if(!active.length)return fail('The musical beat pattern could not be identified through the background sound.');
 // Require room for the whole lesson, without comparing spoken syllables or
 // using their waveform to select an offset. This prevents cropped endings
 // from being replaced by an earlier repeating section of the same rhythm.
 const minimum=Math.max(-Math.round(maxOffset*rate),-trackStart),maximum=Math.min(Math.round(maxOffset*rate),student[0].length-end);
 if(maximum<minimum)return fail('The recording does not contain the complete lesson audio.');
 const attackWidth=Math.round(Math.min(.18,beatSeconds*.3)*rate),attackLead=Math.round(Math.min(.06,beatSeconds*.1)*rate);
 const attackWindows=Array.from({length:beats},(_,i)=>{
  const at=first+i*beatWidth,start=Math.max(0,at-attackLead),stop=Math.min(end,at+attackWidth);
  const variances=active.map(b=>({band:b,value:variance(reference[b],start,stop)}));
  const strongest=Math.max(...variances.map(v=>v.value));
  return {start,end:stop,bands:variances.filter(v=>v.value>=strongest*.025&&v.value>1e-10).map(v=>v.band)};
 });
 // Normalize each musical attack independently. A loud unrelated burst later
 // within a beat must not outweigh the correctly timed music at its beginning.
 const attackScore=(startBeat,stopBeat,shift)=>{
  // Strong onset evidence must span every bar. A few masked weak hits may not
  // supply a clock, but the short attack-shape checks below still inspect all.
  let sum=0,n=0;
  for(let at=startBeat;at<stopBeat;at+=4){
   const scores=[];
   for(let i=at;i<Math.min(stopBeat,at+4);i++){
    const w=attackWindows[i];
    scores.push(Math.max(0,...w.bands.map(b=>correlation(reference[b],student[b],w.start,w.end,shift))));
   }
   const count=Math.min(2,scores.length);scores.sort((a,b)=>b-a);
   sum+=scores.slice(0,count).reduce((total,value)=>total+value,0);n+=count;
  }
  return sum/n;
 };
 const attackMatch=(startBeat,stopBeat,min,max)=>{
  let best={score:-1,shift:min};
  for(let shift=min;shift<=max;shift++){const score=attackScore(startBeat,stopBeat,shift);if(score>best.score)best={score,shift};}
  return best;
 };
 const peaks=[];
 if(attacksOnly){
  const scores=[];for(let shift=minimum;shift<=maximum;shift++)scores.push({shift,score:attackScore(0,beats,shift)});
  scores.sort((a,b)=>b.score-a.score);
  for(const c of scores){if(c.score<.8)break;if(!peaks.some(p=>Math.abs(p.shift-c.shift)<=.15*rate))peaks.push(c);if(peaks.length===4)break;}
 }
 for(const band of attacksOnly?[]:active){
  const scores=[];for(let shift=minimum;shift<=maximum;shift++)scores.push({shift,score:correlation(reference[band],student[band],first,end,shift)});
  scores.sort((a,b)=>b.score-a.score);
  const separated=[];
  for(const c of scores){if(c.score<.55)break;if(!separated.some(p=>Math.abs(p.shift-c.shift)<=.15*rate))separated.push(c);if(separated.length===4)break;}
  for(const c of separated)if(!peaks.some(p=>Math.abs(p.shift-c.shift)<=.03*rate))peaks.push(c);
 }
 const radius=Math.round(.03*rate),barRadius=Math.round(.1*rate);
 const refVariances=reference.map(b=>Math.max(...Array.from({length:beats},(_,i)=>variance(b,first+i*beatWidth,Math.min(end,first+(i+1)*beatWidth)))));
 const checked=peaks.map(candidate=>{
  const bars=Array.from({length:Math.ceil(beats/4)},(_,i)=>{
   const start=first+i*4*beatWidth,stop=Math.min(end,start+4*beatWidth);
   if(attacksOnly)return {bar:i+1,...attackMatch(i*4,Math.min(beats,i*4+4),Math.max(minimum,candidate.shift-barRadius),Math.min(maximum,candidate.shift+barRadius))};
   const matches=active.map(band=>({band,...match(reference[band],student[band],start,stop,Math.max(minimum,candidate.shift-barRadius),Math.min(maximum,candidate.shift+barRadius))}));
   return {bar:i+1,...matches.sort((a,b)=>b.score-a.score)[0]};
  });
  const shifts=bars.map(b=>b.shift).sort((a,b)=>a-b),shift=Math.round(shifts[Math.floor(shifts.length/2)]),spreadMs=(shifts.at(-1)-shifts[0])/rate*1000;
  const windows=Array.from({length:countInBeats+beats},(_,i)=>{
   const start=i<countInBeats?trackStart+i*beatWidth:first+(i-countInBeats)*beatWidth,stop=i===countInBeats+beats-1?end:start+beatWidth;
   const checkStart=start,checkEnd=attacksOnly?Math.min(stop,start+attackWidth):stop;
   const strongest=Math.max(...active.map(b=>variance(reference[b],checkStart,checkEnd)));
   const eligible=active.filter(b=>variance(reference[b],checkStart,checkEnd)>1e-10&&variance(reference[b],checkStart,checkEnd)>=(attacksOnly?strongest:refVariances[b])*.025);
   const matches=eligible.map(band=>({band,...match(reference[band],student[band],checkStart,checkEnd,Math.max(minimum,shift-radius),Math.min(maximum,shift+radius))}));
   const best=matches.sort((a,b)=>b.score-a.score)[0]||{score:-1,shift};
   let anchored=false;
   if(attacksOnly){
    const anchorStart=Math.max(0,start-attackLead);
    const vars=active.map(b=>({band:b,value:variance(reference[b],anchorStart,checkEnd)})),strongest=Math.max(...vars.map(v=>v.value));
    const anchorBands=vars.filter(v=>v.value>=strongest*.025&&v.value>1e-10).map(v=>v.band);
    anchored=anchorBands.some(b=>match(reference[b],student[b],anchorStart,checkEnd,Math.max(minimum,shift-radius),Math.min(maximum,shift+radius)).score>=.8);
   }
   return {beat:i-countInBeats+1,...best,supported:best.score>=.68,anchored};
  });
  const dance=windows.slice(countInBeats),prefix=windows.slice(0,countInBeats),matched=dance.filter(w=>w.supported).length;
  // A cropped recording can leave less than one beat after a false ending.
  // Check even that partial continuation rather than accepting an earlier bar.
  const continues=active.some(b=>endingContinues(reference[b],student[b],end,shift,repeatPeriod(reference[b],first,end,beatWidth),beatWidth,rate,Math.max(1,Math.round(.04*rate))));
  const supportedBars=bars.every((bar,i)=>bar.score>=.6&&dance.slice(i*4,i*4+4).filter(w=>w.supported).length>=Math.min(3,dance.slice(i*4,i*4+4).length));
  const prefixSupported=!countInBeats||(prefix.slice(0,Math.min(2,countInBeats)).every(w=>w.supported)&&prefix.filter(w=>w.supported).length>=Math.ceil(countInBeats/2));
  const anchorsSupported=!attacksOnly||(bars.every((bar,i)=>bar.score>=.8&&dance.slice(i*4,i*4+4).filter(w=>w.anchored).length>=Math.min(2,dance.slice(i*4,i*4+4).length))&&dance.at(-1).anchored&&prefix.slice(0,Math.min(2,countInBeats)).every(w=>w.anchored));
  const valid=spreadMs<=30&&supportedBars&&anchorsSupported&&matched>=Math.ceil(beats*.75)&&dance.at(-1).supported&&prefixSupported&&!continues;
  const quality=bars.reduce((sum,b)=>sum+b.score,0)/bars.length;
  return {shift,quality,bars,windows,matched,spreadMs,continues,valid};
 });
 const viable=checked.filter(c=>c.valid).sort((a,b)=>b.quality-a.quality),best=viable[0],rival=viable.find(c=>Math.abs(c.shift-best.shift)>.15*rate);
 const compact=c=>({offset:c.shift/rate,matchedBeats:c.matched,spreadMs:c.spreadMs,continues:c.continues,bars:c.bars.map(b=>({bar:b.bar,offset:b.shift/rate,correlation:b.score})),valid:c.valid});
 if(!best)return fail('The musical peaks did not identify one consistent complete dance.',{method:attacksOnly?'musical_attacks':'musical_pattern',candidates:checked.map(compact)});
 if(rival&&best.quality-rival.quality<.08)return fail('More than one complete musical pattern matches. We could not identify the correct first and last beats.',{method:attacksOnly?'musical_attacks':'musical_pattern',candidates:viable.map(compact)});
 return {verified:true,method:attacksOnly?'musical_attacks':'musical_pattern',offset:best.shift/rate,referenceStart:first/rate,referenceEnd:end/rate,studentStart:(first+best.shift)/rate,studentEnd:(end+best.shift)/rate,beats,matchedBeats:best.matched,expectedPeaks:countInBeats+beats,matchedPeaks:best.windows.filter(w=>w.supported).length,spreadMs:best.spreadMs,endingChecked:true,bars:compact(best).bars,windows:best.windows.map(w=>({beat:w.beat,band:w.band,correlation:w.score,supported:w.supported,...(attacksOnly?{anchored:w.anchored}:{})})),correlation:best.quality};
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
  const options={audioStart,audioDuration,bpm,beats},clean=alignEnvelopes(...signals,options);
  if(clean.verified)return {version:ALIGNMENT_VERSION,...clean};
  signal?.throwIfAborted();
  const bandSignals=buffers.map(buffer=>musicBands(buffer));
  await new Promise(resolve=>setTimeout(resolve,0));signal?.throwIfAborted();
  const pattern=alignMusicalPattern(...bandSignals,options);
  if(pattern.verified)return {version:ALIGNMENT_VERSION,...pattern};
  signal?.throwIfAborted();
  return {version:ALIGNMENT_VERSION,...alignMusicalPattern(...bandSignals,{...options,attacksOnly:true})};
 }finally{await context.close();}
}

export function reviewBounds(referenceDuration, studentDuration, offset) {
  const start = Math.max(0, -offset), end = Math.min(referenceDuration, studentDuration-offset);
  return Number.isFinite(start+end) && end-start >= .05 ? {start,end} : null;
}
// Require shared footage, but retain the tail of either recording for playback.
export function playbackBounds(referenceDuration, studentDuration, offset) {
 const shared=reviewBounds(referenceDuration,studentDuration,offset);
 return shared?{start:shared.start,end:Math.max(referenceDuration,studentDuration-offset)}:null;
}
export function sourceTimes(time, bounds, offset) {
  const reference = Math.max(bounds.start, Math.min(bounds.end,time));
  return {reference,student:reference+offset};
}
function nearestFrameIndex(time,frameTimes){
 if(!Number.isFinite(time)||!Array.isArray(frameTimes)||!frameTimes.length)return -1;
 let best=-1,distance=Infinity;
 for(let i=0;i<frameTimes.length;i++){
  const frameTime=Number(frameTimes[i]);
  if(!Number.isFinite(frameTime))return -1;
  const next=Math.abs(frameTime-time);
  if(next<distance){best=i;distance=next;}
 }
 return best;
}
function lowerBoundTime(frameTimes,time){
 let low=0,high=frameTimes.length;
 while(low<high){const middle=(low+high)>>>1;if(Number(frameTimes[middle])<time)low=middle+1;else high=middle;}
 return low;
}
function upperBoundTime(frameTimes,time){
 let low=0,high=frameTimes.length;
 while(low<high){const middle=(low+high)>>>1;if(Number(frameTimes[middle])<=time)low=middle+1;else high=middle;}
 return low;
}
// Step through the displayed source frame, then map back to comparison time.
export function frameStepTime(time,frameTimes,direction,bounds,offset=0){
 if(!Number.isFinite(time+offset)||![1,-1].includes(direction)||!bounds||!Number.isFinite(bounds.start+bounds.end)||bounds.end<bounds.start||!Array.isArray(frameTimes)||!frameTimes.length)return null;
 if(frameTimes.some((t,i)=>!Number.isFinite(t)||(i&&t<=frameTimes[i-1])))return null;
 const index=upperBoundTime(frameTimes,time+offset)-1,next=index+direction;
 if(next<0||next>=frameTimes.length)return null;
 // Seek just inside the frame: browser currentTime may round exact boundaries.
 const width=next+1<frameTimes.length?frameTimes[next+1]-frameTimes[next]:.004;
 const target=frameTimes[next]+Math.min(.001,width/4)-offset;
 const clamped=Math.max(bounds.start,Math.min(bounds.end,target));
 if(upperBoundTime(frameTimes,clamped+offset)-1!==next||(direction>0?clamped<=time:clamped>=time))return null;
 return clamped;
}
export function frameTimecode(time,frameTimes){
 if(!Number.isFinite(time)||!Array.isArray(frameTimes)||!frameTimes.length)return null;
 const after=upperBoundTime(frameTimes,time),frameIndex=Math.max(0,after-1);
 const frameTime=Number(frameTimes[frameIndex]);
 if(!Number.isFinite(frameTime))return null;
 const wholeSeconds=Math.max(0,Math.floor(frameTime)),minute=Math.floor(wholeSeconds/60),second=wholeSeconds%60;
 const firstFrame=lowerBoundTime(frameTimes,wholeSeconds),frame=Math.max(0,frameIndex-firstFrame);
 return `${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}:${String(frame).padStart(2,'0')}`;
}
export function markerFrameLabels(events,frameTimes){
 if(!Array.isArray(events)||!Array.isArray(frameTimes)||frameTimes.length<2)return [];
 const frames=frameTimes.map(Number);
 if(frames.some((time,index)=>!Number.isFinite(time)||(index>0&&time<=frames[index-1])))return [];
 const result=[];
 for(const event of events){
  const beat=Number(event?.beat),time=Number(event?.time);
  if(!Number.isInteger(beat)||beat<1||beat>16||!Number.isFinite(time))continue;
  const center=nearestFrameIndex(time,frames);
  for(const [frameIndex,label] of [[center-1,`Beat #${beat}-`],[center,`Beat #${beat}`],[center+1,`Beat #${beat}+`]]){
   if(frameIndex>=0&&frameIndex<frames.length)result.push({beat,frameIndex,frameTime:frames[frameIndex],label});
  }
 }
 return result.sort((a,b)=>a.frameIndex-b.frameIndex||a.beat-b.beat);
}
export function markerLabelsAtTime(time,labels,frameTimes){
 if(!Number.isFinite(time)||!Array.isArray(frameTimes)||!frameTimes.length||!Array.isArray(labels))return [];
 const frameIndex=Math.max(0,upperBoundTime(frameTimes,time)-1);
 return labels.filter(item=>item.frameIndex===frameIndex).map(item=>item.label);
}
export class PlaybackIntent {
  serial = 0;
  begin() { return ++this.serial; }
  cancel() { this.serial++; }
  isCurrent(request) { return this.serial === request; }
}
// Provisional instructor calibration for the tested marching capture setup.
export function marchingTimingDefault(job){
 const r=job.recording,v=r?.videoSettings;
 const tested=job.lesson?.id==='marching'&&[2,3].includes(job.lesson.version)&&
   r?.source==='browser-recording'&&r.completed===true&&!r.interrupted&&
   v?.width===1080&&v.height===1920&&v.facingMode==='user'&&Math.abs(v.frameRate-30)<1;
 if(!tested)return null;
 // The clean master in version 3 begins 67 ms earlier in reference video time.
 return job.lesson.version===3 ? -0.216 : -0.283;
}

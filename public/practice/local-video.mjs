import {createFile} from './trial-assets/mp4box.js';
import {pairTrial} from './local-contacts.mjs';
export const VIDEO_TIMELINE_VERSION=2;

export function presentationSamples(samples,{mediaStart=0,duration=Infinity}={}){
 return samples.map(s=>({time:s.time-mediaStart,duration:s.duration}))
  .filter(s=>s.time>=-1e-6&&s.time<duration)
  .map(s=>({time:Math.max(0,s.time),duration:Math.min(s.duration,duration-Math.max(0,s.time))}))
  .sort((a,b)=>a.time-b.time);
}
export function seekVideoFrame(video,target,{signal}={}){
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  let frameId,timer,meta,seeked=false;
  const cleanup=()=>{clearTimeout(timer);video.cancelVideoFrameCallback(frameId);video.removeEventListener('seeked',onSeek);video.removeEventListener('error',onError);signal?.removeEventListener('abort',onAbort);};
  const finish=()=>{if(meta&&seeked){cleanup();resolve(meta);}};
  const onSeek=()=>{seeked=true;finish();},onError=()=>{cleanup();reject(Error('This video frame could not be decoded.'));},onAbort=()=>{cleanup();reject(signal.reason||Error('Analysis cancelled.'));};
  frameId=video.requestVideoFrameCallback((_,m)=>{meta=m;finish();});video.addEventListener('seeked',onSeek);video.addEventListener('error',onError);signal?.addEventListener('abort',onAbort,{once:true});
  timer=setTimeout(()=>{cleanup();reject(Error('Video decoding paused. Keep this page open and retry.'));},15000);video.currentTime=target;
 });
}
export async function calibrateVideoTimeline(video,prepared,{signal}={}){
 signal?.throwIfAborted();
 const {samples,edited}=prepared;
 if(!edited||samples[0].time<=.001)return {...prepared,clockOffset:0};
 // Edited MP4s may expose either their movie clock or a decoder clock starting
 // at the first retained frame. Only that known first-frame difference is
 // eligible, and it must agree at three distant frames before use.
 const first=samples[0].time;
 if(first>=samples[0].duration)throw Error('This edited video timeline could not be verified. Choose another recording.');
 let clockOffset;
 for(const index of [...new Set([0,Math.floor(samples.length/2),samples.length-1])]){
  signal?.throwIfAborted();const sample=samples[index];
  const inset=clockOffset===undefined?Math.min(.001,(sample.duration-first)/2):Math.min(sample.duration/2,.01);
  const time=sample.time+(clockOffset||0),target=Math.min(video.duration-.0001,time+inset);
  const meta=await seekVideoFrame(video,target,{signal});
  if(clockOffset===undefined){
   if(Math.abs(meta.mediaTime-sample.time)<=.001)clockOffset=0;
   else if(Math.abs(meta.mediaTime)<=.001)clockOffset=-first;
   else throw Error('This edited video timeline could not be verified. Choose another recording.');
  }
  if(Math.abs(meta.mediaTime-(sample.time+clockOffset))>.008)throw Error('This edited video timeline changes during playback. Choose another recording.');
 }
 const resolved=clockOffset?samples.map(s=>({...s,time:s.time+clockOffset})):samples;
 return {...prepared,samples:resolved,duration:Math.min(video.duration,prepared.duration+clockOffset),clockOffset};
}

// Patch duration fields in place: never resize boxes, move samples, or retime media.
function trackSamples(file,trackId){
 const fragments=file.moofs?.flatMap(m=>m.trafs.filter(t=>t.tfhd.track_id===trackId))||[];
 if(!fragments.length)return file.getTrackSamplesInfo(trackId);
 const defaults=file.moov.mvex?.trexs?.find(t=>t.track_id===trackId),out=[];let next=0;
 for(const fragment of fragments){
  let dts=fragment.tfdt?.baseMediaDecodeTime??next;
  for(const run of fragment.truns){
   for(let i=0;i<run.sample_count;i++){
    const duration=run.sample_duration?.[i]??((fragment.tfhd.flags&8)?fragment.tfhd.default_sample_duration:defaults?.default_sample_duration);
    if(!duration)throw Error('This MP4 fragment has no sample duration.');
    out.push({cts:dts+(run.sample_composition_time_offset?.[i]??0),duration,timescale:file.getTrackById(trackId).mdia.mdhd.timescale});dts+=duration;
   }
  }next=dts;
 }
 if(out.length!==file.getTrackSamplesInfo(trackId).length)throw Error('Mixed MP4 sample layouts are not supported.');
 return out;
}
export async function prepareLocalVideo(blob){
 if(blob.size>90*1024*1024)throw Error('Choose a recording under 90 MB. Nothing was uploaded.');
 const buffer=await blob.arrayBuffer(),view=new DataView(buffer);
 if(buffer.byteLength<12||String.fromCharCode(...new Uint8Array(buffer,4,4))!=='ftyp')throw Error('Local analysis currently requires an MP4 recording. Choose an MP4; nothing will be uploaded.');
 const file=createFile();let info,error;file.onReady=i=>info=i;file.onError=e=>error=e;buffer.fileStart=0;file.appendBuffer(buffer);file.flush();
 if(error||!info?.videoTracks?.length)throw Error('This MP4 could not be read.');
 const track=info.videoTracks[0],trak=file.getTrackById(track.id),edits=trak.edts?.elst?.entries||[];
 let shift=0;
 if(edits.length){if(edits.length!==1||edits[0].media_time<0||edits[0].media_rate_integer!==1||edits[0].media_rate_fraction!==0)throw Error('This MP4 uses an unsupported edited timeline. Choose an unedited recording.');shift=edits[0].media_time/track.timescale;}
 const editDuration=edits.length?edits[0].segment_duration/info.timescale:Infinity;
 if(!(editDuration>0))throw Error('This MP4 uses an unsupported edited timeline. Choose an unedited recording.');
 const samples=presentationSamples(trackSamples(file,track.id).map(s=>({time:s.cts/s.timescale,duration:s.duration/s.timescale})),{mediaStart:shift,duration:editDuration});
 if(!samples.length||samples.some((s,i)=>!Number.isFinite(s.time)||s.duration<=0||(i&&s.time<=samples[i-1].time)))throw Error('This recording has invalid frame timestamps.');
 const duration=samples.at(-1).time+samples.at(-1).duration;
 if(duration<2||duration>30)throw Error('Choose a 2–30 second MP4 for phone analysis.');
 function durationField(box,value,kind){
  const position=box.start+(kind==='track'?(box.version===1?36:28):(box.version===1?32:24));
  if(box.version===1)view.setBigUint64(position,BigInt(Math.round(value)));else view.setUint32(position,Math.round(value));
 }
 // MediaRecorder fragmented MP4s sometimes contain zero movie duration. Repair
 // only those files; normal MP4s and their edit lists remain byte-for-byte intact.
 if(!file.moov.mvhd.duration){
  let movieDuration=0;
  for(const t of file.moov.traks){
   const list=trackSamples(file,t.tkhd.track_id);const end=list.reduce((max,s)=>Math.max(max,s.cts+s.duration),0),seconds=end/t.mdia.mdhd.timescale;
   durationField(t.mdia.mdhd,end);durationField(t.tkhd,seconds*file.moov.mvhd.timescale,'track');movieDuration=Math.max(movieDuration,seconds);
  }
  durationField(file.moov.mvhd,movieDuration*file.moov.mvhd.timescale);
 }
 return {blob:new Blob([buffer],{type:'video/mp4'}),samples,duration,edited:!!edits.length};
}
export function localJob(record,referenceURL,studentURL){
 const alignmentReady=record.audioAlignment?.verified===true||record.manualSync?.verified===true;
 const pairs=pairTrial(alignmentReady?(record.analysis?.events||[]):[],record.reference.events,record.offset);
 return {id:record.id,local:true,state:'done',lesson:record.lesson,recording:record.metadata,
  referenceMarkers:record.reference,names:{reference:record.lesson.title||'Reference',student:'Your take'},
  reference:{url:referenceURL,duration:record.lesson.reference_duration,has_audio:true,frame_times:record.reference.frame_times},
  student:{url:studentURL,duration:record.duration,has_audio:true,frame_times:record.samples.map(s=>s.time),detected_landings:pairs.filter(p=>p.event).map(p=>({...p.event,beat:p.beat}))},
  result:{offset:record.offset,status:'ambiguous',method:record.manualSync?.verified?'phone_manual':record.audioAlignment?.verified?'phone_audio':'phone_unverified',message:'Analyzed on this device. Review the audio alignment before treating the timing score as final.'}};
}

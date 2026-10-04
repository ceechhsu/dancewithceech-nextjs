import {detectLocalContacts,CONTACT_VERSION} from './local-contacts.mjs';
import {seekVideoFrame} from './local-video.mjs';

// Bump when pose model, frame sampling, image sizing, or tracking changes.
export const TRACKING_VERSION=1;
export function refreshCachedAnalysis(analysis,lessonId){
 const detectorProfile=lessonId==='2step'?'two-step-xy':'marching';
 if(!analysis)return null;
 if(analysis.tracking&&analysis.tracking.version!==TRACKING_VERSION)return null;
 if(analysis.detectorVersion===CONTACT_VERSION&&(analysis.detectorProfile||'marching')===detectorProfile)return analysis;
 const tracking=analysis.tracking;
 if(tracking?.version!==TRACKING_VERSION||!Array.isArray(tracking.rows)||!tracking.rows.length)return null;
 return {...analysis,detectorVersion:CONTACT_VERSION,detectorProfile,events:detectLocalContacts(tracking.rows,{lessonId})};
}

export async function analyzeOnDevice(video,samples,{onProgress=()=>{},onScreen=()=>{},signal,lessonId}={}){
 let worker,lock,interrupted=false;
 const hidden=()=>{if(document.hidden)interrupted=true;};document.addEventListener('visibilitychange',hidden);
 const check=()=>{if(signal?.aborted)throw Error('Analysis cancelled. Your take is saved on this device.');if(interrupted)throw Error('Analysis interrupted when the screen locked or the page was hidden. Your take is saved; tap Retry to start again.');};
 const rpc=(message,transfer=[])=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Analysis timed out. Your take is saved; try again.')),120000);
  worker.onmessage=({data})=>{clearTimeout(timer);data.error?reject(Error(data.error)):resolve(data);};
  worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};worker.postMessage(message,transfer);
 });
 try{
  if(!video.requestVideoFrameCallback||!globalThis.Worker||!globalThis.OffscreenCanvas)throw Error('Local analysis needs a browser with video-frame support, such as current Chrome on your Samsung. Nothing was uploaded.');
  try{lock=await navigator.wakeLock.request('screen');onScreen('Screen will stay awake during analysis.');lock.addEventListener('release',()=>onScreen('Screen lock released. Keep the page open and extend your screen timeout if necessary.'));}
  catch{onScreen('Could not keep the screen awake. Extend your screen timeout and keep this page open.');}
  check();video.pause();
  const ratio=Math.min(1,720/Math.max(video.videoWidth,video.videoHeight)),width=Math.round(video.videoWidth*ratio),height=Math.round(video.videoHeight*ratio);
  worker=new Worker('/practice/local-pose-worker.mjs');const setupStart=performance.now();onProgress(0,'Loading the analysis model onto your device…');await rpc({type:'init',width,height});const setupMs=performance.now()-setupStart;
  const rows=[];let last=-1,inferenceMs=0;const started=performance.now();
  for(let i=0;i<samples.length;i++){
   check();const sample=samples[i];if(sample.time-last<.028)continue;
   const target=Math.min(video.duration-.0001,sample.time+Math.min(sample.duration/2,.01));
   // One frame operation owns both listeners and cleans up on all exits.
   const metadata=await seekVideoFrame(video,target,{signal});
   check();if(Math.abs(metadata.mediaTime-sample.time)>.008)throw Error(`The browser returned a different frame than requested (${i}: expected ${sample.time.toFixed(6)}s, received ${metadata.mediaTime.toFixed(6)}s). No score is reported for this recording.`);
   const bitmap=await createImageBitmap(video,{resizeWidth:width,resizeHeight:height,resizeQuality:'high'});
   const result=await rpc({type:'frame',bitmap,time:sample.time},[bitmap]);rows.push(result.row);inferenceMs+=result.inferenceMs;last=sample.time;
   onProgress(100*(i+1)/samples.length,`Analyzing on your device · ${i+1} / ${samples.length} frames`);
  }
  check();return {tracking:{version:TRACKING_VERSION,rows},detectorVersion:CONTACT_VERSION,detectorProfile:lessonId==='2step'?'two-step-xy':'marching',events:detectLocalContacts(rows,{lessonId}),frames:rows.length,analysisMs:performance.now()-started,setupMs,inferenceMs};
 }finally{document.removeEventListener('visibilitychange',hidden);worker?.terminate();try{await lock?.release();}catch{}onScreen('');}
}

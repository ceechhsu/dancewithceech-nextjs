import {CONTACT_VERSION} from './local-contacts.mjs';
import {showDebugUpload} from './debug-upload.mjs';
let waveformData=null,waveformGeneration=0,waveformViewport=null,waveformDrag=null;
import {playbackBounds as reviewBounds, sourceTimes, PlaybackIntent, frameTimecode, markerFrameLabels, markerLabelsAtTime, marchingTimingDefault} from './timeline.mjs';
import {FootReview, beatWindow} from './foot-review.mjs';
import {getLocalTake,saveLocalTake,deleteLocalTake} from './local-store.mjs';
import {localJob} from './local-video.mjs';
import {analyzeOnDevice,refreshCachedAnalysis} from './local-engine.mjs';
import {alignRecordedAudio,ALIGNMENT_VERSION} from './audio-alignment.mjs';
import {frameShift} from './sync-controls.mjs';
import {WaitingMusic} from './waiting-music.mjs';
let canAdjustSync=false,activeSyncJob=null;
const syncPermission=fetch('/practice/api/sync-permission').then(r=>r.ok?r.json():{}).then(data=>{canAdjustSync=data.can_adjust_sync===true;document.body.classList.toggle("is-owner",canAdjustSync);return canAdjustSync;}).catch(()=>false);
let localRecord=null,localAbort=null;
const $ = id => document.getElementById(id);
let waitingMuted=false;
try{waitingMuted=localStorage.getItem('dwc-waiting-music-muted')==='true';}catch{}
const waitingMusic=new WaitingMusic({muted:waitingMuted,onChange:({state,active,muted})=>{
  const control=$('waitingMusicControl'),button=$('waitingMusicToggle');
  if(!control||!button)return;
  control.hidden=!active;
  const audible=state==='playing';
  button.textContent=audible||state==='loading'?'Mute waiting music':state==='unavailable'?'Retry waiting music':'Play waiting music';
  button.dataset.audible=String(audible);button.setAttribute('aria-pressed',String(audible));
  $('waitingMusicNote').textContent=state==='blocked'?'Tap to hear the tune while we check your steps.':state==='unavailable'?'Music couldn’t load. Your analysis continues.':muted?'A quiet moment while we check your steps.':'A little music while we check your steps.';
}});
window.addEventListener('pagehide',()=>waitingMusic.dispose());
document.addEventListener('visibilitychange',()=>{if(document.hidden)waitingMusic.end({immediate:true});});
const ref = $('referenceVideo'), stu = $('studentVideo'), canvas = $('canvas'), ctx = canvas.getContext('2d');
let jobId = null, busy = false, ready = false, playing = false, buffering = false, offset = 0, estimate = 0;
let bounds = {start:0,end:1}, interval = {...bounds}, current = 0, demo = false, seekGeneration = 0;
let reviewBeatLabel = '';
const playbackIntent = new PlaybackIntent();
let savedComparison = false, manualTiming = false, footReview = null;
let lastDriftSeek=0;
let referenceFrameTimes=[],referenceBeatFrameLabels=[],studentBeatFrameLabels=[],videoFrameTimes={reference:[],student:[]};
const mediaURLs=new Map();
let mediaLoadGeneration=0;
let comparisonNames = {reference:'Reference video',student:'Student video'};
const fmt = seconds => `${Math.floor(Math.round(Math.max(0,seconds)*100)/6000).toString().padStart(2,'0')}:${((Math.round(Math.max(0,seconds)*100)%6000)/100).toFixed(2).padStart(5,'0')}`;
function status(title, message, warning=false, confidence='') {
  $('statusTitle').textContent = title; $('statusText').textContent = message;
  $('status').classList.toggle('warning', warning); $('confidence').textContent = confidence;
  $('statusIcon').textContent = warning ? '△' : '◎';
}
function setBusy(value) {
  busy = value; $('demo').disabled = value;
  ['referenceFile','studentFile'].forEach(id => $(id).disabled=value);
  $('match').disabled=value || !$('referenceFile').files.length || !$('studentFile').files.length;
  $('clear').disabled=value || !jobId;
  $('progress').hidden=!value;
}
function setReady(value) {
  ready=value;
  // Loading and errors stay visible; completed alignment details live in Advanced.
  if(value)$('advancedStatus')?.append?.($('status'));
  else $('statusHome')?.after?.($('status'));
  ['play','back','forward','seek','speed','audio','adjustments','save'].forEach(id => $(id).disabled=!value);
  $('empty').hidden=value; $('stageBadge').hidden=!value;
}
async function api(path, options={}) {
  const response=await fetch(path,options);if(response.status===401)window.showSignIn?.();
  const result=await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
async function discard(removeSaved=false) {
  pause();
  if(localRecord){await deleteLocalTake(localRecord.id);localRecord=null;}
  else if(jobId && (!savedComparison || removeSaved)) await api(`/practice/api/session/${jobId}`,{method:'DELETE'});
  footReview?.reset();
  mediaLoadGeneration++;for(const url of mediaURLs.values())URL.revokeObjectURL(url);mediaURLs.clear();
  referenceFrameTimes=[];referenceBeatFrameLabels=[];
  setReady(false); ref.removeAttribute('src'); stu.removeAttribute('src'); ref.load(); stu.load();
  $('practiceActions').hidden=true;
  $('exerciseDuration').hidden=true;
  $('audioWaveforms').hidden=true;waveformGeneration++;waveformData=null;
  jobId=null; savedComparison=false; $('savedLink').hidden=true;
  if(typeof window!=='undefined')window.history.replaceState(null,'','/practice/');
}
function upload(file, role) {
  return new Promise((resolve,reject)=>{
    const request=new XMLHttpRequest(); request.open('POST',`/practice/api/upload/${jobId}/${role}`);
    request.upload.onprogress=e=>{if(e.lengthComputable){$('progress').value=e.loaded/e.total*100; $('statusText').textContent=`Uploading ${role} video · ${Math.round(e.loaded/e.total*100)}%`;}};
    request.onload=()=>{if(request.status===401)window.showSignIn?.();let result;try{result=JSON.parse(request.responseText);}catch{reject(new Error('Upload response was unreadable.'));return;}request.status===200?resolve():reject(new Error(result.error));};
    request.onerror=()=>reject(new Error('Could not reach the server.'));
    request.send(file);
  });
}
for(const role of ['reference','student']) $(role+'File').addEventListener('change',()=>{
  const file=$(role+'File').files[0];
  if(file) {$(role+'Name').textContent=file.name;$(role+'Meta').textContent=`${(file.size/1024/1024).toFixed(1)} MB · ready to compare`;}
  setBusy(false);
});
async function begin(useDemo) {
  if(busy)return;
  if(!useDemo && ['reference','student'].some(r=>$(r+'File').files[0]?.size>90*1024*1024)) {
    status('This file is too large.','Use videos under 90 MB each.',true); return;
  }
  setBusy(true); pause(); setReady(false); $('controlError').textContent='';
  try {
    await discard(); demo=useDemo;
    status('Finding a shared clock…','Preparing the two recordings. Longer videos may take a little time.');
    $('progress').value=0;
    const session=await api(useDemo?'/practice/api/demo':'/practice/api/session',{method:'POST'}); jobId=session.id;
    if(!useDemo) {
      await upload($('referenceFile').files[0],'reference');
      await upload($('studentFile').files[0],'student');
      await api(`/practice/api/match/${jobId}`,{method:'POST'});
    } else {
      $('referenceName').textContent='Demo · reference';$('studentName').textContent='Demo · student';
      $('referenceMeta').textContent='25 seconds · music begins at 2.000s';
      $('studentMeta').textContent='28 seconds · music begins at 4.873s';
    }
    for(;;) {
      const job=await api(`/practice/api/job/${jobId}`);
      $('progress').value=job.progress; $('statusText').textContent=job.message;
      if(job.state==='error')throw new Error(job.message);
      if(job.state==='done'){await loadResult(job);break;}
      await new Promise(resolve=>setTimeout(resolve,650));
    }
  } catch(error) {status('Comparison needs attention',error.message,true);}
  finally {setBusy(false);}
}
$('match').onclick=()=>begin(false);$('demo').onclick=()=>begin(true);
async function preloadShortVideo(url){
  const response=await fetch(url);
  if(response.status===401)window.showSignIn?.();
  if(!response.ok)throw new Error('Could not load the comparison video. Sign in again if needed, then reload.');
  const size=Number(response.headers.get('Content-Length'));
  if(!size||size>32*1024*1024){await response.body?.cancel();return url;}
  const blob=await response.blob();
  return URL.createObjectURL(blob);
}
function loadVideo(video,url) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(new Error('Video loading timed out. Please try again.')),30000);
    const finish=error=>{clearTimeout(timer);video.removeEventListener('loadeddata',loaded);video.removeEventListener('error',failed);error?reject(error):resolve();};
    const loaded=()=>finish(), failed=()=>finish(new Error('This browser could not play the prepared video. Try Chrome or Safari.'));
    video.addEventListener('loadeddata',loaded,{once:true});video.addEventListener('error',failed,{once:true});video.src=url;video.load();
  });
}
async function loadResult(job) {
  activeSyncJob=job;
  await syncPermission;
  if($('ownerSyncOpen'))$('ownerSyncOpen').hidden=!canAdjustSync;
  document.querySelectorAll?.('[data-owner-sync]').forEach(el=>el.hidden=!canAdjustSync);
  const generation=++mediaLoadGeneration;
  referenceFrameTimes=[];referenceBeatFrameLabels=[];
  videoFrameTimes={reference:Array.isArray(job.reference?.frame_times)?job.reference.frame_times:[],student:Array.isArray(job.student?.frame_times)?job.student.frame_times:[]};
  studentBeatFrameLabels=markerFrameLabels(job.student?.detected_landings,videoFrameTimes.student);
  const markerRequest=job.local?Promise.resolve(job.referenceMarkers):job.lesson?.id==='marching'
    ?api('/practice/api/foot-reference/marching').catch(()=>null)
    :Promise.resolve(null);
  // Short practice clips load completely once, avoiding network stalls and new
  // range requests every time the synchronized player seeks on a phone.
  const preload=job.reference.duration<=30&&job.student.duration<=30;
  $('statusText').textContent=preload?'Loading both short videos for smooth playback…':'Loading comparison videos…';
  await Promise.all([[ref,job.reference.url],[stu,job.student.url]].map(async([video,source])=>{
    const url=job.local?source:preload?await preloadShortVideo(source):source;
    if(generation!==mediaLoadGeneration){if(url!==source)URL.revokeObjectURL(url);return;}
    const previous=mediaURLs.get(video);if(previous)URL.revokeObjectURL(previous);
    if(url!==source)mediaURLs.set(video,url);else mediaURLs.delete(video);
    await loadVideo(video,url);
  }));
  if(generation!==mediaLoadGeneration)return;
  const loadedMarkers=await markerRequest;
  const referenceMarkers=loadedMarkers?.lesson_version===job.lesson?.version?loadedMarkers:null;
  if(generation!==mediaLoadGeneration)return;
  referenceFrameTimes=Array.isArray(referenceMarkers?.frame_times)?referenceMarkers.frame_times:[];
  referenceBeatFrameLabels=markerFrameLabels(referenceMarkers?.events,referenceFrameTimes);
  const result=job.result;
  comparisonNames=job.names||{reference:$('referenceName').textContent,student:$('studentName').textContent};
  $('sourceSelection').hidden=!!job.lesson;
  $('lessonEvidence').hidden=!job.lesson;
  $('practiceActions').hidden=!job.lesson;
  $('appReturn').href=job.lesson?`/practice/#lesson=${encodeURIComponent(job.lesson.id)}`:'/practice/';
  $('appReturnLabel').textContent=job.lesson?.title||'Library';
  if(job.lesson){
    $('lessonContext').textContent=`${job.lesson.title||'Lesson'} · ${comparisonNames.student}`;
    $('timingEvidence').textContent=job.timing_check?.message||'Check the captured music. Recording controls alone do not prove synchronization.';
    $('practiceActions').hidden=false;
    $('originalTake').hidden=false;
    $('originalTake').textContent='Download my recording ↓';
    $('originalTake').href=stu.src;
    $('originalTake').download=`${job.lesson.id}-take-${job.id||jobId}.mp4`;
    $('chooseAnother').href=`/practice/#lesson=${encodeURIComponent(job.lesson.id)}`;
    $('recordAgain').href=`/practice/#lesson=${encodeURIComponent(job.lesson.id)}&action=record`;
    if(/^[a-f0-9]{32}$/.test(localRecord?.challenge?.id||'')){
      $('appReturn').href='/practice/challenge.html?id='+localRecord.challenge.id;$('appReturnLabel').textContent='Challenge';
      $('recordAgain').href=`/practice/?challenge=${localRecord.challenge.id}#lesson=${encodeURIComponent(job.lesson.id)}&action=record`;
    }


  }
  manualTiming=result.status!=='confident';
  offset=estimate=Number.isFinite(result.offset)?result.offset:0;
  const calibratedOffset=job.local?null:marchingTimingDefault(job);
  if(calibratedOffset!==null){offset=calibratedOffset;manualTiming=true;}
  bounds=reviewBounds(ref.duration,stu.duration,offset);
  if(!bounds) {offset=0;bounds=reviewBounds(ref.duration,stu.duration,0);}
  interval={...bounds};
  reviewBeatLabel='';
  if(result.status==='confident' && result.suggested_end-result.suggested_start>=.1) interval={start:Math.max(bounds.start,result.suggested_start),end:Math.min(bounds.end,result.suggested_end)};
  current=interval.start; $('offset').value=offset.toFixed(4);updateStudentTiming(); resetPosition(); updateWindow(); setReady(true);
  const strong=result.status==='confident';
  const labels={confident:'Audio aligned · ready to review',ambiguous:'Multiple possible alignments',unmatched:'Manual timing needed',silent:'Audio is too quiet',missing_audio:'Audio track missing',insufficient:'More shared audio needed'};
  if(!job.local)openOwnerSync(job);
  const measurement=result.exercise_duration;
  $('exerciseDuration').hidden=!job.lesson;
  const describeDuration=part=>Number.isFinite(part?.elapsed)
    ? `${part.reliable?'':'Estimate: '}${part.elapsed.toFixed(4)} s (${part.start.toFixed(4)} → ${part.end.toFixed(4)} s in video)`
    : `Unavailable — ${part?.reason||'Record a new comparison to measure the audio endpoints.'}`;
  $('referenceElapsed').textContent=describeDuration(measurement?.reference);
  $('studentElapsed').textContent=describeDuration(measurement?.student);
  $('elapsedDifference').textContent=Number.isFinite(measurement?.difference_ms)
    ? `${measurement.reliable?'':'Estimate: '}${measurement.difference_ms>0?'+':''}${measurement.difference_ms.toFixed(1)} ms`
    : 'Unavailable';
  $('exerciseDurationStatus').textContent=measurement?.reliable
    ? 'Both audio endpoints matched. These are measured estimates, not exact timings.'
    : 'Endpoint timing is not confirmed. Any numbers below are provisional estimates.';
  const validation=result.audio_validation;
  if(validation){
    status(validation.verified?'Audio alignment verified':'Couldn’t verify audio alignment',validation.reason,!validation.verified,validation.verified?'AUDIO VERIFIED':'');
    $('stageBadge').textContent=validation.verified?'AUDIO VERIFIED':'';
    $('stageBadge').hidden=!validation.verified;
  }else{
    status(result.method==='spoken_count_in_v1'?'Spoken count-in aligned · review timing':labels[result.status]||'Review the timing',result.message+(demo?' Demo: the student moves 0.24s late on purpose.':''),!strong,strong?`STRONG MATCH · ${result.evidence_seconds.toFixed(1)}s evidence`:'UNCONFIRMED TIMING');
    $('stageBadge').textContent=strong?'AUDIO ALIGNED':'MANUAL REVIEW · CHECK TIMING';
  }
  $('audio').value=job.reference.has_audio?'reference':job.student.has_audio?'student':'none';setAudio();
  if(calibratedOffset!==null){
    status(`Marching timing preset · ${Math.round(calibratedOffset*1000)} ms`,'Using your provisional timing setting for this capture setup. Check the waveforms; manual adjustment remains available.',false,'MANUAL TIMING PRESET');
    $('stageBadge').textContent='';$('stageBadge').hidden=true;
  }
  await seek(current);
  if(!footReview)footReview=new FootReview({getOffset:()=>offset,seekBeat:async(time,label)=>{
    const window=beatWindow(time,bounds);if(!window){$('controlError').textContent='This contact falls outside the shared video window.';return;}
    interval=window;reviewBeatLabel=label||'Reviewing one beat';updateWindow();await seek(window.start);$('comparison').scrollIntoView?.({block:'start',behavior:'smooth'});
  }});
  await footReview.load(job,referenceMarkers);
}
function updateWindow() {
  $('start').value=interval.start.toFixed(4);$('end').value=interval.end.toFixed(4);
  $('seek').min=interval.start;$('seek').max=interval.end;$('seek').value=current;
  $('duration').textContent=fmt(interval.end-interval.start);
  $('windowLabel').textContent=`Reference ${interval.start.toFixed(4)}–${interval.end.toFixed(4)}s`;
  const shortened=Math.abs(interval.start-bounds.start)>.001||Math.abs(interval.end-bounds.end)>.001;
  $('reviewContext').hidden=!shortened;
  $('fullComparison').hidden=!shortened;
  $('reviewContextLabel').textContent=reviewBeatLabel||'Reviewing a short section';
}
function showFullComparison(){
  reviewBeatLabel='';
  for(const button of $('scoreBeats').querySelectorAll?.('button[aria-pressed="true"]')||[])button.setAttribute('aria-pressed','false');
  $('scoreSelected').textContent='Select a beat to review a landing.';
  $('footSelection').textContent='Choose a beat to pause both videos near that moment.';
  interval={...bounds};updateWindow();seek(interval.start);$('controlError').textContent='';
}
function pause() {playbackIntent.cancel();playing=false;buffering=false;ref.pause();stu.pause();$('play').textContent='▶ Play';}
function seekVideo(video,time) {
  if(Math.abs(video.currentTime-time)<.002 && !video.seeking)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{video.removeEventListener('seeked',done);reject(new Error('Seeking took too long. Try again.'));},8000);
    const done=()=>{clearTimeout(timer);video.removeEventListener('seeked',done);resolve();};
    video.addEventListener('seeked',done);video.currentTime=time;
  });
}
async function seek(time) {
  pause(); const generation=++seekGeneration;
  const times=sourceTimes(time,interval,offset);current=times.reference;
  $('seek').value=current;
  try {await Promise.all([seekVideo(ref,Math.min(ref.duration,times.reference)),seekVideo(stu,Math.min(stu.duration,times.student))]);}
  catch(error){if(generation===seekGeneration)$('controlError').textContent=error.message;}
}
async function play() {
  if(!ready)return;
  if(playing){pause();return;}
  const pendingSeek=seek(current>=interval.end-.04?interval.start:current);
  const request=playbackIntent.begin();
  await pendingSeek;
  if(!playbackIntent.isCurrent(request)||!ready||document.hidden)return;
  try {
    playing=true;ref.playbackRate=stu.playbackRate=Number($('speed').value);
    await Promise.all([stu,ref].filter(video=>video.currentTime<video.duration).map(video=>video.play()));
    if(playbackIntent.isCurrent(request))$('play').textContent='Ⅱ Pause';
  } catch {
    if(playbackIntent.isCurrent(request)){pause();$('controlError').textContent='Playback was interrupted. Press Play to try again.';}
  }
}
$('play').onclick=play;
$('seek').oninput=()=>seek(Number($('seek').value));
$('back').onclick=()=>seek(current-1/30);$('forward').onclick=()=>seek(current+1/30);
$('speed').onchange=()=>{ref.playbackRate=stu.playbackRate=Number($('speed').value);};
function setAudio(){if(!canAdjustSync)$('audio').value='reference';const both=canAdjustSync&&$('audio').value==='both';ref.muted=!both&&$('audio').value!=='reference';stu.muted=!both&&$('audio').value!=='student';ref.volume=stu.volume=both?.5:1;}
$('audio').onchange=setAudio;
for(const video of [ref,stu]) {
  video.addEventListener('waiting',()=>{if(playing){buffering=true;ref.pause();stu.pause();$('play').textContent='Buffering…';}});
  video.addEventListener('ended',()=>{if(playing&&ref.ended&&stu.ended){pause();current=interval.end;}});
}
function resetPosition(){for(const [id,value] of Object.entries({opacity:50,scale:100,x:0,y:0})){$(id).value=value;$(id+'Value').textContent=value+'%';}$('mirrorReference').checked=$('mirrorStudent').checked=false;}
$('resetPosition').onclick=resetPosition;
for(const id of ['opacity','scale','x','y'])$(id).oninput=()=>$(id+'Value').textContent=$(id).value+'%';
$('applyWindow').onclick=()=>{
  const start=Number($('start').value),end=Number($('end').value);
  if(!Number.isFinite(start+end)||start<bounds.start-.001||end>bounds.end+.001||end-start<.1){$('controlError').textContent=`Choose at least 0.10s within reference ${bounds.start.toFixed(4)}–${bounds.end.toFixed(4)}s.`;return;}
  $('controlError').textContent='';reviewBeatLabel='';interval={start:Math.max(start,bounds.start),end:Math.min(end,bounds.end)};updateWindow();seek(interval.start);
};
$('fullWindow').onclick=showFullComparison;
$('fullComparison').onclick=showFullComparison;
function updateStudentTiming(){
  const delta=Math.round((offset-estimate)*1000);
  $('studentTiming').min=Math.min(-1000,delta);
  $('studentTiming').max=Math.max(1000,delta);
  $('studentTiming').value=delta;
  drawWaveforms();
  $('studentTimingValue').textContent=Math.abs(offset)<.00005?'No alignment applied · Offset: 0 ms':delta===0?'Audio estimate · no adjustment':`${Math.abs(delta)} ms ${delta>0?'earlier':'later'} than audio estimate`;
  $('waveformTiming').min=Math.min(-1000,delta);$('waveformTiming').max=Math.max(1000,delta);$('waveformTiming').value=delta;
  $('waveformTimingValue').textContent=$('studentTimingValue').textContent;
}
$('studentTiming').oninput=()=>applyOffset(estimate+Number($('studentTiming').value)/1000);
$('studentEarlier').onclick=()=>applyOffset(offset+.01);
$('studentLater').onclick=()=>applyOffset(offset-.01);
function applyOffset(value,restored=false){
  if(!canAdjustSync)return;
  const next=reviewBounds(ref.duration,stu.duration,value);
  if(!Number.isFinite(value)||!next){$('controlError').textContent='That offset leaves no shared video. Try a smaller offset.';return;}
  const position=current;
  const wasFull=Math.abs(interval.start-bounds.start)<.001&&Math.abs(interval.end-bounds.end)<.001;
  offset=value;bounds=next;
  const clipped={start:Math.max(interval.start,bounds.start),end:Math.min(interval.end,bounds.end)};
  interval=!wasFull&&clipped.end-clipped.start>=.1?clipped:{...bounds};
  $('offset').value=value.toFixed(4);updateStudentTiming();$('controlError').textContent='';updateWindow();seek(Math.max(interval.start,Math.min(interval.end,position)));
  manualTiming=true;
  if(localRecord&&footReview)footReview.job=localJob({...localRecord,offset,audioAlignment:{verified:true}},ref.src,stu.src);
  footReview?.refresh();
  status(restored?'Audio estimate restored':'Manual timing applied',`Student time = reference time ${offset<0?'−':'+'} ${Math.abs(offset).toFixed(4)}s. Review the music and set your preferred window.`,true,'CHECK TIMING');
  $('stageBadge').textContent='MANUAL REVIEW · CHECK TIMING';
}
$('applyOffset').onclick=()=>applyOffset(Number($('offset').value));$('restoreMatch').onclick=()=>applyOffset(estimate,true);
$('clear').onclick=async()=>{if(busy)return;if(localRecord&&!window.confirm('Delete this comparison from this browser? Download your recording first if you want to keep it.'))return;try{await discard(true);setBusy(false);status('Local comparison cleared.','Choose another pair whenever you’re ready.');}catch(error){status('Could not clear comparison',error.message,true);}};
function currentSettings() {
  const settings={offset,start:interval.start,end:interval.end,manual:manualTiming,
    referenceName:comparisonNames.reference,studentName:comparisonNames.student};
  for(const id of ['opacity','scale','x','y','speed'])settings[id]=Number($(id).value);
  for(const id of ['mirrorReference','mirrorStudent'])settings[id]=$(id).checked;
  for(const id of ['audio','view'])settings[id]=$(id).value;
  return settings;
}
function showSavedLink(url) {
  $('savedLink').href=url;$('savedLink').hidden=false;
  $('saveNotice').textContent='Saved. This link restores both videos and these settings. Save again after adjustments. Clear comparison deletes the saved copy.';
}
$('save').onclick=async()=>{
  if(!ready||busy)return;
  pause();setBusy(true);$('save').disabled=true;
  const savingJobId=jobId;
  try {
    if(localRecord){
     if(canAdjustSync&&manualTiming){
      localRecord.manualSync=await api('/practice/api/manual-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',comparison:localRecord.id,offset})});
     }
     localRecord.settings=currentSettings();localRecord.offset=offset;await saveLocalTake(localRecord);$('saveNotice').textContent='Saved on this device. Your manual sync takes priority over automatic alignment.';if($('ownerSyncNotice'))$('ownerSyncNotice').textContent=$('saveNotice').textContent;return;
    }
    const result=await api(`/practice/api/comparison/${savingJobId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(currentSettings())});
    if(jobId!==savingJobId)return;
    savedComparison=true;showSavedLink(result.url);window.history.replaceState(null,'',result.url);
  }catch(error){$('saveNotice').textContent=error.message;}
  finally{setBusy(false);$('save').disabled=!ready;}
};
async function restoreComparison(key) {
  setBusy(true);setReady(false);status('Opening saved comparison…','Loading both saved videos and their saved review settings.');
  try {
    if(!/^[a-f0-9]{32}$/.test(key))throw new Error('This comparison link is invalid.');
    const saved=await api(`/practice/api/comparison/${key}`);
    if(saved.version!==1)throw new Error('This saved comparison uses an unsupported format.');
    jobId=key;savedComparison=true;demo=false;
    await loadResult(saved.job);
    const settings=saved.settings;
    offset=settings.offset;bounds=reviewBounds(ref.duration,stu.duration,offset);
    if(!bounds||settings.start<bounds.start-.001||settings.end>bounds.end+.001||settings.end-settings.start<.1)throw new Error('Saved timing falls outside the available videos.');
    interval={start:settings.start,end:settings.end};current=interval.start;
    manualTiming=settings.manual||saved.job.result.status!=='confident';
    $('offset').value=offset.toFixed(4);updateStudentTiming();
    for(const id of ['opacity','scale','x','y']){$(id).value=settings[id];$(id+'Value').textContent=settings[id]+'%';}
    for(const id of ['mirrorReference','mirrorStudent'])$(id).checked=settings[id];
    for(const id of ['speed','audio','view'])$(id).value=settings[id];
    ref.playbackRate=stu.playbackRate=settings.speed;setAudio();
    for(const role of ['reference','student']){$(role+'Name').textContent=settings[role+'Name'];$(role+'Meta').textContent='Saved video · ready to review';}
    comparisonNames={reference:settings.referenceName,student:settings.studentName};
    updateWindow();await seek(interval.start);footReview?.refresh();
    showSavedLink(`/practice/?comparison=${key}#comparison`);
    if(manualTiming){
      status('Saved comparison · manual timing',`Both videos restored. Student time = reference time ${offset<0?'−':'+'} ${Math.abs(offset).toFixed(4)}s. This saved correction was not automatically confirmed.`,true,'MANUAL TIMING');
      $('stageBadge').textContent='MANUAL REVIEW · CHECK TIMING';
    }
  }catch(error){pause();setReady(false);status('Could not reopen comparison',error.message,true);}
  finally{setBusy(false);}
}
function drawVideo(video, area, ghost=false) {
  if(video.readyState<2||!video.videoWidth||!video.videoHeight)return null;
  const adjust=ghost&&$('view').value!=='side';
  const scale=adjust?Number($('scale').value)/100:1;
  const ratio=Math.min(area.w/video.videoWidth,area.h/video.videoHeight)*scale;
  const w=video.videoWidth*ratio,h=video.videoHeight*ratio;
  const x=area.x+area.w/2+(adjust?Number($('x').value)/100*area.w:0);
  const y=area.h/2+(adjust?Number($('y').value)/100*area.h:0);
  ctx.save();ctx.beginPath();ctx.rect(area.x,0,area.w,area.h);ctx.clip();ctx.translate(x,y);
  if($(ghost?'mirrorReference':'mirrorStudent').checked)ctx.scale(-1,1);
  ctx.drawImage(video,-w/2,-h/2,w,h);ctx.restore();
  return {left:x-w/2,top:y-h/2,width:w,height:h};
}
function drawReferenceBeatLabels(videoRect,area,time){
  const labels=markerLabelsAtTime(time,referenceBeatFrameLabels,referenceFrameTimes);
  drawBeatLabels(videoRect,area,labels);
}
function drawBeatLabels(videoRect,area,labels,student=false){
  if(!canAdjustSync||$('showBeatLabels')?.checked===false)return;
  if(!videoRect||!labels.length)return;
  const text=labels.join(' · ');
  ctx.save();ctx.font='600 16px sans-serif';ctx.textBaseline='top';
  const textWidth=ctx.measureText(text).width;
  const x=Math.max(area.x+8,Math.min(videoRect.left+10,area.x+area.w-textWidth-24));
  const y=Math.max(8,videoRect.top+10)+(student&&$('view').value!=='side'?36:0);
  ctx.fillStyle='rgba(11,16,14,.9)';ctx.fillRect(x,y,textWidth+16,30);
  ctx.fillStyle=student?'#c5b9ed':'#f2f0e7';ctx.fillText(text,x+8,y+6);ctx.restore();
}
function correctDrift(target){
  if(ref.seeking||stu.seeking||stu.ended||target>=ref.duration)return;
  const base=Number($('speed').value),drift=target-ref.currentTime;
  const now=Date.now();
  if(Math.abs(drift)>.25&&now-lastDriftSeek>750){
    lastDriftSeek=now;ref.playbackRate=base;ref.currentTime=Math.max(0,target);
  }else{
    ref.playbackRate=base*(Math.abs(drift)>.03?1+Math.max(-.04,Math.min(.04,drift*.4)):1);
  }
}
function tick() {
  updateSyncPlayhead();
  if(ready){
    if(playing && buffering && !ref.seeking && !stu.seeking && ref.readyState>=3 && stu.readyState>=3){
      buffering=false;
      const request=playbackIntent.begin();
      Promise.all([ref,stu].filter(video=>video.currentTime<video.duration).map(video=>video.play())).then(()=>{if(playbackIntent.isCurrent(request))$('play').textContent='Ⅱ Pause';}).catch(()=>{if(playbackIntent.isCurrent(request))pause();});
    }
    if(playing&&!buffering){
      current=stu.ended?Math.max(stu.currentTime-offset,ref.currentTime):stu.currentTime-offset;
      if(current>=interval.end-.015){pause();seek(interval.end);}
      else correctDrift(current);
    }
    // Keep the last complete pair visible while either decoder seeks.
    // Clearing first would flash the background when drawVideo has no frame.
    if(ref.seeking||stu.seeking||ref.readyState<2||stu.readyState<2){
      requestAnimationFrame(tick);return;
    }
    footReview?.updatePlayback(ref.currentTime,true);
    ctx.globalAlpha=1;ctx.fillStyle='#0b100e';ctx.fillRect(0,0,canvas.width,canvas.height);
    let referenceRect,referenceArea,studentRect,studentArea;
    if($('view').value==='side'){
      referenceArea={x:0,w:480,h:720};referenceRect=drawVideo(ref,referenceArea,true);studentArea={x:480,w:480,h:720};studentRect=drawVideo(stu,studentArea);
      // Frame each contained video without covering the dancer with repeated labels.
      for(const [rect,color] of [[referenceRect,'#bce7b1'],[studentRect,'#c5b9ed']]){
        if(!rect)continue;
        ctx.fillStyle=color;
        const {left:x,top:y,width:w,height:h}=rect,t=3;
        ctx.fillRect(x,y,w,t);ctx.fillRect(x,y+h-t,w,t);
        ctx.fillRect(x,y,t,h);ctx.fillRect(x+w-t,y,t,h);
      }
    }else{studentArea={x:0,w:960,h:720};studentRect=drawVideo(stu,studentArea);ctx.globalAlpha=Number($('opacity').value)/100;referenceArea={x:0,w:960,h:720};referenceRect=drawVideo(ref,referenceArea,true);ctx.globalAlpha=1;}
    drawReferenceBeatLabels(referenceRect,referenceArea,ref.currentTime);
    drawBeatLabels(studentRect,studentArea,markerLabelsAtTime(stu.currentTime,studentBeatFrameLabels,videoFrameTimes.student),true);
    $('time').textContent=fmt(current-interval.start);$('seek').value=current;
    const referenceTime=frameTimecode(ref.currentTime,videoFrameTimes.reference)||`${ref.currentTime.toFixed(4)}s`;
    const studentTime=frameTimecode(stu.currentTime,videoFrameTimes.student)||`${stu.currentTime.toFixed(4)}s`;
    $('clockReadout').textContent=`Reference ${referenceTime} · Your take ${studentTime} · Offset ${offset>=0?'+':''}${offset.toFixed(4)}s`;
  }else{footReview?.updatePlayback(ref.currentTime,false);ctx.clearRect(0,0,canvas.width,canvas.height);}
  requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
requestAnimationFrame(tick);
if(typeof window!=='undefined'){
  const savedKey=new URLSearchParams(window.location.search).get('comparison');
  const localKey=new URLSearchParams(window.location.search).get('local');
  if(localKey)openLocalComparison(localKey);
  else if(savedKey)restoreComparison(savedKey);
  else{const key=new URLSearchParams(window.location.search).get('job');if(key)openLessonJob(key);}
}



async function openLessonJob(key){
  setBusy(true);setReady(false);
  try{
    if(!/^[a-f0-9]{32}$/.test(key))throw new Error('This comparison link is invalid.');
    const job=await api(`/practice/api/job/${key}`);
    if(job.state!=='done')throw new Error(job.message||'The comparison is not ready. Return to your take and submit again.');
    jobId=key;demo=false;
    await loadResult(job);
    $('referenceName').textContent=comparisonNames.reference;$('studentName').textContent=comparisonNames.student;
    document.getElementById('comparison')?.scrollIntoView?.({block:'start'});
  }catch(error){status('Comparison needs attention',error.message,true);}
  finally{setBusy(false);}
}



function waveformEnvelope(samples,sampleRate){
  const hop=Math.max(1,Math.round(sampleRate/1000));const lo=[],hi=[];let peak=0;
  for(let start=0;start<samples.length;start+=hop){let a=0,b=0;for(let k=start;k<Math.min(samples.length,start+hop);k++){a=Math.min(a,samples[k]);b=Math.max(b,samples[k]);}lo.push(a);hi.push(b);peak=Math.max(peak,-a,b);}
  return {lo,hi,hop,sampleRate,peak:peak||1,duration:samples.length/sampleRate};
}
async function loadWaveforms(job){
  await syncPermission;if(!canAdjustSync)return;
  const generation=++waveformGeneration;waveformData=null;$('audioWaveforms').hidden=false;
  const report=message=>{if(generation===waveformGeneration){$('waveformStatus').textContent=message;$('waveformAlignmentValue').textContent=message;}};
  let retry=$('waveformRetry');
  if(!retry){retry=document.createElement('button');retry.id='waveformRetry';retry.type='button';retry.textContent='Retry audio waveforms';$('waveformStatus').after(retry);}
  retry.hidden=true;retry.onclick=()=>loadWaveforms(job);
  report('Loading recorded audio…');
  for(const id of ['waveformBeforeCanvas','waveformCanvas']){const canvas=$(id);canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);}
  if(!job.reference.has_audio||!job.student.has_audio){report('Both recordings need audio to show waveforms.');return;}
  let decoder;
  const controller=new AbortController();
  async function bounded(task,label){
    let timer;
    try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error(label+' timed out. Tap Retry audio waveforms.'));},20000);})]);}
    finally{clearTimeout(timer);}
  }
  try{
    decoder=new (window.AudioContext||window.webkitAudioContext)();
    const envelopes=[];
    for(const [index,media] of [job.reference,job.student].entries()){
      const name=index?'Your take':'Reference';report('Reading '+name+' audio…');
      const localBlob=job.local&&(index?localRecord?.studentBlob:localRecord?.referenceBlob);
      const bytes=await bounded(localBlob?localBlob.arrayBuffer():(async()=>{const response=await fetch(media.url,{signal:controller.signal});if(!response.ok)throw new Error(name+' audio could not be loaded.');return response.arrayBuffer();})(),'Reading '+name+' audio');
      report('Decoding '+name+' audio…');
      const buffer=await bounded(decoder.decodeAudioData(bytes),'Decoding '+name+' audio');
      // Use channel one consistently; no audio is played or replaced.
      envelopes.push(waveformEnvelope(buffer.getChannelData(0),buffer.sampleRate));
    }
    if(generation!==waveformGeneration)return;
    waveformData={envelopes,start:job.lesson?.reference_audio_offset??job.result.exercise_duration?.reference?.start??job.result.count_in_evidence?.reference?.offset??0};
    $('waveformStatus').textContent='Green: reference · Purple: your take · White line: shared playback position.';
    drawWaveforms();
  }catch(error){if(generation===waveformGeneration){report('Could not display waveforms. '+error.message);retry.hidden=false;}}
  finally{controller.abort();if(decoder)decoder.close().catch(()=>{});}
}
function drawWaveforms(){
  if(!waveformData)return;
  const [reference,student]=waveformData.envelopes;
  // Hold the axis steady while the student timing slider moves within ±1 second of the estimate.
  const first=Math.min(0,-estimate-1),last=Math.max(reference.duration,student.duration,student.duration-estimate+1);
  let start=first,end=last;
  if($('waveformView').value==='count'){start=Math.max(first,waveformData.start-.1);end=Math.min(last,start+2.6);}
  if($('waveformView').value==='middle'){const mid=reference.duration/2;start=Math.max(first,mid-1.3);end=Math.min(last,mid+1.3);}
  if($('waveformView').value==='end'){const finish=Math.max(reference.duration,student.duration,student.duration-estimate);start=Math.max(first,finish-2.5);end=Math.min(last,finish+.1);}
  if(end<=start)return;
  waveformViewport={start,end};
  function draw(canvas,shift){
    const ctx=canvas.getContext('2d');ctx.fillStyle='#101b16';ctx.fillRect(0,0,canvas.width,canvas.height);
    const left=100,width=canvas.width-120;
    ctx.font='14px sans-serif';
    for(let k=0;k<=8;k++){const time=start+(end-start)*k/8,x=left+width*k/8;ctx.strokeStyle='#33473d';ctx.beginPath();ctx.moveTo(x,15);ctx.lineTo(x,240);ctx.stroke();ctx.fillStyle='#c5d7cc';ctx.fillText(time.toFixed(4)+'s',x-20,265);}
    waveformData.envelopes.forEach((data,index)=>{
      const overlay=canvas.id==='waveformCanvas'&&$('waveformOverlay')?.checked;
      const base=overlay?125:index?185:70;ctx.strokeStyle=index?'#c5b9ed':'#bce7b1';ctx.fillStyle=ctx.strokeStyle;ctx.fillText(index?'Your take':'Reference',5,overlay?(index?155:95):base);ctx.beginPath();
      for(let k=0;k<data.lo.length;k++){const time=k*data.hop/data.sampleRate-(index?shift:0);if(time<start||time>end)continue;const x=left+(time-start)/(end-start)*width;ctx.moveTo(x,base-data.lo[k]/data.peak*48);ctx.lineTo(x,base-data.hi[k]/data.peak*48);}ctx.stroke();
    });
  }
  draw($('waveformBeforeCanvas'),0);
  draw($('waveformCanvas'),offset);
  updateSyncPlayhead();
  const movement=Math.abs(offset*1000).toFixed(1);
  const source=Math.abs(offset-estimate)<.00005?'audio estimate':'manual timing';
  $('waveformAlignmentValue').textContent=Math.abs(offset)<.00005
    ? 'No shift applied · offset 0.0000 s'
    : `Your take moved ${movement} ms ${offset>0?'earlier':'later'} · offset ${offset>=0?'+':''}${offset.toFixed(4)} s · ${source}`;
}
$('waveformView').onchange=drawWaveforms;

$('waveformTiming').oninput=()=>{if(ready&&!busy)applyOffset(estimate+Number($('waveformTiming').value)/1000);};
$('waveformEarlier').onclick=()=>{if(ready&&!busy)applyOffset(offset+.001);};
$('waveformLater').onclick=()=>{if(ready&&!busy)applyOffset(offset-.001);};
$('waveformReset').onclick=()=>{if(ready&&!busy)applyOffset(estimate,true);};
$('waveformCanvas').onpointerdown=event=>{
  if(!canAdjustSync||!ready||busy||!waveformData||!waveformViewport)return;
  const rect=$('waveformCanvas').getBoundingClientRect();
  const y=(event.clientY-rect.top)/rect.height*280;
  pause();waveformDrag={pointer:event.pointerId,x:event.clientX,offset,moved:false,allowShift:y>=130&&y<=240||$('waveformOverlay')?.checked,secondsPerPixel:(waveformViewport.end-waveformViewport.start)/(rect.width*1080/1200)};
  $('waveformCanvas').setPointerCapture(event.pointerId);event.preventDefault();
};
$('waveformCanvas').onpointermove=event=>{
  if(!waveformDrag||event.pointerId!==waveformDrag.pointer||!ready||busy)return;
  if(!waveformDrag.allowShift||Math.abs(event.clientX-waveformDrag.x)<4)return;
  waveformDrag.moved=true;
  const value=waveformDrag.offset-(event.clientX-waveformDrag.x)*waveformDrag.secondsPerPixel;
  applyOffset(Math.round(value*1000)/1000);
};
$('waveformCanvas').onpointerup=event=>{
 if(waveformDrag&&!waveformDrag.moved&&waveformViewport){
  const rect=$('waveformCanvas').getBoundingClientRect(),fraction=((event.clientX-rect.left)/rect.width*1200-100)/1080;
  const target=waveformViewport.start+Math.max(0,Math.min(1,fraction))*(waveformViewport.end-waveformViewport.start);
  seek(Math.max(interval.start,Math.min(interval.end,target)));
 }
 waveformDrag=null;
};
for(const name of ['onpointercancel','onlostpointercapture'])$('waveformCanvas')[name]=()=>{waveformDrag=null;};

function applyTimingTest(milliseconds=27){
  applyOffset(estimate+milliseconds/1000);
  status(`Test option ${milliseconds===110?2:1} · ${milliseconds} ms earlier`,`A fixed ${milliseconds} ms test correction has been applied to the audio estimate. This is not automatic verification. Compare the count-in and ending waveforms.`,true,'TEST CORRECTION');
}

async function openLocalComparison(key){
 if(busy)return;
 setBusy(true);setReady(false);$('sourceSelection').hidden=true;$('timingResult').hidden=true;
 let tools=$('localProgress');
 if(!tools){tools=document.createElement('div');tools.id='localProgress';tools.className='local-progress';tools.innerHTML='<div id="waitingMusicControl" class="waiting-music-control" hidden><span id="waitingMusicNote">A little music while we check your steps.</span><button id="waitingMusicToggle" type="button" aria-pressed="false">Play waiting music</button></div><p>Your recording stays on this device. Browser storage can be cleared; download a copy to keep it.</p><p id="localScreen" role="status"></p><button id="localRetry" hidden>Retry analysis</button><button id="localCancel">Cancel analysis</button>';$('status').after(tools);
  $('waitingMusicToggle').onclick=()=>{
   const mute=$('waitingMusicToggle').dataset.audible==='true'||$('waitingMusicToggle').textContent==='Mute waiting music';
   try{localStorage.setItem('dwc-waiting-music-muted',String(mute));}catch{}
   void waitingMusic.setMuted(mute);
  };
 }
 tools.hidden=false;$('localRetry').hidden=true;$('localRetry').textContent='Retry analysis';$('localCancel').hidden=false;
 localAbort=new AbortController();$('localCancel').onclick=()=>{localAbort.abort();waitingMusic.end();};$('localRetry').onclick=()=>openLocalComparison(key);
 status('Preparing your comparison…','Opening the recording saved on this device.');
 try{
  localRecord=await getLocalTake(key);if(!localRecord)throw Error('This comparison is not stored in this browser. Return to the library and record or choose your video on this device.');
  await syncPermission;showDebugUpload(localRecord,canAdjustSync);
  if(localAbort.signal.aborted)throw Error('Analysis cancelled. Your recording is kept; tap Retry to analyze it again.');
  if(!localRecord.analysis)void waitingMusic.begin();
  jobId=key;demo=false;
  for(const url of mediaURLs.values())URL.revokeObjectURL(url);mediaURLs.clear();
  const referenceURL=URL.createObjectURL(localRecord.referenceBlob),studentURL=URL.createObjectURL(localRecord.studentBlob);
  mediaURLs.set(ref,referenceURL);mediaURLs.set(stu,studentURL);
  await Promise.all([loadVideo(ref,referenceURL),loadVideo(stu,studentURL)]);
  if(localAbort.signal.aborted)throw Error('Analysis cancelled. Your recording is kept; tap Retry to analyze it again.');
  if(localRecord.manualSync&&canAdjustSync){
   const checked=await api('/practice/api/manual-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',comparison:localRecord.id,offset:localRecord.manualSync.offset,signature:localRecord.manualSync.signature})});
   localRecord.manualSync.verified=checked.verified===true;
   if(checked.verified)localRecord.offset=localRecord.manualSync.offset;
  }
  if(!localRecord.manualSync?.verified&&(!localRecord.audioAlignment?.verified||localRecord.audioAlignment?.version!==ALIGNMENT_VERSION)){
   status('Synchronizing your videos…','Matching the count-in, music, and ending on this device.');
   try{localRecord.audioAlignment=await alignRecordedAudio(localRecord.referenceBlob,localRecord.studentBlob,localRecord.lesson.reference_audio_offset,{audioDuration:localRecord.lesson.audio_duration,signal:localAbort.signal});}
   catch(error){if(localAbort.signal.aborted)throw error;localRecord.audioAlignment={version:ALIGNMENT_VERSION,verified:false,reason:error.message};}
   if(localAbort.signal.aborted)throw Error('Analysis cancelled. Your recording is kept; tap Retry to analyze it again.');
   if(localRecord.audioAlignment.verified){
    localRecord.previousOffset=localRecord.offset;localRecord.offset=localRecord.audioAlignment.offset;
    if(localRecord.settings){localRecord.settings.offset=localRecord.offset;delete localRecord.settings.start;delete localRecord.settings.end;}
   }
   await saveLocalTake(localRecord);
  }
  // Never analyze or present a synchronized comparison using an unverified fallback.
  // Failed matches remain retryable, including records saved by older app versions.
  if(!localRecord.manualSync?.verified&&!localRecord.audioAlignment?.verified){
   status('Could not align the audio',`${localRecord.audioAlignment?.reason||'The music did not match confidently.'} Comparison is paused until the audio is aligned. Tap Retry audio alignment to try again. Your recording is still saved on this device.`,true);
   $('localRetry').textContent='Retry audio alignment';$('localRetry').hidden=false;
   $('localCancel').hidden=true;
   return;
  }
  const previousAnalysis=localRecord.analysis;
  localRecord.analysis=refreshCachedAnalysis(previousAnalysis);
  const reusedAnalysis=!!localRecord.analysis;
  if(localRecord.analysis&&localRecord.analysis!==previousAnalysis)await saveLocalTake(localRecord);
  if(!localRecord.analysis){
   if(localAbort.signal.aborted)throw Error('Analysis cancelled. Your recording is kept; tap Retry to analyze it again.');
   // A stale cache skipped music on entry but now requires full inference.
   if(previousAnalysis)void waitingMusic.begin();
   status('Checking your steps…','Analysis runs on this device. Keep this page open.');
   localRecord.analysis=await analyzeOnDevice(stu,localRecord.samples,{signal:localAbort.signal,onScreen:message=>$('localScreen').textContent=message,onProgress:(value,message)=>{$('progress').value=value;$('statusText').textContent=message;}});
   if(localAbort.signal.aborted)throw Error('Analysis cancelled. Your recording is kept; tap Retry to analyze it again.');
   await saveLocalTake(localRecord);
  }
  waitingMusic.end();
  // loadResult must not revoke the same object URLs it is about to use.
  mediaURLs.clear();
  await loadResult(localJob(localRecord,referenceURL,studentURL));mediaURLs.set(ref,referenceURL);mediaURLs.set(stu,studentURL);
  const settings=localRecord.settings;
  if(settings){
   for(const id of ['opacity','scale','x','y'])if(Number.isFinite(settings[id])){$(id).value=settings[id];$(id+'Value').textContent=settings[id]+'%';}
   for(const id of ['mirrorReference','mirrorStudent'])$(id).checked=!!settings[id];
   for(const id of ['speed','audio','view'])if(settings[id]!==undefined)$(id).value=settings[id];
   ref.playbackRate=stu.playbackRate=Number($('speed').value);setAudio();
   interval={...bounds};updateWindow();await seek(interval.start);
  }
  $('save').textContent='Save on this device';$('savedLink').hidden=true;
  $('saveNotice').textContent='This comparison is saved in this browser only. Download your recording to keep a separate copy.';
  $('clear').textContent='Delete this local comparison';
  $('timingDetails').hidden=true;$('audioWaveforms').hidden=true;$('exerciseDuration').hidden=true;
  $('stageBadge').hidden=true;
  $('localCancel').hidden=true;tools.hidden=true;
  if(!localRecord.manualSync?.verified&&!localRecord.audioAlignment?.verified){
   status('Audio alignment needs review',localRecord.audioAlignment?.reason||'Could not verify the count-in.',true);
   $('timingDetails').hidden=false;
   $('scoreState').textContent='Alignment needs review';$('scoreMessage').textContent='We could not confidently synchronize this recording. Review the audio before scoring.';
  }else status(reusedAnalysis?'Using saved analysis':'Analyzed on your device',`${localRecord.analysis.frames} frames checked. ${localRecord.audioAlignment?.verified?(localRecord.audioAlignment.method==='stable_music_refinement'?'Dance music matched throughout. The spoken count-in has a small timing difference.':'Count-in, music, and ending audio matched.'):'Using your saved alignment.'} Your recording was not uploaded; the score remains an estimate.`);
  await import('./account.js'); // Register result actions before cached analysis can finish.
  window.dispatchEvent(new CustomEvent('dance-result',{detail:{record:localRecord}}));
  await openOwnerSync(activeSyncJob);
 }catch(error){setReady(false);status('Comparison needs attention',error.message,true);$('localRetry').hidden=false;$('localCancel').hidden=true;}
 finally{waitingMusic.end();setBusy(false);}
}
async function openOwnerSync(job){
 await syncPermission;if(!canAdjustSync||!job)return;
 const viewer=document.querySelector('#comparison .viewer-panel');if(!viewer)return;
 $('comparison').classList.add('owner-sync-workspace');viewer.append($('audioWaveforms'));
 if($('bothAudioOption'))$('bothAudioOption').hidden=false;
 if($('ownerSyncOpen'))$('ownerSyncOpen').hidden=true;
 await loadWaveforms(job);
 if(localRecord?.manualSync?.verified)$('ownerSyncNotice').textContent=`Owner verified · saved offset ${(offset*1000).toFixed(2)} ms`;
}
function updateSyncPlayhead(){
 const line=$('syncPlayhead');if(!line||!waveformViewport||!canAdjustSync)return;
 const fraction=(current-waveformViewport.start)/(waveformViewport.end-waveformViewport.start);
 line.hidden=fraction<0||fraction>1;
 line.style.left=`${(100+1080*fraction)/12}%`;
}
if($('ownerSyncOpen'))$('ownerSyncOpen').onclick=()=>openOwnerSync(activeSyncJob);
if($('waveformOverlay'))$('waveformOverlay').onchange=drawWaveforms;
document.querySelectorAll?.('[data-sync-view]').forEach(button=>button.onclick=()=>{
 if(!canAdjustSync)return;pause();$('waveformView').value=button.dataset.syncView;drawWaveforms();
 if(waveformViewport)seek(Math.max(interval.start,Math.min(interval.end,waveformViewport.start)));
});
for(const [id,direction] of [['syncFrameEarlier',1],['syncFrameLater',-1]])if($(id))$(id).onclick=()=>{
 if(!canAdjustSync||!ready||busy)return;
 pause();const shift=frameShift(videoFrameTimes.student,current+offset,direction);
 if(shift===null){$('ownerSyncNotice').textContent='No adjacent student frame is available at this position.';return;}
 applyOffset(offset+shift);$('ownerSyncNotice').textContent=`Unsaved · offset ${(offset*1000).toFixed(2)} ms. One frame moved ${(Math.abs(shift)*1000).toFixed(2)} ms.`;
};
if($('ownerSyncSave'))$('ownerSyncSave').onclick=()=>{if(canAdjustSync){manualTiming=true;$('save').onclick();}};

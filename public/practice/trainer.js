import {RecorderSession, REQUESTED_AUDIO, recordingExtension, nativeCameraConstraints, prepareNativeCamera, cameraDiagnosticSnapshot, LessonAudioCache, RecordGate} from './recorder.mjs';
import {prepareLocalVideo} from './local-video.mjs';
import {saveLocalTake,listLocalTakes,videoFingerprint,reuseLocalEvidence} from './local-store.mjs';
import {marchingTimingDefault} from './timeline.mjs';
import {LessonNavigation,backDestination} from './lesson-navigation.mjs';
const $=id=>document.getElementById(id);
const screens=['library','lesson','watch','setup','take'];
const challengeToken=new URLSearchParams(location.search).get('challenge');
let acceptedChallenge=null,challengeLoadedAt=0;
const navigation=new LessonNavigation(window.history,{challenge:challengeToken});
const lessonAudioCache=new LessonAudioCache();
let watchGeneration=0,watchAbort=null,watchURL=null,watchSource=null;
let lesson=null,controller=null,context=null,stream=null,diagnosticTimer=null,setupGeneration=0,loadAbort=null,recordGate=null,take=null,takeMetadata=null,takeURL=null,saveURL=null,galleryTake=null,galleryPreparing=false,galleryGeneration=0,pending=null,submitting=false,navigating=false,currentScreen='library';
let lessonsById=new Map();
const activeCapture=()=>controller&&['starting','preparing','recording','finishing','finalizing'].includes(controller.state);
function screen(name,{replace=false,fromHistory=false}={}){
 if(!fromHistory&&navigation.current&&(navigation.current.dwcScreen!==name||navigation.current.lessonId!==lesson?.id||replace))navigation.open(name,lesson?.id,{replace});
 if(name==='library'){acceptedChallenge=null;document.body.classList.remove('challenge-recording');$('activeChallengeBanner')?.remove();}
 currentScreen=name;for(const id of screens)$(id+'Screen').hidden=id!==name;
 const destination=backDestination(name,lesson?.title);
 $('flowNav').hidden=!destination;$('flowBackLabel').textContent=destination?.label||'';
 $('flowBack').setAttribute('aria-label',destination?`Back to ${destination.label}`:'Back');
 window.scrollTo({top:0,behavior:'instant'});
}
function leaveWatch(){watchGeneration++;watchAbort?.abort();$('watchVideo').pause();}
function restoreScreen(state){
 const name=state.dwcScreen;
 if(currentScreen==='watch'&&name!=='watch')leaveWatch();
 if(currentScreen==='setup'&&name!=='setup')stopDevices();
 if(name==='library'){screen('library',{fromHistory:true});return;}
 const item=lessonsById.get(state.lessonId);
 if(!item){navigation.open('library',null,{replace:true});screen('library',{fromHistory:true});return;}
 lesson=item;
 if(name==='lesson')showLesson(item,{fromHistory:true});
 else if(name==='watch')$('watch').onclick({fromHistory:true});
 else if(name==='setup')setupCamera({fromHistory:true});
 else if(name==='take'&&take)showTake({fromHistory:true});
 else showLesson(item,{replace:true});
}
function navigateBack(){
 if(activeCapture()){$('captureStatus').textContent='Stop recording before leaving this screen.';return;}
 if(submitting)return;
 const state=navigation.back();if(state)restoreScreen(state);
}
$('flowBack').onclick=navigateBack;
window.addEventListener('popstate',event=>{
 if(!activeCapture()&&!submitting&&(new URLSearchParams(location.search).get('challenge')||null)!==navigation.challenge){location.reload();return;}
 const previous=navigation.current;
 const state=navigation.restore(event.state);
 if(activeCapture()||submitting){
  if(state.dwcScreen!==currentScreen||state.lessonId!==lesson?.id){
   navigation.current=previous;window.history.forward();
   if(activeCapture())$('captureStatus').textContent='Stop recording before leaving this screen.';
  }
  return;
 }
 restoreScreen(state);
});
async function api(path,options={}){
 const response=await fetch(path,options);if(response.status===401)window.showSignIn?.();let data;try{data=await response.json();}catch{throw new Error('The server could not finish this request. Your take is still here. Try again.');}
 if(!response.ok)throw new Error(data.error||'Request failed.');return data;
}
function portraitPhone(){return navigator.maxTouchPoints>0&&window.matchMedia('(orientation: landscape)').matches;}
function cameraSnapshot(event='ready'){
 const track=stream?.getVideoTracks()[0];if(!track)return null;
 const snapshot=cameraDiagnosticSnapshot($('cameraPreview'),track,{width:window.innerWidth,height:window.innerHeight,angle:window.screen.orientation?.angle??window.orientation??0,type:window.screen.orientation?.type||'unknown'},navigator.mediaDevices.getSupportedConstraints?.()||{});
 snapshot.event=event;return snapshot;
}
function reportCamera(event='ready'){
 const snapshot=cameraSnapshot(event);if(!snapshot)return;
 $('cameraDetails').textContent=JSON.stringify(snapshot,null,2);
 $('cameraReportStatus').textContent='Camera settings are shown on this device only.';
}
function orientationChanged(){
 const video=$('cameraPreview');const wrong=portraitPhone();
 if(video.videoWidth>0&&video.videoHeight>0){
   video.parentElement.style.setProperty('--camera-aspect',String(video.videoWidth/video.videoHeight));
   let zoom;try{zoom=stream?.getVideoTracks()[0]?.getSettings?.().zoom;}catch{}
   $('framingNote').textContent=`Full camera view · ${video.videoWidth} × ${video.videoHeight}. Zoom: ${Number.isFinite(zoom)?zoom:'not reported by browser'}. Nothing is cropped from this preview. Your full camera view is kept in the local recording and comparison.`;
 }
 $('orientationNotice').hidden=!wrong;
 if(currentScreen==='setup'&&controller?.state==='ready')$('record').disabled=wrong;
 if(wrong&&activeCapture())controller.interrupt('The phone orientation changed during recording. This take may be incomplete.');
 clearTimeout(diagnosticTimer);if(stream&&currentScreen==='setup')diagnosticTimer=setTimeout(()=>reportCamera('resize'),600);
}
function stopDevices(){
 setupGeneration++;loadAbort?.abort();loadAbort=null;
 recordGate?.reset();recordGate=null;
 controller?.dispose();controller=null;
 clearTimeout(diagnosticTimer);diagnosticTimer=null;
 for(const track of stream?.getTracks()||[])track.stop();stream=null;
 $('cameraPreview').srcObject=null;
 context?.close().catch(()=>{});context=null;
}
function discardTake(){
 galleryGeneration++;galleryPreparing=false;galleryTake=null;
 $('takeVideo').pause();$('takeVideo').removeAttribute('src');$('takeVideo').load();
 if(takeURL)URL.revokeObjectURL(takeURL);takeURL=null;take=null;takeMetadata=null;
 if(saveURL)URL.revokeObjectURL(saveURL);saveURL=null;
 // Local comparisons remain available until explicitly deleted in their review page.
 pending=null;
}
function showLesson(item,{replace=false,fromHistory=false}={}){
 lesson=item;
 if(item.practice_ready!==false)prepareLesson(item).catch(()=>{});
 $('lessonTitle').textContent=item.title;$('lessonDescription').textContent=item.description;
 $('lessonPoster').src=item.poster_url||'/practice/marching-library.jpg';$('lessonPoster').alt=`${item.title} reference demonstration`;
 $('lessonFacts').textContent=`${item.bpm} BPM · ${item.bars} bars · ${Math.round(item.audio_duration||12)} sec`;$('lessonAudioNote').textContent=item.audio_note;
 const pending=item.practice_ready===false;
 $('lessonAvailability').hidden=!pending;$('lessonAvailability').textContent=pending?item.timing_note||'Timing review is still in progress. Watch the move now; recording and scoring will open later.':'';
 $('recordYourself').hidden=pending;$('lessonFile').closest('.file-label').hidden=pending;
 screen('lesson',{replace,fromHistory});
}
$('lessonBack').onclick=navigateBack;
$('watch').onclick=async(options={})=>{
 const generation=++watchGeneration;watchAbort?.abort();watchAbort=new AbortController();
 screen('watch',{fromHistory:options?.fromHistory===true});$('watchTitle').textContent=lesson.title;
 $('watchHelp').textContent=lesson.practice_ready===false?'Watch the count-in and the full movement. Recording and scoring will open after the reference beats are reviewed.':'Watch the count-in and the full movement. The original clean count-in and drums will play when you record.';
 const video=$('watchVideo');video.pause();video.controls=false;
 let status=$('watchLoadStatus');if(!status){status=document.createElement('p');status.id='watchLoadStatus';status.setAttribute('role','status');video.after(status);}
 status.textContent='Loading the full reference video for smooth playback…';
 try{
   if(watchSource!==lesson.reference_url||!watchURL){
     const response=await fetch(lesson.reference_url,{signal:watchAbort.signal});
     if(response.status===401)window.showSignIn?.();
     if(!response.ok)throw new Error('Could not load the reference video. Go back and try again.');
     const blob=await response.blob();
     if(generation!==watchGeneration)return;
     video.removeAttribute('src');video.load();
     if(watchURL)URL.revokeObjectURL(watchURL);
     watchURL=URL.createObjectURL(blob);watchSource=lesson.reference_url;
   }
   if(generation!==watchGeneration||currentScreen!=='watch')return;
   video.src=watchURL;video.controls=true;status.textContent='Reference loaded. Press Play to watch.';
   video.play().then(()=>{if(generation===watchGeneration)status.textContent='Reference loaded.';}).catch(()=>{});
 }catch(error){if(generation===watchGeneration&&error.name!=='AbortError')status.textContent=error.message;}
};
$('watchBack').onclick=()=>{leaveWatch();navigateBack();};
function micDescription(audioTrack){
 const actual=audioTrack?.getSettings?.()||{};
 const names={echoCancellation:'echo cancellation',noiseSuppression:'noise suppression',autoGainControl:'automatic gain'};
 const bits=Object.entries(names).map(([key,label])=>`${label}: ${actual[key]===false?'off':actual[key]===true?'still enabled':'not reported'}`);
 return `Requested sound processing off. Browser reports ${bits.join('; ')}. Some phones may still process the microphone. Actual captured music must be checked.`;
}
function captureState(state,detail){
 $('flowBack').disabled=['starting','preparing','recording','finishing','finalizing'].includes(state);
 $('record').hidden=!['ready','error'].includes(state);$('setupBack').hidden=activeCapture();$('cancelRecording').hidden=!['starting','preparing','recording','finishing'].includes(state);
 $('uploadFallback').hidden=activeCapture();$('countdown').hidden=state!=='preparing';
 if(state==='starting'){$('captureStatus').textContent='Getting recording ready… The music will begin when the recorder is ready.';$('cameraBadge').textContent='GETTING READY';}
 if(state==='preparing'){$('countdown').textContent=detail.count;$('captureStatus').textContent='Get ready. Recording starts after this countdown.';$('cameraBadge').textContent='GET READY · NOT RECORDING';}
 $('cancelRecording').textContent=state==='preparing'||state==='starting'?'Cancel':'Stop recording';
 if(state==='recording'){$('captureStatus').textContent=detail.remaining!==undefined?`Keep going · ${Math.ceil(detail.remaining)} seconds of lesson audio left.`:'Listen for the musical count-in, then move.';$('cameraBadge').textContent='RECORDING';}
 if(['finishing','finalizing'].includes(state)){$('captureStatus').textContent='Finishing your recording… Keep the page open.';$('cameraBadge').textContent='FINISHING';}
 if(state==='review'){
   take=detail.blob;takeMetadata={...detail.metadata,orientation:window.innerHeight>=window.innerWidth?'portrait':'landscape'};
   reportCamera('recorded');showTake();context?.close().catch(()=>{});context=null;stream=null;
 }
 if(state==='error'){$('captureStatus').textContent=detail.message||'Recording could not start. Try again or choose a video below.';$('record').hidden=false;$('record').disabled=false;$('record').textContent='Try camera again';$('setupBack').hidden=false;$('cancelRecording').hidden=true;$('uploadFallback').hidden=false;}
}
async function setupCamera(options={}){
 if(lesson?.practice_ready===false){showLesson(lesson,{replace:true});return;}
 stopDevices();screen('setup',{replace:options?.replace===true,fromHistory:options?.fromHistory===true});const generation=setupGeneration;
 $('cameraPreview').parentElement.style.setProperty('--camera-aspect',String((lesson.reference_width||9)/(lesson.reference_height||16)));
 recordGate=new RecordGate(startRecording);
 $('record').textContent='Record ●';$('record').hidden=false;$('record').disabled=false;$('setupBack').hidden=false;$('cancelRecording').hidden=true;$('countdown').hidden=true;$('uploadFallback').hidden=false;$('cameraPlaceholder').hidden=false;$('cameraBadge').textContent='FRONT CAMERA';
 $('captureStatus').textContent='Opening the camera and loading the complete lesson audio…';
 try{
   if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder)throw new Error('This browser cannot record camera and microphone here. Open the HTTPS link in Safari or Chrome, or choose your own video below.');
   const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!AudioContext)throw new Error('This browser cannot prepare lesson playback. Try Safari or Chrome, or upload a take.');
   context=new AudioContext();const setupContext=context;loadAbort=new AbortController();
   // Start the audio request while Chrome is opening and stabilizing the camera.
   // The Record button still waits for both resources, but the two slow operations
   // no longer happen back-to-back on phones with a slow connection or camera start.
   const audioReady=lessonAudioCache.decode(setupContext,lesson.audio_url,{signal:loadAbort.signal});audioReady.catch(()=>{});
   const captured=await navigator.mediaDevices.getUserMedia({video:nativeCameraConstraints(navigator.mediaDevices.getSupportedConstraints?.()||{}),audio:{...REQUESTED_AUDIO}});
   if(generation!==setupGeneration){captured.getTracks().forEach(t=>t.stop());return;}
   stream=captured;
   if(stream.getVideoTracks()[0]?.getSettings?.().facingMode==='environment')throw new Error('This browser selected the rear camera. Try another browser with the front camera, or choose a video below.');
   $('cameraBadge').textContent=stream.getVideoTracks()[0]?.getSettings?.().facingMode==='user'?'FRONT CAMERA':'CAMERA PREVIEW';
   const preview=$('cameraPreview');preview.srcObject=stream;await preview.play();
   const dimensions=await prepareNativeCamera(preview,stream.getVideoTracks()[0],{isCancelled:()=>generation!==setupGeneration});
   if(!dimensions||generation!==setupGeneration)return;
   let videoFraming={mode:'native',sourceWidth:dimensions.width,sourceHeight:dimensions.height,outputWidth:dimensions.width,outputHeight:dimensions.height,rotation:0,crop:'none',renderTimingVerified:false};
   $('cameraPlaceholder').hidden=true;
   reportCamera('opened');
   if(!stream.getAudioTracks().length)throw new Error('Microphone audio is required to check music timing. Enable microphone access and retry.');
   $('micSettings').textContent=micDescription(stream.getAudioTracks()[0]);
   $('captureStatus').textContent='Camera ready. Finishing lesson audio preparation…';
   const buffer=await audioReady;
   if(generation!==setupGeneration)return;
   controller=new RecorderSession({stream,context:setupContext,buffer,onState:captureState});
   controller.metadata.videoFraming=videoFraming;
   $('captureStatus').textContent=`Audio ready (${buffer.duration.toFixed(1)}s). Check that your feet are visible, then tap Record.`;
   orientationChanged();recordGate?.unlock();reportCamera('ready');
 }catch(error){
   if(generation!==setupGeneration)return;stopDevices();
   const messages={NotAllowedError:'Camera or microphone access was declined. Allow both in this site’s browser settings, then try again—or choose a video below.',NotFoundError:'No camera or microphone was found. Connect one, use your phone, or choose a video below.',NotReadableError:'The camera or microphone is busy. Close other apps using it, then try again.',OverconstrainedError:'This camera cannot use the requested settings. Try a different device or upload a video.'};
   captureState('error',{message:messages[error.name]||error.message});
 }
}
$('recordYourself').onclick=()=>setupCamera();
$('setupBack').onclick=navigateBack;
function startRecording(){
 if(controller?.state!=='ready')return false;
 if(portraitPhone()){orientationChanged();return;}
 const video=$('cameraPreview');
 controller.metadata.videoFraming={mode:'native',sourceWidth:video.videoWidth,sourceHeight:video.videoHeight,outputWidth:video.videoWidth,outputHeight:video.videoHeight,rotation:0,crop:'none',renderTimingVerified:false};
 $('record').disabled=true;
 controller.metadata.challengeStartedAt=acceptedChallenge?acceptedChallenge.server_time*1000+(performance.now()-challengeLoadedAt):Date.now();
 controller.start().catch(()=>{});
 return true;
}
$('record').onclick=()=>{
 if(!recordGate){setupCamera();return;}
 // Resume within the user's tap. If setup is still running, this preserves
 // Android's gesture permission until the queued recording can begin.
 context?.resume?.().catch(()=>{});
 recordGate.request();
};
$('cancelRecording').onclick=()=>controller?.interrupt(controller.state==='preparing'?'Preparation was cancelled.':'Recording was stopped before the lesson finished.');
async function prepareGalleryVideo(savedTake,generation){
 galleryPreparing=true;setSubmitting(submitting);$('takeStatus').textContent='Preparing your recording on this device…';
 try{
  const prepared=await prepareLocalVideo(savedTake);
  if(generation!==galleryGeneration||take!==savedTake)return;
  galleryTake=prepared.blob;pending={prepared};
  if(saveURL)URL.revokeObjectURL(saveURL);saveURL=URL.createObjectURL(galleryTake);
  $('takeVideo').pause();$('takeVideo').src=saveURL;
  $('takeStatus').textContent='Ready to compare on this device. Your recording will not be uploaded.';
 }catch(error){if(generation===galleryGeneration&&take===savedTake){pending=null;galleryTake=null;$('takeStatus').textContent=error.message;const download=$('downloadTake');download.href=takeURL;download.download='original-recording.mp4';download.textContent='Download original backup (duration may be incorrect)';download.hidden=false;}}
 finally{if(generation===galleryGeneration&&take===savedTake){galleryPreparing=false;setSubmitting(submitting);}}
}
let localLessonPromise=null,localLessonKey=null;
function prepareLesson(item){
 const key=item.id+':'+item.version;
 if(key!==localLessonKey||!localLessonPromise){
  localLessonKey=key;
  localLessonPromise=(async()=>{
   const markersURL=item.markers_url||(item.id==='marching'?'/practice/api/foot-reference/marching':null);
   if(!markersURL)throw Error('Local comparison is not available for this lesson yet.');
   const [response,reference]=await Promise.all([fetch(item.reference_url),api(markersURL)]);
   if(!response.ok)throw Error('Could not download the reference. Sign in and try again.');
   const referenceBlob=await response.blob();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await referenceBlob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
   if(hash!==reference.reference_sha256)throw Error('The reference video and beat markers have different versions. Reload before comparing.');
   return {referenceBlob,reference};
  })();
  localLessonPromise.catch(()=>{if(localLessonKey===key)localLessonPromise=null;});
 }
 return localLessonPromise;
}
function showTake({fromHistory=false}={}){
 $('downloadTake').hidden=true;
 if(takeURL)URL.revokeObjectURL(takeURL);takeURL=URL.createObjectURL(take);$('takeVideo').src=takeURL;
 $('takeStatus').textContent=`Your captured take · ${(take.size/1024/1024).toFixed(1)} MB. Preview it before comparing locally.`;
 const incomplete=takeMetadata.source==='browser-recording'&&(!takeMetadata.completed||takeMetadata.interrupted);
 $('takeWarning').hidden=!incomplete;$('takeWarning').textContent=incomplete?'This take was interrupted and may be incomplete. '+(takeMetadata.interruptions||[]).join(' ')+' You can save it, retry, or submit for manual review.':'';
 pending=null;screen('take',{replace:currentScreen==='setup',fromHistory});setSubmitting(false);
 const generation=++galleryGeneration;prepareGalleryVideo(take,generation);
}
function setSubmitting(value){submitting=value;$('flowBack').disabled=value;$('retry').disabled=value;$('submitTake').disabled=value||galleryPreparing||!pending?.prepared;$('saveTake').disabled=value||galleryPreparing;}
$('submitTake').onclick=async()=>{
 if(!take||submitting||!pending?.prepared)return;
 setSubmitting(true);
 try{
  $('takeVideo').pause();$('takeStatus').textContent='Downloading the reference and saving this comparison on your device…';
  const assets=await prepareLesson(lesson),id='local-'+crypto.randomUUID();
  const captureDelay=(takeMetadata.playbackStartedMs-takeMetadata.recordingStartedMs)/1000;
  const offset=marchingTimingDefault({lesson,recording:takeMetadata})??(takeMetadata.source==='browser-recording'&&Number.isFinite(captureDelay)?captureDelay-lesson.reference_audio_offset:0);
  $('takeStatus').textContent='Checking for saved analysis on this device…';
  const [videoHash,referenceHash]=await Promise.all([videoFingerprint(pending.prepared.blob),videoFingerprint(assets.referenceBlob)]);
  let record={id,createdAt:Date.now(),lesson,metadata:takeMetadata,studentBlob:pending.prepared.blob,samples:pending.prepared.samples,duration:pending.prepared.duration,offset,...assets,videoHash,referenceHash};
  if(acceptedChallenge&&lesson.id===acceptedChallenge.lesson)record.challenge={id:acceptedChallenge.id};
  record=await reuseLocalEvidence(record);
  await saveLocalTake(record);
  navigation.open('lesson',lesson.id,{replace:true});
  navigating=true;window.location.assign(`/practice/compare.html?local=${encodeURIComponent(id)}`);
 }catch(error){$('takeStatus').textContent=error.message;setSubmitting(false);}
};
$('retry').onclick=()=>{if(submitting)return;if(take&&!window.confirm('Replace this recording? Download it first if you want to keep a copy.'))return;discardTake();setupCamera({replace:true});};
$('saveTake').onclick=async()=>{
 if(!take||submitting||galleryPreparing)return;
 if(take.type.split(';')[0].trim().toLowerCase()==='video/mp4'&&!galleryTake){
   await prepareGalleryVideo(take,++galleryGeneration);
   return; // A fresh tap preserves Android's permission to open the share sheet.
 }
 const sourceExtension=take instanceof File?take.name.match(/\.(mp4|mov|webm|m4v)$/i)?.[1]?.toLowerCase():null;
 const extension=sourceExtension||recordingExtension(take.type);
 const download=$('downloadTake');
 download.href=saveURL||takeURL;
 download.download=`${lesson.id}-take-${new Date().toISOString().replace(/[:.]/g,'-')}.${extension}`;
 download.textContent='Download recording';download.hidden=false;
 try{
   download.click();
   $('takeStatus').textContent='Download requested. Check Chrome’s Downloads or My Files → Downloads. Gallery may take a moment to show the video. You can also use the video’s three-dot Download menu.';
 }catch{
   $('takeStatus').textContent='Tap the Download recording link below, or use the video’s three-dot Download menu.';
 }
};
function chooseSavedVideo(input){
 if(acceptedChallenge){input.value='';window.alert('Record a new take to complete this challenge.');return;}
 if(lesson?.practice_ready===false){input.value='';showLesson(lesson,{replace:true});return;}
 const file=input.files[0];if(!file)return;
 if(file.size>90*1024*1024){window.alert('Choose an MP4 under 90 MB and 30 seconds.');input.value='';return;}
 if(take&&!window.confirm('Replace this recording? Download it first if you want to keep a copy.')){input.value='';return;}
 stopDevices();discardTake();take=file;takeMetadata={schema:1,source:'manual-upload',mimeType:file.type||'application/octet-stream',completed:false,interrupted:false,interruptions:[]};input.value='';showTake();
}
$('fallbackFile').onchange=()=>chooseSavedVideo($('fallbackFile'));
$('lessonFile').onchange=()=>chooseSavedVideo($('lessonFile'));
document.addEventListener('visibilitychange',()=>{if(document.hidden){$('watchVideo').pause();if(activeCapture())controller.interrupt('The app went into the background. Keep it open for the full recording.');}});
window.addEventListener('pagehide',()=>{if(activeCapture())controller.interrupt('The page was closed.');stopDevices();});
window.addEventListener('beforeunload',event=>{if(!navigating&&(take||activeCapture())){event.preventDefault();event.returnValue='';}});
window.addEventListener('resize',orientationChanged);
$('cameraPreview').addEventListener('resize',orientationChanged);

try{
 const manifest=await api('/practice/api/lessons');
 lessonsById=new Map(manifest.lessons.map(item=>[item.id,item]));
 for(const item of manifest.lessons){
  if(item.practice_ready!==false)lessonAudioCache.preload(item.audio_url).catch(()=>{});
  const button=document.createElement('button');button.className='lesson-card';const title=document.createElement('strong');title.textContent=item.title;
  const meta=document.createElement('small');meta.textContent=`${item.bpm} BPM · ${item.bars} bars`;
  const poster=document.createElement('span');poster.className='lesson-poster';
  const imageSource=item.poster_url||item.id==='marching'&&'/practice/marching-library.jpg';
  if(imageSource){const image=document.createElement('img');image.src=imageSource;image.alt=`Ceech demonstrating ${item.title}`;image.width=480;image.height=853;poster.append(image);}
  if(item.practice_ready===false){const badge=document.createElement('span');badge.className='lesson-badge';badge.textContent='Timing review in progress';poster.append(badge);}
  const caption=document.createElement('span');caption.className='lesson-caption';const action=document.createElement('span');action.className='lesson-action';action.textContent=item.practice_ready===false?'Watch move →':'Practice move →';caption.append(title,meta,action);button.append(poster,caption);button.onclick=()=>showLesson(item);$('lessonList').append(button);
 }
 $('libraryCount').textContent=`${manifest.lessons.length} ${manifest.lessons.length===1?'move':'moves'}`;
 $('libraryStatus').textContent=manifest.lessons.length?'':'No lessons are available yet.';
 if(navigation.challenge){
  acceptedChallenge=await api('/practice/api/challenges/'+navigation.challenge);challengeLoadedAt=performance.now();
  if(!acceptedChallenge.accepted||acceptedChallenge.completed||!acceptedChallenge.available||acceptedChallenge.is_sender){location.replace('/practice/challenge.html?id='+navigation.challenge);throw Error('Opening your challenge…');}
  document.body.classList.add('challenge-recording');
  const banner=document.createElement('div');banner.id='activeChallengeBanner';banner.className='challenge-banner';
  banner.textContent=`Challenge from ${acceptedChallenge.name} · ${acceptedChallenge.score}/100. Record a new take to join in.`;
  $('flowNav').after(banner);
 }
 const destination=new URLSearchParams(window.location.hash.slice(1));
 if(acceptedChallenge)destination.set('lesson',acceptedChallenge.lesson);
 const selected=manifest.lessons.find(item=>item.id===destination.get('lesson'));
 navigation.start(selected?'lesson':'library',selected?.id||null);
 if(selected){
  showLesson(selected,{fromHistory:true});
  if(destination.get('action')==='record'||destination.get('view')==='setup')await setupCamera();
  else if(destination.get('view')==='watch')await $('watch').onclick();
 }
 else screen('library',{fromHistory:true});

}catch(error){$('libraryStatus').textContent=error.message+' Reload this page to try again.';}

async function showLocalComparisons(){
 try{
  const items=await listLocalTakes();if(!items.length)return;
  const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
  const section=make('section','local-history');section.setAttribute('aria-label','Saved comparisons');
  const heading=make('div','history-heading'),titles=make('div');
  const title=make('h2',null,'Recent comparisons');titles.append(title,make('p',null,'Pick up where you left off. Saved in this browser.'));
  const toggle=make('button','history-toggle',`View all (${items.length})`);toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','comparisonHistoryList');
  heading.append(titles,toggle);section.append(heading);
  const controls=make('div','history-tools');controls.hidden=true;
  const label=make('label',null,'Move '),filter=make('select');filter.setAttribute('aria-label','Filter comparisons by move');
  for(const value of ['All moves',...new Set(items.map(i=>i.title))]){const option=make('option',null,value);option.value=value;filter.append(option);}label.append(filter);controls.append(label);section.append(controls);
  const list=make('div','history-list');list.id='comparisonHistoryList';section.append(list);
  const pager=make('div','history-pagination'),previous=make('button','secondary','← Previous'),next=make('button','secondary','Next →'),range=make('span');range.setAttribute('role','status');previous.type=next.type='button';pager.append(previous,range,next);section.append(pager);
  let expanded=false,page=0;
  function render(){
   const selected=items.filter(i=>filter.value==='All moves'||i.title===filter.value),size=expanded?6:3;
   page=Math.min(page,Math.max(0,Math.ceil(selected.length/size)-1));list.replaceChildren();
   for(const item of selected.slice(page*size,(page+1)*size)){
    const link=make('a','local-history-link');link.href=`/practice/compare.html?local=${encodeURIComponent(item.id)}`;
    const icon=make('span','history-icon','▷');icon.setAttribute('aria-hidden','true');
    const info=make('span','history-info'),date=new Date(item.createdAt);
    info.append(make('strong',null,item.title),make('span',null,date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})+' · '+date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})));
    const action=make('span','history-action',item.analyzed?'Review →':'Continue →');link.append(icon,info,action);list.append(link);
   }
   controls.hidden=!expanded;pager.hidden=!expanded||selected.length<=size;
   previous.disabled=page===0;next.disabled=(page+1)*size>=selected.length;
   range.textContent=`${page*size+1}–${Math.min((page+1)*size,selected.length)} of ${selected.length}`;
   title.textContent=expanded?'Your comparisons':'Recent comparisons';
   toggle.textContent=expanded?'Show recent':`View all (${items.length})`;toggle.setAttribute('aria-expanded',String(expanded));toggle.hidden=items.length<=3;
  }
  toggle.onclick=()=>{expanded=!expanded;page=0;filter.value='All moves';render();};
  filter.onchange=()=>{page=0;render();};previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};
  render();$('libraryScreen').append(section);
 }catch{/* Recording still works when storage is unavailable. */}
}
showLocalComparisons();

const navToggle=$('navToggle'),siteNav=$('siteNav');
function closeNav(){siteNav.hidden=true;navToggle.setAttribute('aria-expanded','false');navToggle.setAttribute('aria-label','Open menu');}
navToggle.addEventListener('click',()=>{const open=siteNav.hidden;siteNav.hidden=!open;navToggle.setAttribute('aria-expanded',String(open));navToggle.setAttribute('aria-label',open?'Close menu':'Open menu');});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!siteNav.hidden){closeNav();navToggle.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeNav();});

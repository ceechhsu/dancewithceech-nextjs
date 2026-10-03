// Capture uses the native camera video and original microphone track. Lesson playback goes only to speakers.
export const REQUESTED_AUDIO = {echoCancellation:false,noiseSuppression:false,autoGainControl:false};
export function chooseMimeType(Recorder) {
  if(!Recorder)throw new Error('Recording is not supported in this browser. Upload a video instead.');
  return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(type=>Recorder.isTypeSupported?.(type))||'';
}
export function recordingExtension(type='') {return type.toLowerCase().includes('mp4')?'mp4':type.toLowerCase().includes('webm')?'webm':type.toLowerCase().includes('quicktime')?'mov':'bin';}
const browserFetch=(...args)=>globalThis.fetch(...args);

export async function decodeLessonAudio(context,url,{fetchImpl=browserFetch,signal}={}) {
  const response=await fetchImpl(url,{signal});
  if(!response.ok)throw new Error('The lesson audio could not load. Reload the page and sign in again if needed.');
  const buffer=await context.decodeAudioData(await response.arrayBuffer());
  if(!Number.isFinite(buffer.duration)||buffer.duration<1)throw new Error('This lesson audio is unavailable. Try again.');
  return buffer;
}
export class LessonAudioCache {
  constructor(fetchImpl=browserFetch){this.fetchImpl=fetchImpl;this.assets=new Map();}
  preload(url){
    if(this.assets.has(url))return this.assets.get(url);
    let request;
    request=this.fetchImpl(url).then(response=>{
      if(!response.ok)throw new Error('The lesson audio could not load. Reload the page and sign in again if needed.');
      return response.arrayBuffer();
    }).catch(error=>{if(this.assets.get(url)===request)this.assets.delete(url);throw error;});
    this.assets.set(url,request);return request;
  }
  async decode(context,url,{signal}={}){
    const bytes=await this.preload(url);
    if(signal?.aborted)throw new Error('Lesson audio preparation was cancelled.');
    const buffer=await context.decodeAudioData(bytes.slice(0));
    if(!Number.isFinite(buffer.duration)||buffer.duration<1)throw new Error('This lesson audio is unavailable. Try again.');
    return buffer;
  }
}
export class RecordGate {
  constructor(start){this.start=start;this.ready=false;this.queued=false;}
  request(){if(!this.ready){this.queued=true;return false;}this.start();return true;}
  unlock(){this.ready=true;if(!this.queued)return false;this.queued=false;this.start();return true;}
  reset(){this.ready=false;this.queued=false;}
}
const settings = track => {
  const actual=track?.getSettings?.()||{}, result={};
  for(const key of ['echoCancellation','noiseSuppression','autoGainControl','sampleRate','channelCount','width','height','frameRate','facingMode'])if(actual[key]!==undefined)result[key]=actual[key];
  return result;
};
// Instructor-tested S24+ Chrome request: landscape constraints deliver portrait
// 1080x1920 when the phone is upright. Always report actual output dimensions.
export function nativeCameraConstraints(supported={}) {
  return {facingMode:{ideal:'user'},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30,max:30},...(supported.resizeMode?{resizeMode:{exact:'none'}}:{})};
}
export async function prepareNativeCamera(video,track,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),isCancelled=()=>false}={}) {
  if(isCancelled())return null;
  let capabilities={};try{capabilities=track.getCapabilities?.()||{};}catch{}
  let constraints={};try{constraints={...(track.getConstraints?.()||{})};}catch{}
  if(capabilities.resizeMode?.includes('none'))constraints.resizeMode={exact:'none'};
  if(Number.isFinite(capabilities.zoom?.min))constraints.advanced=[{zoom:capabilities.zoom.min}];
  if(Object.keys(constraints).length){try{await track.applyConstraints(constraints);}catch{}}
  // Read actual display dimensions after camera startup; never rotate/crop based on a guess.
  let previous='',stable=0;
  for(let i=0;i<15&&!isCancelled();i++){
    const dimensions=`${video.videoWidth}x${video.videoHeight}`;
    stable=video.videoWidth>0&&video.videoHeight>0&&dimensions===previous?stable+1:0;previous=dimensions;
    if(stable>=2)break;await wait(100);
  }
  if(isCancelled())return null;
  if(!video.videoWidth||!video.videoHeight)throw new Error('The camera has not delivered video frames. Please try the camera again.');
  return {width:video.videoWidth,height:video.videoHeight};
}
// Deliberate allowlist: no device IDs, labels, user agent, media, or arbitrary nested fields.
export function cameraDiagnosticSnapshot(video,track,screenInfo={},supported={}) {
  const fields=['width','height','aspectRatio','frameRate','facingMode','resizeMode','zoom'];
  const enums={facingMode:['user','environment','left','right',''],resizeMode:['none','crop-and-scale']};
  const limit=key=>key==='frameRate'?240:['aspectRatio','zoom'].includes(key)?100:16384;
  const valid=(key,value)=>enums[key]?enums[key].includes(value):typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=limit(key);
  const clean=(value,kind)=>{
    const result={};
    for(const key of fields){
      const item=value?.[key];
      if(valid(key,item))result[key]=item;
      else if(kind==='capabilities'&&Array.isArray(item)&&enums[key])result[key]=item.filter(v=>valid(key,v)).slice(0,8);
      else if(item&&typeof item==='object'&&!Array.isArray(item)&&kind!=='settings'){
        const range={};for(const part of kind==='capabilities'?['min','max','step']:['min','max','ideal','exact'])if(valid(key,item[part]))range[part]=item[part];
        if(Object.keys(range).length)result[key]=range;
      }
    }return result;
  };
  const read=method=>{try{return track[method]?.()||{};}catch{return {};}};
  const screen={};
  for(const key of ['width','height'])if(valid(key,screenInfo[key]))screen[key]=screenInfo[key];
  if(Number.isFinite(screenInfo.angle)&&Math.abs(screenInfo.angle)<=360)screen.angle=screenInfo.angle;
  screen.type=['portrait-primary','portrait-secondary','landscape-primary','landscape-secondary'].includes(screenInfo.type)?screenInfo.type:'unknown';
  return {version:1,build:'native-camera-1',event:'ready',screen,intrinsic:{width:video.videoWidth||0,height:video.videoHeight||0},settings:clean(read('getSettings'),'settings'),capabilities:clean(read('getCapabilities'),'capabilities'),constraints:clean(read('getConstraints'),'constraints'),supported:Object.fromEntries(fields.filter(key=>typeof supported[key]==='boolean').map(key=>[key,supported[key]]))};
}
export class RecorderSession {
  constructor({stream,context,buffer,Recorder=globalThis.MediaRecorder,now=()=>performance.now(),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),onState=()=>{}}) {
    Object.assign(this,{stream,context,buffer,Recorder,setTimer,clearTimer,onState});
    this.epoch=now();this.clock=now;this.now=()=>this.clock()-this.epoch;
    this.state='ready';this.take=null;this.chunks=[];this.timers=new Set();this.stopping=false;
    this.metadata={schema:1,source:'browser-recording',preparedSeconds:3,completed:false,interrupted:false,interruptions:[],requestedAudio:{...REQUESTED_AUDIO},effectiveAudio:settings(stream.getAudioTracks()[0]),videoSettings:settings(stream.getVideoTracks()[0]),audioContextBaseLatency:context.baseLatency||0,audioContextOutputLatency:context.outputLatency||0};
    this.trackEnded=()=>this.interrupt('Camera or microphone was disconnected.');
    for(const track of stream.getTracks())track.addEventListener('ended',this.trackEnded);
  }
  change(state,detail={}) {this.state=state;this.onState(state,detail);}
  later(fn,ms) {const timer=this.setTimer(()=>{this.timers.delete(timer);fn();},ms);this.timers.add(timer);return timer;}
  cancelTimers(){for(const timer of this.timers)this.clearTimer(timer);this.timers.clear();}
  async start(){
    if(this.state!=='ready')throw new Error('Finish this take or retry before recording again.');
    this.epoch=this.clock();this.change('starting');
    try {
      // Unlock through Record's user gesture. No recorder or lesson playback during preparation.
      await this.context.resume();
      if(this.stopping||this.state!=='starting')return;
      if(this.context.state!=='running')throw new Error('Audio playback is blocked. Tap Record again or try Safari/Chrome.');
      this.preparationStartedMs=this.now();
      this.change('preparing',{count:3});this.countdown();
    } catch(error) {
      if(this.stopping||this.state==='disposed')return;
      this.interrupt(error.message||'Audio could not start.');
      throw error;
    }
  }
  countdown(){
    this.later(()=>{
      if(this.state!=='preparing'||this.stopping)return;
      const remaining=3-(this.now()-this.preparationStartedMs)/1000;
      if(remaining>0){this.change('preparing',{count:Math.ceil(remaining)});this.countdown();}
      else this.beginRecording();
    },1000);
  }
  beginRecording(){
    if(this.state!=='preparing'||this.stopping)return;
    if(this.context.state!=='running'){this.interrupt('Audio stopped during preparation. Please retry.');return;}
    this.change('starting');
    try{
      const mimeType=chooseMimeType(this.Recorder);
      try{this.recorder=new this.Recorder(this.stream,{...(mimeType?{mimeType}:{}),videoBitsPerSecond:2500000,audioBitsPerSecond:128000});}
      catch{this.recorder=new this.Recorder(this.stream);}
      this.metadata.mimeType=this.recorder.mimeType||mimeType;
      this.recorder.addEventListener('dataavailable',event=>{if(event.data?.size)this.chunks.push(event.data);});
      this.recorder.addEventListener('stop',()=>this.finalize());
      this.recorder.addEventListener('error',event=>{this.recorderFailed=true;this.interrupt(event.error?.message||'The browser interrupted recording.');});
      const timeout=this.later(()=>this.interrupt('The camera did not start recording. Please retry.'),4000);
      this.recorder.addEventListener('start',()=>{
        this.clearTimer(timeout);this.timers.delete(timeout);
        if(this.stopping||this.state!=='starting'){if(this.recorder.state!=='inactive')this.recorder.stop();return;}
        // This is actual recorder readiness, not the Record tap or countdown start.
        this.metadata.recordingStartedMs=this.now();
        this.playLesson();
      },{once:true});
      this.recorder.start(250);
    }catch(error){this.interrupt(error.message||'The camera could not start recording.');}
  }
  playLesson(){
    if(this.stopping||this.state!=='starting'||this.recorder?.state!=='recording')return;
    if(this.context.state!=='running'){this.interrupt('Audio stopped before the lesson began.');return;}
    try{
      this.source=this.context.createBufferSource();this.source.buffer=this.buffer;
      this.source.connect(this.context.destination);
      this.source.onended=()=>this.audioEnded();
      this.audioStartContext=this.context.currentTime;
      this.metadata.playbackStartedMs=this.now();
      this.source.start();this.change('recording',{duration:this.buffer.duration});
      this.watchPlayback();
    }catch(error){this.interrupt('Lesson playback failed. Please retry with sound enabled.');}
  }
  watchPlayback(){
    this.later(()=>{
      if(this.state!=='recording')return;
      this.checkPlayback();
      if(this.state==='recording'){this.onState('recording',{remaining:Math.max(0,this.buffer.duration-(this.context.currentTime-this.audioStartContext))});this.watchPlayback();}
    },250);
  }
  checkPlayback(){
    if(this.state==='recording'&&this.context.state!=='running')this.interrupt('Audio playback was suspended. Keep this page open and retry.');
    if(this.state==='recording'&&this.now()-this.metadata.playbackStartedMs>(this.buffer.duration+10)*1000)this.interrupt('Audio playback did not finish normally. This take is incomplete.');
  }
  audioEnded(){
    if(this.state!=='recording'||this.stopping)return;
    if(this.context.state!=='running'||this.context.currentTime-this.audioStartContext<this.buffer.duration-.08){this.interrupt('The lesson audio ended too early. Please retry.');return;}
    this.metadata.playbackEndedMs=this.now();this.metadata.completed=true;
    this.change('finishing');
    // Retain an acoustic/capture tail, then wait for the recorder's final chunk and stop event.
    this.later(()=>this.stopRecorder(),400);
  }
  interrupt(message){
    if(['review','disposed','error'].includes(this.state))return;
    this.metadata.interrupted=true;this.metadata.completed=false;this.metadata.interruptions.push(String(message).slice(0,160));
    this.cancelTimers();this.stopRecorder();
  }
  stopRecorder(){
    if(this.stopping)return;this.stopping=true;this.cancelTimers();
    if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();}
    if(this.recorder)this.metadata.recordingStoppedMs=this.now();
    if(this.recorder&&(this.recorder.state!=='inactive'||this.recorderFailed)){
      // Browser errors inactivate the recorder before its final dataavailable and stop events.
      this.change('finalizing');if(this.recorder.state!=='inactive')this.recorder.stop();
      this.later(()=>{if(this.state==='finalizing'){this.metadata.completed=false;this.metadata.interrupted=true;this.metadata.interruptions.push('Recorder finalization timed out; file may be incomplete.');this.finalize();}},10000);
    }else if(this.chunks.length)this.finalize();
    else{this.release();this.change('error',{message:this.recorder?(this.metadata.interruptions.at(-1)||'No recording was captured.'):'No take was recorded. '+(this.metadata.interruptions.at(-1)||'Preparation was cancelled.')});}
  }
  finalize(){
    if(['review','disposed'].includes(this.state))return;
    this.cancelTimers();
    this.take=new Blob(this.chunks,{type:this.recorder?.mimeType||this.metadata.mimeType||this.chunks[0]?.type||'application/octet-stream'});
    this.metadata.mimeType=this.take.type;this.release();
    this.change(this.take.size?'review':'error',{message:this.take.size?'':'No video was captured. Please retry.',blob:this.take,metadata:this.metadata});
  }
  release(){for(const track of this.stream.getTracks()){track.removeEventListener('ended',this.trackEnded);track.stop();}}
  dispose(){
    if(!['ready','review','error'].includes(this.state))this.interrupt('Recording was cancelled.');
    this.cancelTimers();this.release();if(this.source)this.source.onended=null;this.change('disposed');
  }
}

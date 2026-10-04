import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {ALIGNMENT_VERSION} from '../public/practice/audio-alignment.mjs';
import {CONTACT_VERSION} from '../public/practice/local-contacts.mjs';
import {refreshCachedAnalysis} from '../public/practice/local-engine.mjs';
const source=readFileSync(new URL('../public/practice/app.js',import.meta.url),'utf8');
const flow=source.slice(source.indexOf('async function openLocalComparison('),source.indexOf('async function openOwnerSync('));
function fixture({owner=false,lesson='marching',cached=false,alignmentVersion=ALIGNMENT_VERSION,verified=true,manual=false,align=async()=>({version:ALIGNMENT_VERSION,verified:true,offset:-.246}),analysis=async()=>({frames:377,events:[]})}={}){
  const elements=new Map(),events=[];
  const record={id:'local-test',lesson:{id:lesson,reference_audio_offset:.573,audio_duration:12},offset:-.283,audioAlignment:{version:alignmentVersion,verified},settings:{offset:-.283,start:4,end:5},samples:[],analysis:cached?{detectorVersion:CONTACT_VERSION,detectorProfile:lesson==='2step'?'two-step-xy':'marching',frames:377,events:[]}:null};
  if(manual)record.manualSync={offset:-.281,signature:'saved-owner-confirmation'};
  const context={CONTACT_VERSION,refreshCachedAnalysis,busy:false,localRecord:null,localAbort:null,jobId:null,demo:false,AbortController,
    syncPermission:Promise.resolve(),canAdjustSync:owner,showDebugUpload(){},
    document:{createElement:()=>({})},$:(id)=>{if(!elements.has(id))elements.set(id,{after(){}});return elements.get(id);},
    waitingMusic:{begin(){events.push('music');},end(){events.push('stop');}},
    setBusy:value=>{context.busy=value;},setReady(){},status(){},getLocalTake:async()=>record,
    mediaURLs:new Map(),URL:{createObjectURL:()=> 'blob:video',revokeObjectURL(){}},ref:{},stu:{},
    loadVideo:async()=>{},ALIGNMENT_VERSION,saveLocalTake:async()=>{events.push('save');},
    bounds:{start:0,end:12},interval:null,setAudio(){},updateWindow(){},seek:async()=>{},
    api:async()=>({verified:true}),alignRecordedAudio:async(...args)=>{events.push('align');return align(...args);},
    analyzeOnDevice:async(...args)=>{events.push('analysis');return analysis(...args);},
    loadResult:async()=>{events.push('result');},localJob:()=>({}),activeSyncJob:null,openOwnerSync:async()=>{}};
  vm.runInNewContext(flow,context);
  return {context,elements,events,record,run:()=>context.openLocalComparison('local-test')};
}
for(const lesson of ['marching','2step'])test(`${lesson} starts music for analysis and stops before showing results`,async()=>{
  const {events,run}=fixture({lesson});await run();
  assert.ok(events.indexOf('music')>=0);assert.ok(events.indexOf('music')<events.indexOf('analysis'));
  assert.ok(events.indexOf('stop')>events.indexOf('analysis'));assert.ok(events.indexOf('stop')<events.indexOf('result'));
});
for(const lesson of ['marching','2step'])test(`${lesson} automatically synchronizes a legacy take without rerunning cached step detection`,async()=>{
 const {events,record,run}=fixture({lesson,cached:true,alignmentVersion:1});await run();
 assert.ok(events.includes('align'));assert.equal(events.includes('analysis'),false);
 assert.equal(record.offset,-.246);assert.equal(record.settings.offset,-.246);
 assert.equal('start' in record.settings,false);assert.equal('end' in record.settings,false);
 assert.ok(events.indexOf('save')<events.indexOf('result'));
});
test('saved owner-confirmed alignment takes priority over automatic alignment',async()=>{
 const {events,record,run}=fixture({owner:true,cached:true,alignmentVersion:1,manual:true});await run();
 assert.equal(events.includes('align'),false);assert.equal(record.offset,-.281);
});
test('a regular user cannot reuse an owner-only manual sync record',async()=>{
 const {events,record,run}=fixture({cached:true,alignmentVersion:1,manual:true});await run();
 assert.ok(events.includes('align'));assert.equal(record.offset,-.246);
});
test('an uncertain dance match stops before scoring and offers a retake instead of the same retry loop',async()=>{
 const {events,record,elements,run,context}=fixture({alignmentVersion:1,align:async()=>({version:ALIGNMENT_VERSION,verified:false,recovery:'retake',reason:'Different offsets at the ending.'})});await run();
 assert.equal(record.offset,-.283);
 assert.equal(events.includes('analysis'),false);assert.equal(events.includes('result'),false);
 assert.equal(elements.get('localRetry').hidden,true);
 assert.equal(elements.get('practiceActions').hidden,false);
 assert.equal(elements.get('comparison')?.hidden,true);
 assert.equal(elements.get('recordAgain').textContent,'Record another take');
 assert.equal(elements.get('recordAgain').href,'/practice/#lesson=marching&action=record');
 assert.equal(elements.get('chooseAnother').textContent,'Choose another recording');
 assert.equal(elements.get('timingResult').hidden,true);assert.equal(context.busy,false);
 assert.ok(events.includes('stop'));
});
test('retaking a failed challenge preserves its challenge link',async()=>{
 const {record,elements,run}=fixture({align:async()=>({version:ALIGNMENT_VERSION,verified:false,recovery:'retake'})});
 record.audioAlignment.verified=false;record.challenge={id:'a'.repeat(32)};
 await run();
 assert.equal(elements.get('recordAgain')?.href,'/practice/?challenge='+record.challenge.id+'#lesson=marching&action=record');
 assert.equal(elements.get('chooseAnother')?.hidden,true);
});
test('a decoder failure still offers retry rather than treating the recording as bad',async()=>{
 const {events,elements,run}=fixture({verified:false,align:async()=>{throw Error('Audio decoder unavailable');}});
 await run();assert.equal(elements.get('localRetry').hidden,false);
 assert.equal(events.includes('analysis'),false);
});
test('retry rechecks a failed current-version match and analyzes only after success',async()=>{
 let attempts=0;
 const {events,record,elements,run}=fixture({verified:false,align:async()=>({version:ALIGNMENT_VERSION,verified:++attempts>1,offset:.123})});
 await run();assert.equal(attempts,1);assert.equal(events.includes('analysis'),false);
 await elements.get('localRetry').onclick();
 assert.equal(attempts,2);assert.equal(record.offset,.123);
 assert.ok(events.lastIndexOf('align')<events.indexOf('analysis'));
 assert.ok(events.includes('result'));
});
test('failed alignment with cached analysis does not show a scored comparison',async()=>{
 const {events,run}=fixture({cached:true,verified:false,align:async()=>({version:ALIGNMENT_VERSION,verified:false})});
 await run();assert.ok(events.includes('align'));assert.equal(events.includes('result'),false);
});
test('cancelling audio decoding cannot cache a failed match or start step analysis',async()=>{
 let finish;const {events,record,run,elements}=fixture({alignmentVersion:1,align:()=>new Promise(resolve=>finish=resolve)});
 const pending=run();await new Promise(setImmediate);elements.get('localCancel').onclick();
 finish({version:ALIGNMENT_VERSION,verified:true,offset:-.246});await pending;
 assert.equal(events.includes('save'),false);assert.equal(events.includes('analysis'),false);assert.equal(events.includes('result'),false);
 assert.equal(record.offset,-.283);
});
test('opening a completed take never starts waiting music',async()=>{
  const {events,run}=fixture({cached:true});await run();assert.equal(events.includes('music'),false);assert.equal(events.includes('analysis'),false);
});
test('analysis failure always ends waiting music',async()=>{
  const {events,run,context}=fixture({analysis:async()=>{throw Error('screen locked');}});await run();
  assert.ok(events.indexOf('stop')>events.indexOf('music'));assert.equal(context.busy,false);assert.equal(events.includes('result'),false);
});
test('Cancel stops waiting music immediately even if analysis is still finishing a frame',async()=>{
  let finish;const {events,run,elements}=fixture({analysis:()=>new Promise(resolve=>finish=resolve)});
  const pending=run();await new Promise(setImmediate);elements.get('localCancel').onclick();
  assert.ok(events.includes('stop'));finish({frames:377,events:[]});await pending;
  assert.equal(events.includes('result'),false);
});

test('old cached detector results are recomputed before showing the comparison',async()=>{
 const {record,events,run}=fixture({cached:true});delete record.analysis.detectorVersion;
 await run();assert.ok(events.includes('analysis'));assert.ok(events.indexOf('analysis')<events.indexOf('result'));
});

test('detector changes reuse saved tracking without video inference',async()=>{
 const {record,events,run}=fixture({cached:true});
 record.analysis.detectorVersion=0;
 record.analysis.tracking={version:1,rows:[{time:0,points:{}}]};
 await run();assert.equal(events.includes('analysis'),false);
 assert.equal(record.analysis.detectorVersion,CONTACT_VERSION);
 assert.ok(events.includes('save'));assert.ok(events.includes('result'));
});

test('outdated cache starts waiting music before full reanalysis',async()=>{
 const {record,events,run}=fixture({cached:true});
 record.analysis.detectorVersion=0;
 await run();
 assert.ok(events.indexOf('music')>=0);
 assert.ok(events.indexOf('music')<events.indexOf('analysis'));
 assert.equal(events.filter(e=>e==='music').length,1);
 assert.ok(events.indexOf('stop')>events.indexOf('analysis'));
});

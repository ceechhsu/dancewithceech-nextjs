import {VIDEO_TIMELINE_VERSION} from './local-video.mjs';
const DB='dance-local-comparisons',STORE='takes';
const mediaBytes=new WeakMap();
// Persist bytes rather than browser-managed Blob backing files. Rebuild a fresh
// Blob on read, while retaining compatibility with existing saved comparisons.
export async function packLocalTake(record){
 const packed={...record};
 for(const [blobKey,mediaKey] of [['studentBlob','studentMedia'],['referenceBlob','referenceMedia']]){
  const blob=record[blobKey];if(!blob)continue;
  let bytes=mediaBytes.get(blob);
  if(!bytes){
   try{bytes=await blob.arrayBuffer();}
   catch(cause){throw new Error('This browser could not read the saved recording. Keep your downloaded backup and choose it again.',{cause});}
   if(bytes.byteLength!==blob.size)throw new Error('This browser read an incomplete recording. Keep your downloaded backup and choose it again.');
   mediaBytes.set(blob,bytes);
  }
  packed[mediaKey]={bytes,type:blob.type};delete packed[blobKey];
 }
 return packed;
}
export function unpackLocalTake(packed){
 if(!packed)return packed;
 const record={...packed};
 for(const [blobKey,mediaKey] of [['studentBlob','studentMedia'],['referenceBlob','referenceMedia']]){
  const media=packed[mediaKey];if(!media)continue;
  if(!(media.bytes instanceof ArrayBuffer))throw new Error('This saved recording could not be read. Keep your downloaded backup and choose it again.');
  const blob=new Blob([media.bytes],{type:media.type||''});mediaBytes.set(blob,media.bytes);
  record[blobKey]=blob;delete record[mediaKey];
 }
 return record;
}
function open(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Local storage is unavailable. Your recording is still here; download it before leaving.'));});}
async function transaction(mode,action){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const request=action(tx.objectStore(STORE));tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(Error('Could not save this take on your device. Free some storage or download your recording.'));});}finally{db.close();}}
export const saveLocalTake=async record=>{const packed=await packLocalTake(record);return transaction('readwrite',store=>store.put(packed));};
export const getLocalTake=async id=>unpackLocalTake(await transaction('readonly',store=>store.get(id)));
export const deleteLocalTake=id=>transaction('readwrite',store=>store.delete(id));

export async function listLocalTakes(){
 const db=await open();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).openCursor(),items=[];
  request.onsuccess=()=>{const cursor=request.result;if(cursor){const r=cursor.value;items.push({id:r.id,createdAt:r.createdAt,title:r.lesson.title,analyzed:!!r.analysis});cursor.continue();}};
  tx.oncomplete=()=>resolve(items.sort((a,b)=>b.createdAt-a.createdAt));tx.onerror=()=>reject(Error('Saved comparisons could not be read.'));
 });}finally{db.close();}
}

// Content hashes identify bytes, not filenames; all evidence stays in this browser.
export async function videoFingerprint(blob){
 const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
export function reusableEvidence(saved,record){
 const result={};
 if(saved.analysis)result.analysis=saved.analysis;
 // Reused tracking must keep the same verified frame clock. IndexedDB evidence
 // is local to this browser; reuseLocalEvidence requires an identical video hash.
 if(saved.videoTimeline?.version===VIDEO_TIMELINE_VERSION&&saved.samples?.length){
  result.videoTimeline=saved.videoTimeline;result.samples=saved.samples;result.duration=saved.duration;
 }
 // Alignment depends on both soundtracks. Never carry owner signatures or settings
 // into a new comparison, or reuse sync against a changed reference.
 if(saved.referenceHash===record.referenceHash&&saved.lesson?.id===record.lesson?.id&&saved.lesson?.version===record.lesson?.version&&saved.audioAlignment?.verified){
  result.audioAlignment=saved.audioAlignment;result.offset=saved.audioAlignment.offset;
 }
 return result;
}
export async function reuseLocalEvidence(record){
 const keys=await transaction('readonly',store=>store.getAllKeys());
 let match=null;
 for(const key of keys){
  const saved=await getLocalTake(key);if(!saved||saved.id===record.id)continue;
  let same=!!record.videoHash&&saved.videoHash===record.videoHash;
  if(!same&&saved.studentBlob?.size===record.studentBlob.size){
   if(!saved.videoHash){saved.videoHash=await videoFingerprint(saved.studentBlob);await saveLocalTake(saved);}
   same=saved.videoHash===record.videoHash;
  }
  if(same&&(!match||((saved.analysis?.tracking?.version??0)>(match.analysis?.tracking?.version??0))||((saved.analysis?.tracking?.version??0)===(match.analysis?.tracking?.version??0)&&(saved.analysis?.detectorVersion??0)>(match.analysis?.detectorVersion??0))))match=saved;
 }
 return match?{...record,...reusableEvidence(match,record)}:record;
}

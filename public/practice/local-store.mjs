const DB='dance-local-comparisons',STORE='takes';
function open(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Local storage is unavailable. Your recording is still here; download it before leaving.'));});}
async function transaction(mode,action){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const request=action(tx.objectStore(STORE));tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(Error('Could not save this take on your device. Free some storage or download your recording.'));});}finally{db.close();}}
export const saveLocalTake=record=>transaction('readwrite',store=>store.put(record));
export const getLocalTake=id=>transaction('readonly',store=>store.get(id));
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

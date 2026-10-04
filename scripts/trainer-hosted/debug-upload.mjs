const receiver='https://test.dancewithceech.com/api/owner-debug-transfer';
export function debugPayload(record){
 const metadata=JSON.stringify({comparison:record.id,lesson:record.lesson,recording:record.metadata,
  offset:record.offset,audioAlignment:record.audioAlignment,manualSync:record.manualSync,
  duration:record.duration,referenceVersion:record.reference?.version,
  analysis:record.analysis?{frames:record.analysis.frames,events:record.analysis.events,detectorVersion:record.analysis.detectorVersion,analysisMs:record.analysis.analysisMs}:null});
 const bytes=new TextEncoder().encode(metadata),prefix=new Uint8Array(4);
 if(bytes.length>65536||!record.studentBlob||record.studentBlob.size>90*1024*1024)throw Error('Choose a recording under 90 MB with valid analysis details.');
 new DataView(prefix.buffer).setUint32(0,bytes.length);
 return new Blob([prefix,bytes,record.studentBlob],{type:'application/octet-stream'});
}
export async function authorizeDebugUpload(record,send=fetch){
 const body=debugPayload(record),digest=await crypto.subtle.digest('SHA-256',await body.arrayBuffer());
 const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const response=await send('/practice/api/debug-transfer',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({length:body.size,sha256})});
 const grant=await response.json();
 if(!response.ok)throw Error(grant.error||'Please sign in again, then retry.');
 if(grant.url!==receiver||typeof grant.token!=='string'||!grant.token)throw Error('The debugging upload destination could not be verified.');
 return {body,grant};
}
export function showDebugUpload(record,owner){
 let panel=document.getElementById('debugUpload');
 if(!owner){if(panel)panel.hidden=true;return;}
 if(!panel){
  panel=document.createElement('section');panel.id='debugUpload';panel.className='notes';
  panel.innerHTML='<h2>Owner debugging</h2><p>Send this recording and its analysis details directly to your Mac. Your Mac must be awake and the test server running.</p><button type="button" class="secondary" id="sendDebugRecording">Send recording for debugging</button><progress id="debugUploadProgress" max="100" hidden></progress><p id="debugUploadStatus" role="status" aria-live="polite"></p>';
  document.getElementById('statusHome').after(panel);
 }
 panel.hidden=false;
 const button=document.getElementById('sendDebugRecording'),progress=document.getElementById('debugUploadProgress'),status=document.getElementById('debugUploadStatus');
 button.onclick=async()=>{
  if(button.disabled)return;
  button.disabled=true;progress.hidden=false;progress.value=0;status.textContent='Preparing your recording for secure transfer…';
  const failed=message=>{button.disabled=false;progress.hidden=true;status.textContent=message;};
  try{
   const {body,grant}=await authorizeDebugUpload(record);
   const request=new XMLHttpRequest();request.open('POST',grant.url);
   request.timeout=240000;request.setRequestHeader('Content-Type','application/octet-stream');request.setRequestHeader('Authorization','Bearer '+grant.token);
   request.upload.onprogress=event=>{if(event.lengthComputable){progress.value=event.loaded/event.total*100;status.textContent=progress.value>=100?'Upload sent. Waiting for confirmation…':`Uploading to your Mac… ${Math.round(progress.value)}%`;}};
   request.onload=()=>{
    let result;try{result=JSON.parse(request.responseText);}catch{}
    if(request.status===201&&result?.id){progress.hidden=true;status.textContent=`Sent successfully. Debug ID: ${result.id}. Tell me it is sent so I can inspect it.`;button.textContent='Recording sent';}
    else failed(result?.error||'Upload failed. Your recording is still on this device. Try again.');
   };
   request.onerror=request.ontimeout=()=>failed('Could not reach your Mac. Make sure it is awake and the test server is running, then retry. Your recording is still on this device.');
   request.send(body);
  }catch(error){failed(error.message||'Upload could not start. Your recording is still on this device. Try again.');}
 };
}

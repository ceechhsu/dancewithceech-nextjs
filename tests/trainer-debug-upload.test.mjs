import test from 'node:test';import assert from 'node:assert/strict';
import * as debug from '../public/practice/debug-upload.mjs';
test('hosted debug upload keeps the legacy diagnostic envelope and requests a bound authorization',async()=>{
 assert.equal(typeof debug.authorizeDebugUpload,'function');
 const record={id:'local-test',lesson:{id:'2step'},studentBlob:new Blob([new Uint8Array([0,0,0,8,102,116,121,112])]),analysis:{frames:16,events:[{time:1,foot:'right'}]},duration:12};
 let sent;
 const {body,grant}=await debug.authorizeDebugUpload(record,async(url,options)=>{sent={url,options};return Response.json({url:'https://test.dancewithceech.com/api/owner-debug-transfer',token:'signed'})});
 assert.equal(sent.url,'/practice/api/debug-transfer');assert.equal(sent.options.credentials,'same-origin');
 const data=JSON.parse(sent.options.body);assert.equal(data.length,body.size);assert.match(data.sha256,/^[a-f0-9]{64}$/);assert.equal(grant.token,'signed');
 const bytes=await body.arrayBuffer(),size=new DataView(bytes).getUint32(0),metadata=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,4,size)));
 assert.equal(metadata.comparison,'local-test');assert.deepEqual(metadata.analysis.events,record.analysis.events);
 await assert.rejects(debug.authorizeDebugUpload(record,async()=>Response.json({error:'Owner required'},{status:403})),/Owner required/);
 await assert.rejects(debug.authorizeDebugUpload(record,async()=>Response.json({url:'https://untrusted.example',token:'x'})),/destination/);
})
test('debug transfer reports an unreadable saved file before requesting an upload grant',async()=>{
 let requested=false;
 const record={studentBlob:{size:8,arrayBuffer:async()=>{throw new DOMException('The object can not be found here.','NotFoundError');}}};
 await assert.rejects(()=>debug.authorizeDebugUpload(record,async()=>{requested=true;return Response.json({url:'https://test.dancewithceech.com/api/owner-debug-transfer',token:'signed'});}),/could not read.*saved recording/i);
 assert.equal(requested,false);
});

test('owner debugging includes a bounded final-foot tracking window without changing video bytes',async()=>{
 const rows=Array.from({length:1000},(_,i)=>({time:i/30,poses:1,blur:{left:100,right:120},points:Object.fromEntries([11,23,24,27,28,29,30,31,32].map(k=>[k,{x:.123456789,y:.765432123,visibility:.987654321}]))}));
 const record={studentBlob:new Blob(['original video']),videoTimeline:{version:3,clockOffset:-.046666667},analysis:{frames:rows.length,events:[],tracking:{version:1,rows}}};
 const b=await debug.debugPayload(record).arrayBuffer(),length=new DataView(b).getUint32(0),data=JSON.parse(new TextDecoder().decode(new Uint8Array(b,4,length)));
 assert.deepEqual(data.videoTimeline,record.videoTimeline);
 const window=data.analysis.trackingWindow;assert.ok(window,'iPad-specific pose jitter must be available for the final-step diagnosis');
 assert.deepEqual(window.pointIds,[23,24,27,28,29,30,31,32]);assert.equal(window.version,1);assert.ok(window.rows.length<=96&&window.rows.length>1);
 assert.ok(window.rows[0][0]>=rows.at(-1).time-3.000001);assert.equal(window.rows.at(-1)[0],33.3);
 assert.deepEqual(window.rows.at(-1).slice(4,8),[.123457,.765432,.987654,null],'missing presence remains missing rather than becoming zero confidence');
 assert.ok(length<=65536);assert.equal(new TextDecoder().decode(new Uint8Array(b,4+length)),'original video');
});

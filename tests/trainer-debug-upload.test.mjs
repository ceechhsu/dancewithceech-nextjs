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

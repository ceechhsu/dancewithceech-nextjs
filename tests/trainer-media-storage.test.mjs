import test from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../public/practice/local-store.mjs';

test('saved media stores independent bytes and reconstructs exact playable Blobs after cloning',async()=>{
 assert.equal(typeof store.packLocalTake,'function');
 const student=new Uint8Array([0,1,2,255]),reference=new Uint8Array([8,7,6]);
 const record={id:'test',lesson:{title:'Marching'},studentBlob:new Blob([student],{type:'video/mp4'}),referenceBlob:new Blob([reference],{type:'video/mp4'}),offset:.1};
 const packed=await store.packLocalTake(record);
 assert.equal(packed.studentBlob,undefined);assert.equal(packed.referenceBlob,undefined);
 assert.ok(packed.studentMedia.bytes instanceof ArrayBuffer);
 assert.equal(packed.studentMedia.type,'video/mp4');
 const restored=store.unpackLocalTake(structuredClone(packed));
 assert.deepEqual(new Uint8Array(await restored.studentBlob.arrayBuffer()),student);
 assert.deepEqual(new Uint8Array(await restored.referenceBlob.arrayBuffer()),reference);
 assert.equal(restored.offset,record.offset);assert.equal(restored.studentBlob.type,'video/mp4');
 assert.ok(record.studentBlob instanceof Blob,'packing must not replace the live recording');
});
test('legacy Blob records stay readable and can be saved into the byte storage format',async()=>{
 assert.equal(typeof store.unpackLocalTake,'function');
 const legacy={id:'old',studentBlob:new Blob(['saved recording'])};
 const restored=store.unpackLocalTake(legacy);
 assert.equal(await restored.studentBlob.text(),'saved recording');
 const packed=await store.packLocalTake(restored);
 assert.equal(packed.studentBlob,undefined);
 assert.equal(new TextDecoder().decode(packed.studentMedia.bytes),'saved recording');
});
test('an unreadable or partial legacy recording is rejected before any replacement is saved',async()=>{
 assert.equal(typeof store.packLocalTake,'function');
 const missing={size:4,type:'video/mp4',arrayBuffer:async()=>{throw new DOMException('The object can not be found here.','NotFoundError');}};
 await assert.rejects(()=>store.packLocalTake({id:'missing',studentBlob:missing}),/could not read.*recording/i);
 const partial={size:4,type:'video/mp4',arrayBuffer:async()=>new ArrayBuffer(2)};
 await assert.rejects(()=>store.packLocalTake({id:'partial',studentBlob:partial}),/incomplete|read/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/practice/trainer.js',import.meta.url),'utf8');

test('Compare works again after browser Back restores the recorded take',async()=>{
 const pageshow=source.match(/window\.addEventListener\('pageshow',[\s\S]*?\n\}\);/)?.[0];
 assert.ok(pageshow,'a cached return must restore the submit controls');
 const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,{disabled:false,textContent:'',pause(){}});return elements.get(id);};
 const listeners={},navigations=[],saved=[];
 const prepared={blob:new Blob(['same recording']),samples:[],duration:12};
 const context={$,window:{addEventListener:(name,fn)=>listeners[name]=fn,location:{assign:url=>navigations.push(url)}},submitting:false,navigating:false,galleryPreparing:false,currentScreen:'take',take:prepared.blob,pending:{prepared},takeMetadata:{source:'manual-upload'},lesson:{id:'marching',reference_audio_offset:.573},acceptedChallenge:null,navigation:{open(){}},prepareLesson:async()=>({referenceBlob:new Blob(['reference']),reference:{}}),marchingTimingDefault:()=>null,crypto:{randomUUID:()=>String(saved.length)},videoFingerprint:async()=> 'same-bytes',reuseLocalEvidence:async record=>record,saveLocalTake:async record=>saved.push(record)};
 vm.createContext(context);
 const setSubmitting=source.match(/function setSubmitting\(value\)\{[^\n]+\}/)[0];
 const submit=source.slice(source.indexOf("$('submitTake').onclick="),source.indexOf("$('retry').onclick="));
 vm.runInContext(setSubmitting+'\n'+pageshow+'\n'+submit,context);
 await $('submitTake').onclick();
 assert.equal(navigations.length,1);assert.equal($('submitTake').disabled,true);
 listeners.pageshow({persisted:false});assert.equal(context.submitting,true,'initial page-show must not interrupt submission');
 listeners.pageshow({persisted:true});
 assert.equal(context.navigating,false);assert.equal($('submitTake').disabled,false);
 assert.equal(context.pending.prepared,prepared);assert.equal(context.take,prepared.blob);
 await $('submitTake').onclick();
 assert.equal(navigations.length,2);assert.equal(saved[1].studentBlob,prepared.blob);
});

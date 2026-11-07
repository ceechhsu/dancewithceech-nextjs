import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/practice/app.js',import.meta.url),'utf8');
const draw=source.slice(source.indexOf('function drawWaveforms(){'),source.indexOf("$('waveformView').onchange=drawWaveforms;"));
test('waveform pulses stay audio-aligned when the video browser clock starts earlier than the file clock',()=>{
 const shift=-.043333333,lines=[],elements=new Map();
 const envelope=(pulse,clockOffset)=>({duration:1,hop:1,sampleRate:10,peak:1,lo:Array(10).fill(0),hi:Array.from({length:10},(_,i)=>i===pulse?1:0),clockOffset});
 const $=id=>{if(!elements.has(id)){
  const ctx={fillRect(){},fillText(){},beginPath(){},moveTo(){},stroke(){},lineTo(x,y){lines.push({id,color:this.strokeStyle,x,y});}};
  elements.set(id,{width:1200,value:'all',checked:false,getContext:()=>ctx});
 }return elements.get(id);};
 const c={waveformData:{envelopes:[envelope(4,0),envelope(6,shift)],start:0},estimate:.2+shift,offset:.2+shift,$,updateSyncPlayhead(){}};
 vm.createContext(c);vm.runInContext(draw+';drawWaveforms();',c);
 const ref=lines.find(l=>l.id==='waveformCanvas'&&l.color==='#bce7b1'&&l.y===22);
 const student=lines.find(l=>l.id==='waveformCanvas'&&l.color==='#c5b9ed'&&l.y===137);
 assert.ok(ref&&student);
 assert.ok(Math.abs(ref.x-student.x)<1e-7,'video clock normalization must not move the aligned audio pulse');
});

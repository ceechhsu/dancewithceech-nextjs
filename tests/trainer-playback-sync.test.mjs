import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../public/practice/app.js',import.meta.url),'utf8');
const drift=app.slice(app.indexOf('function correctDrift('),app.indexOf('function tick()'));
const position=app.match(/function playbackPosition\(\)\{[\s\S]*?\n\}/)?.[0];
function fixture(audio='reference'){
 const controls={speed:{value:1},audio:{value:audio},play:{textContent:''},controlError:{textContent:''}};
 const context={ref:{currentTime:5,duration:12.55,ended:false,seeking:false,playbackRate:1},stu:{currentTime:4.85,duration:12.4,ended:false,seeking:false,playbackRate:1},offset:-.55,lastDriftSeek:0,$:id=>controls[id],Date:{now:()=>10000}};
 vm.createContext(context);vm.runInContext(drift+(position?'\n'+position:''),context);return context;
}
test('drift correction keeps the audible reference at steady speed and seeks the muted take',()=>{
 const c=fixture();vm.runInContext('correctDrift(5)',c);
 assert.equal(c.ref.currentTime,5);assert.equal(c.ref.playbackRate,1);
 assert.equal(c.stu.currentTime,4.45);assert.equal(c.stu.playbackRate,1);
 assert.ok(position,'the audible track must drive the shared playback clock');
 assert.equal(vm.runInContext('playbackPosition()',c),5);
 c.stu.currentTime=4.5;vm.runInContext('correctDrift(5)',c);assert.equal(c.stu.currentTime,4.5,'do not seek repeatedly for a small difference');
});
test('selecting student audio makes that video the stable master; a finished master retains the tail',()=>{
 const c=fixture('student');c.ref.currentTime=4;vm.runInContext('correctDrift(5.25)',c);
 assert.equal(c.ref.currentTime,5.25);assert.equal(c.stu.currentTime,4.85);
 assert.ok(position);assert.ok(Math.abs(vm.runInContext('playbackPosition()',c)-5.4)<1e-9);
 c.stu.ended=true;c.ref.currentTime=6;assert.equal(vm.runInContext('playbackPosition()',c),6);
});

test('Play gives both decoders a startup grace period before applying drift seeks',async()=>{
 const play=app.slice(app.indexOf('async function play()'),app.indexOf('function stepReviewFrame'));
 const c=fixture();Object.assign(c,{ready:true,playing:false,current:0,interval:{start:0,end:12},seek:async()=>{},playbackIntent:{begin:()=>1,isCurrent:()=>true},document:{hidden:false},pause(){}});
 for(const v of [c.ref,c.stu])v.play=async()=>{};
 vm.runInContext(play,c);await vm.runInContext('play()',c);
 assert.equal(c.lastDriftSeek,10000,'startup decoding latency must not trigger a cycle of corrective seeks');
});

test('normal decoder startup skew does not create a repeating seek-and-stall cycle',()=>{
 const c=fixture();c.stu.currentTime=4.55;vm.runInContext('correctDrift(5)',c);
 assert.equal(c.stu.currentTime,4.55);assert.equal(c.ref.currentTime,5);
});

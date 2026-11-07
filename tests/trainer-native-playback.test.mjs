import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../public/practice/',import.meta.url);
const app=fs.readFileSync(new URL('app.js',root),'utf8');
const html=fs.readFileSync(new URL('compare.html',root),'utf8');
const css=fs.readFileSync(new URL('style.css',root),'utf8');
const declaration=app.slice(app.indexOf('function drawVideo('),app.indexOf('function drawReferenceBeatLabels'));

function renderer(values={}){
 const controls={view:{value:'side'},scale:{value:100},x:{value:0},y:{value:0},opacity:{value:50},mirrorReference:{checked:false},mirrorStudent:{checked:false},...values};
 const context={$:id=>controls[id],ctx:{save(){},beginPath(){},rect(){},clip(){},translate(){},scale(){},restore(){},drawImage(){throw Error('Copying video frames into canvas stalls Safari playback');}},location:{search:''},performance:{now:()=>0}};
 vm.createContext(context);vm.runInContext(declaration,context);
 return (video,area,ghost)=>{context.video=video;context.area=area;context.ghost=ghost;return vm.runInContext('drawVideo(video,area,ghost)',context);};
}

test('side-by-side playback uses visible native video without copying decoded frames',()=>{
 const draw=renderer();const video={readyState:4,videoWidth:1080,videoHeight:1920,style:{},dataset:{}};
 const rect=draw(video,{x:480,w:480,h:720},false);
 assert.equal(rect.left,517.5);assert.equal(rect.width,405);assert.equal(rect.height,720);
 assert.equal(video.style.opacity,'1');
 assert.match(html,/<div[^>]*id="nativeVideos"/);
 assert.match(html,/<div[^>]*class="[^"]*reference-slot[^"]*"[^>]*>\s*<video[^>]*id="referenceVideo"/);
 assert.match(html,/<div[^>]*class="[^"]*student-slot[^"]*"[^>]*>\s*<video[^>]*id="studentVideo"/);
 assert.match(css,/\.comparison-video\{[^}]*object-fit:contain/);
 assert.equal(app.includes("ctx.fillStyle='#0b100e';ctx.fillRect(0,0,canvas.width,canvas.height)"),false,'overlay must stay transparent above native video');
});

test('native overlay preserves scale, position, opacity, and independent mirrors',()=>{
 const draw=renderer({view:{value:'ghost'},scale:{value:120},x:{value:10},y:{value:-5},opacity:{value:35},mirrorReference:{checked:true}});
 const reference={readyState:4,videoWidth:1080,videoHeight:1920,style:{},dataset:{}};
 const rect=draw(reference,{x:0,w:960,h:720},true);
 assert.equal(reference.style.opacity,'0.35');
 assert.equal(reference.style.transform,'translate(10%, -5%) scale(-1.2, 1.2)');
 for(const [key,value] of Object.entries({width:486,height:864,left:333,top:-108}))assert.ok(Math.abs(rect[key]-value)<1e-9,key);
 const student={...reference,style:{}};draw(student,{x:0,w:960,h:720},false);
 assert.equal(student.style.opacity,'1');assert.equal(student.style.transform,'translate(0%, 0%) scale(1, 1)');
});

test('owner and ordinary views share a fitted 4:3 rectangle for video and beat labels',()=>{
 const declaration=app.match(/function updateVideoViewport\(\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(declaration,'native layers and canvas need one fitted coordinate space');
 assert.match(html,/<div id="videoViewport"[^>]*><div id="nativeVideos"/);
 const stage={clientWidth:900,clientHeight:350},viewport={parentElement:stage,style:{}};
 const c={$:id=>id==='videoViewport'?viewport:null};vm.createContext(c);vm.runInContext(declaration,c);vm.runInContext('updateVideoViewport()',c);
 assert.ok(Math.abs(parseFloat(viewport.style.width)-466.6666666666667)<1e-9);assert.equal(parseFloat(viewport.style.height),350);
 stage.clientWidth=400;stage.clientHeight=300;vm.runInContext('updateVideoViewport()',c);assert.equal(parseFloat(viewport.style.width),400);assert.equal(parseFloat(viewport.style.height),300);
});

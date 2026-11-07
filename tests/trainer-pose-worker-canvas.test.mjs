import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const workerSource=fs.readFileSync(new URL('../public/practice/local-pose-worker.mjs',import.meta.url),'utf8');
const bundle=fs.readFileSync(new URL('../public/practice/trial-assets/vision_bundle.mjs',import.meta.url),'utf8');
const offscreenGate=bundle.slice(bundle.indexOf('function Qo()'),bundle.indexOf('async function ta('));
const createTask=bundle.slice(bundle.indexOf('function cc('),bundle.indexOf('function hc('));
// iOS browsers can have Safari in their UA without the Version token the
// bundled library expects. Exercise that actual library fallback with no DOM.
const userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0.0.0 Mobile/15E148 Safari/604.1';
class Canvas {constructor(width,height){this.width=width;this.height=height;}getContext(type){this.contextType=type;return {};}}
function libraryContext(){return vm.createContext({navigator:{userAgent},OffscreenCanvas:Canvas,aa:async(t,canvas)=>canvas});}
test('bundled iPhone fallback tries to use document when no canvas is supplied',async()=>{
 const context=libraryContext();vm.runInContext(offscreenGate+createTask,context);
 assert.throws(()=>context.cc({}, {}, {}),/document is not defined/);
});
test('pose worker supplies its own canvas and keeps frame-pixel reads separate',async()=>{
 const messages=[];let options;
 const context=libraryContext();
 vm.runInContext(offscreenGate+createTask,context);
 context.self={};context.postMessage=message=>messages.push(message);
 context.runtimeStub={FilesetResolver:{forVisionTasks:async()=>({})},PoseLandmarker:{createFromOptions:async(fileset,input)=>{options=input;await context.cc({},fileset,input);return {};}}};
 vm.runInContext(workerSource.replace("import('./trial-assets/vision_bundle.mjs')",'Promise.resolve(runtimeStub)'),context);
 await context.self.onmessage({data:{type:'init',width:320,height:568}});
 assert.equal(messages[0]?.error,undefined);
 assert.equal(messages[0]?.ready,true);
 assert.ok(options.canvas instanceof Canvas);
 assert.equal(options.canvas.contextType,undefined);
 const frameCanvas=vm.runInContext('canvas',context);
 assert.notStrictEqual(options.canvas,frameCanvas);
 assert.equal(frameCanvas.contextType,'2d');
 assert.equal(options.baseOptions.delegate,'CPU');
 assert.equal(options.runningMode,'VIDEO');
});

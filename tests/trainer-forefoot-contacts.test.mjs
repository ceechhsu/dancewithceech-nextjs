import test from 'node:test';
import assert from 'node:assert/strict';
import {detectLocalContacts} from '../public/practice/local-contacts.mjs';

function clip(mode='landing'){
 return Array.from({length:90},(_,i)=>{
  const time=i/30,u=Math.max(0,Math.min(1,(time-1)/.5));let x=.4,y=.86;
  if(mode==='landing'||mode==='jittered-landing'||mode==='sliding-after-touch'){x=.4-.15*u;y=.86-.06*Math.sin(Math.PI*u);}
  if(mode==='lifting'){x=.4-.15*Math.max(0,(time-1)/2);y=.86-.06*Math.max(0,(time-1)/2);}
  if(mode==='stationary'){x+=.002*Math.sin(i);y+=.002*Math.cos(i);}
  if(mode==='jittered-landing'&&i===46)y-=.0025;
  if(mode==='jittered-landing'&&i===47)y+=.0025;
  if(mode==='sliding-after-touch'&&time>=1.5)x+=Math.min(.15,(time-1.5)*.75);
  const points={23:{x:.4,y:.5,visibility:.99},24:{x:.6,y:.5,visibility:.99}};
  for(const k of [27,29,31])points[k]={x:.75,y:.86,visibility:.99};
  for(const k of [28,30,32])points[k]={x,y:k===32?y:y-.015,visibility:.99};
  // The heel keeps rolling after the front of the foot has settled.
  if(time>=1.5&&time<=1.7)points[30].y=.845+(time-1.5)*.1;
  return {time,poses:1,points,blur:{left:100,right:100}};
 });
}

test('front-foot contact stays at the start of a compact plateau despite landmark jitter and heel roll',()=>{
 const events=detectLocalContacts(clip('jittered-landing'),{lessonId:'marching'});
 assert.equal(events.length,1);assert.equal(events[0].foot,'right');
 assert.ok(Math.abs(events[0].time-1.5)<1e-7,'do not postpone contact for a noisy intermediate point or the moving heel');
 assert.ok(events[0].confidence>.8,'missing optional presence is not zero visibility');
});
test('stationary tracking noise and a foot lifting without landing are not contacts',()=>{
 for(const mode of ['stationary','lifting'])assert.equal(detectLocalContacts(clip(mode),{lessonId:'marching'}).length,0,mode);
});
test('a still-traveling forefoot is not accepted just because its vertical motion stopped',()=>{
 assert.equal(detectLocalContacts(clip('sliding-after-touch'),{lessonId:'marching'}).length,0);
});
test('an explicit low-confidence model field still prevents a contact',()=>{
 for(const field of ['visibility','presence']){
  const rows=clip();for(const row of rows)row.points[32][field]=.2;
  assert.equal(detectLocalContacts(rows,{lessonId:'marching'}).length,0,field);
 }
});
test('a recording ending before the foot can be checked stays unconfirmed',()=>{
 assert.equal(detectLocalContacts(clip().slice(0,47),{lessonId:'marching'}).length,0);
});
test('contact times are independent of musical grids and shift with the recording timeline',()=>{
 const events=detectLocalContacts(clip(),{lessonId:'marching'}),shifted=detectLocalContacts(clip().map(row=>({...row,time:row.time+5})),{lessonId:'marching'});
 assert.equal(events.length,1);assert.equal(shifted.length,1);assert.ok(Math.abs(shifted[0].time-events[0].time-5)<1e-7);
});

test('camera translation of a stationary body is not promoted into a foot landing',()=>{
 const rows=clip('still');
 for(let i=31;i<=43;i++){
  const shift=i===31||i===43?-.05:-.1;
  for(const p of Object.values(rows[i].points))p.y+=shift;
 }
 assert.equal(detectLocalContacts(rows,{lessonId:'marching'}).length,0);
});
test('explicitly uncertain heel or ankle tracking cannot be promoted by a stable toe',()=>{
 for(const k of [28,30]){
  const rows=clip();for(const row of rows)row.points[k].presence=.2;
  assert.ok(detectLocalContacts(rows,{lessonId:'marching'}).every(e=>e.confidence<=.2),String(k));
 }
});

test('a heel hidden during the incoming swing does not delay a clear forefoot landing',()=>{
 const rows=clip();for(const row of rows)if(row.time<1.5)row.points[30].visibility=.6;
 const contacts=detectLocalContacts(rows,{lessonId:'marching'});assert.equal(contacts.length,1);assert.ok(Math.abs(contacts[0].time-1.5)<1e-7);assert.ok(contacts[0].confidence>.8);
});

test('smooth camera translation below the jump threshold is not independent foot travel',()=>{
 const rows=clip('still');
 for(let i=30;i<=45;i++){
  const shift=-.05*Math.sin(Math.PI*(i-30)/15);
  for(const p of Object.values(rows[i].points))p.y+=shift;
 }
 assert.equal(detectLocalContacts(rows,{lessonId:'marching'}).length,0);
});

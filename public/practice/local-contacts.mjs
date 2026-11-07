export const CONTACT_VERSION=6;
// Port of feet-1 + front-foot settling. No teacher markers enter detection.
const feet={left:[27,29,31],right:[28,30,32]};
const finite=a=>a.filter(Number.isFinite);
const quantile=(a,q)=>{a=finite(a).sort((a,b)=>a-b);if(!a.length)return NaN;const x=(a.length-1)*q,i=Math.floor(x);return a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(x-i);};
const min=a=>Math.min(...finite(a));
export function detectLocalContacts(rows,{lessonId}={}){
 const times=rows.map(r=>r.time),n=rows.length,p=(i,k,v='y')=>rows[i].points?.[k]?.[v]??(v==='presence'?rows[i].points?.[k]?.visibility??0:v==='x'||v==='y'?NaN:0);
 if(n>22000||times.some((t,i)=>!Number.isFinite(t)||t<0||t>181||(i&&t<=times[i-1])))throw Error('Invalid frame timestamps.');
 const scale=quantile(rows.map((_,i)=>(p(i,31)+p(i,32)-p(i,23)-p(i,24))/2),.5);
 if(n<5||!Number.isFinite(scale)||scale<.12)return [];
 // Two-Step uses XY settling only: vertical candidates cannot suppress a sideways landing.
 if(lessonId==='2step')return lateralContacts(rows,scale,{stableWindow:true}).filter(e=>e.settled_confirmed&&e.confidence>=.8).sort((a,b)=>a.time-b.time);
 const hip=rows.map((_,i)=>(p(i,23)+p(i,24))/2),hx=rows.map((_,i)=>(p(i,23,'x')+p(i,24,'x'))/2);
 const valid=rows.map((r,i)=>r.poses===1&&[23,24,27,28,29,30,31,32].every(k=>['x','y'].every(v=>p(i,k,v)>.015&&p(i,k,v)<.985)&&p(i,k,'visibility')>=.8&&p(i,k,'presence')>=.8)&&Math.abs(p(i,31,'x')-p(i,32,'x'))>.025&&r.blur.left>=8&&r.blur.right>=8);
 const invalidate=(a,b)=>{for(let j=Math.max(0,a);j<Math.min(n,b);j++)valid[j]=false;};
 // Camera discontinuities apply to every proposal. Foot visibility is checked
 // separately at contact; the heel can be occluded during an incoming swing.
 const trackingValid=rows.map((r,i)=>r.poses===1&&[23,24].every(k=>['x','y'].every(v=>p(i,k,v)>.015&&p(i,k,v)<.985)&&p(i,k,'visibility')>=.8&&p(i,k,'presence')>=.8));
 for(let i=1;i<n;i++)if(times[i]-times[i-1]>.085||Math.abs(hip[i]-hip[i-1])>.08*scale||Math.abs(hx[i]-hx[i-1])>.1*scale){
  invalidate(i-1,i+1);for(let j=i-1;j<=i;j++)trackingValid[j]=false;
 }
 const events=[];
 for(const [foot,keys] of Object.entries(feet)){
  const tip=rows.map((_,i)=>p(i,keys[2]));const height=times.map((t,i)=>{const near=tip.filter((_,j)=>times[j]>=t-.7&&times[j]<=t+.7);return finite(near).length>=4?(quantile(near,.85)-tip[i])/scale:NaN;});
  let flight=null,peak=0,last=-10,rebound=false;
  for(let i=1;i<n-3;i++){
   if(!Number.isFinite(height[i]))continue;
   if(flight===null){if(height[i]>.045||(height[i]>.015&&height[i-1]>.01)){flight=i-1;peak=height[i];rebound=false;}continue;}
   if(i>flight+2&&height[i]>.05&&height[i-1]<=.05)rebound=true;
   peak=Math.max(peak,height[i]);if(height[i]>.027)continue;
   if(!height.slice(i,i+3).every(Number.isFinite)||Math.max(...height.slice(i,i+3))>.05)continue;
   const descending=tip[i]-min(tip.slice(Math.max(flight,i-4),i+1))>.015*scale;
   const support=keys.slice(0,2).every(k=>p(i,k)-min(rows.slice(Math.max(flight,i-5),i+1).map((_,j)=>p(Math.max(flight,i-5)+j,k)))>.015*scale);
   let confidence=min(keys.flatMap(k=>[i,i+1,i+2].flatMap(j=>[p(j,k,'visibility'),p(j,k,'presence')])));
   if(peak<.07||!descending||!support||rebound||times[i]-times[flight]<.09||times[i]-last<.23||!valid.slice(flight,i+3).every(Boolean)||times[i]-times[flight]>1.2){confidence=Math.min(confidence,.6);invalidate(flight-3,i+4);}
   events.push({id:`${foot}-${i}`,time:times[i],foot,confidence:Math.max(0,Math.min(1,confidence)),lower:Math.max(0,times[i-1]-.05),upper:times[i+1]+.05});last=times[i];flight=null;peak=0;
  }
  if(flight!==null)invalidate(flight-3,n);
 }
 for(const e of events){e.candidate_time=e.time;e.settled_confirmed=false;}
 for(const event of lateralContacts(rows,scale)){
  const nearby=events.filter(e=>e.foot===event.foot&&Math.abs(e.time-event.time)<.23);
  if(!nearby.length){events.push(event);continue;}
  // Prefer an earlier independently settled forefoot only when the existing
  // height candidates are weak and began later. Preserve existing settling
  // refinements when the height method already found the same early onset.
  if(event.settled_confirmed&&event.confidence>=.8&&nearby.every(e=>e.confidence<.8&&e.candidate_time>event.time&&e.time>event.time)){
   for(let i=events.length-1;i>=0;i--)if(nearby.includes(events[i]))events.splice(i,1);
   events.push(event);
  }
 }
 return settledMarchingContacts(rows,events,scale,trackingValid);
}
export function pairTrial(events,reference,offset){
 const used=new Set();return reference.map(r=>{const candidates=events.filter(e=>e.foot===r.foot&&!used.has(e.id)&&Math.abs(e.time-r.time-offset)<=.3).sort((a,b)=>Math.abs(a.time-r.time-offset)-Math.abs(b.time-r.time-offset));const e=candidates[0];if(e)used.add(e.id);return {beat:r.beat,reference_time:r.time,event:e??null,delta_ms:e?(e.time-r.time-offset)*1000:null};});
}

// Confirm the first compact forefoot plateau after incoming travel. Small
// point-estimation wobble must not postpone contact until the heel finishes.
function settledMarchingContacts(rows,proposals,scale,trackingValid){
 const events=[],quality=p=>p?Math.min(p.visibility??0,p.presence??p.visibility??0):0;
 for(const proposal of proposals){
  const k=feet[proposal.foot]?.[2];if(k===undefined)continue;
  const point=i=>rows[i]?.points?.[k];
  const readablePoint=(i,key)=>{const p=rows[i]?.points?.[key];return trackingValid[i]&&rows[i]?.poses===1&&quality(p)>=.8&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>.015&&p.x<.985&&p.y>.015&&p.y<.985;};
  const readable=i=>readablePoint(i,k);
  const relative=i=>{const p=point(i),hips=rows[i].points;return {x:p.x-(hips[23].x+hips[24].x)/2,y:p.y-(hips[23].y+hips[24].y)/2};};
  const speed=i=>{const dt=rows[i+1]?.time-rows[i]?.time;if(!readable(i)||!readable(i+1)||!(dt>0&&dt<=.085))return Infinity;const a=relative(i),b=relative(i+1);return Math.hypot(b.x-a.x,b.y-a.y)/(dt*scale);};
  const start=rows.findIndex(r=>r.time>=(proposal.candidate_time??proposal.time)-1e-6);
  for(let i=Math.max(0,start);i<rows.length-2&&rows[i].time-(proposal.candidate_time??proposal.time)<=.18;i++){
   if(!readable(i)||!Number.isFinite(rows[i].blur?.[proposal.foot])||rows[i].blur[proposal.foot]<8)continue;
   let end=i+1;while(end<rows.length-1&&rows[end].time-rows[i].time<.09)end++;
   const duration=rows[end].time-rows[i].time,p=point(i);
   if(end<i+2||duration<.09||duration>.17)continue;
   if(!rows.slice(i,end+1).every((row,j)=>readable(i+j)&&(!j||row.time-rows[i+j-1].time<=.085)&&Math.hypot(point(i+j).x-p.x,point(i+j).y-p.y)<=.04*scale))continue;
   const netSpeed=Math.hypot(point(end).x-p.x,point(end).y-p.y)/(duration*scale);
   if(netSpeed>.45)continue;
   const history=[];for(let j=i-1;j>=0&&rows[i].time-rows[j].time<=.45;j--)if(readable(j))history.push(j);
   const bodyPoint=relative(i),travel=history.length?Math.max(...history.map(j=>Math.hypot(bodyPoint.x-relative(j).x,bodyPoint.y-relative(j).y)/scale)):0;
   const moving=history.filter(j=>Number.isFinite(speed(j))&&speed(j)>.6);
   const lastMotion=moving.length?Math.max(...moving.map(j=>rows[j+1].time)):-Infinity;
   if(travel<.06||moving.length<2||rows[i].time-lastMotion>.17)continue;
   if((bodyPoint.y-Math.min(bodyPoint.y,...history.map(j=>relative(j).y)))/scale<.009)continue;
   events.push({...proposal,time:rows[i].time,settled_confirmed:true,
    confidence:Math.min(...rows.slice(i,end+1).flatMap(row=>feet[proposal.foot].map(key=>quality(row.points?.[key])))),
    lower:rows[Math.max(0,i-1)].time,upper:rows[i+1].time,method:'forefoot_plateau_v1',
    landingEvidence:{travel,lastMotion,plateauDuration:duration,forefootNetSpeed:netSpeed}});break;
  }
 }
 const unique=[];
 for(const event of events.sort((a,b)=>a.time-b.time)){
  const previous=unique.findLast(e=>e.foot===event.foot);
  if(!previous||event.time-previous.time>=.23)unique.push(event);
 }
 return unique;
}

// Detect a moving foot settling at a new screen position. No beat grid is used.
function lateralContacts(rows,scale,{stableWindow=false}={}){
 const events=[];
 for(const [foot,keys] of Object.entries(feet)){
  const key=keys[2],quality=p=>p&&Math.min(p.visibility??0,p.presence??p.visibility??0)>=.8;
  const points=rows.map((r,i)=>{
   const p=r.points?.[key];if(r.poses!==1||!quality(p))return null;
   const near=rows.slice(Math.max(0,i-1),Math.min(rows.length,i+2)).filter(x=>x.poses===1&&Math.abs(x.time-r.time)<=.085).map(x=>x.points?.[key]).filter(quality);
   return {...p,x:quantile(near.map(p=>p.x),.5),y:quantile(near.map(p=>p.y),.5)};
  });
  const speed=i=>{
   const a=points[i],b=points[i+1],dt=rows[i+1]?.time-rows[i]?.time;
   return a&&b&&dt>0&&dt<=.085?Math.hypot(b.x-a.x,b.y-a.y)/(dt*scale):Infinity;
  };
  for(let i=2;i<rows.length-2;i++){
   const p=points[i];if(!p||p.x<=.015||p.x>=.985||p.y<=.015||p.y>=.985||!Number.isFinite(rows[i].blur?.[foot])||rows[i].blur[foot]<8)continue;
   if(speed(i)>.45)continue;
   if(stableWindow){
    // Confirm a compact XY plateau over time, allowing small tracking wobble
    // instead of moving contact late until every single interval looks still.
    let end=i+1;while(end<rows.length-1&&rows[end].time-rows[i].time<.09)end++;
    const duration=rows[end].time-rows[i].time;
    if(end<i+2||duration<.09||duration>.17)continue;
    if(!points.slice(i,end+1).every((q,j)=>q&&Number.isFinite(q.x)&&Number.isFinite(q.y)&&Math.hypot(q.x-p.x,q.y-p.y)<=.04*scale&&(!j||rows[i+j].time-rows[i+j-1].time<=.085)))continue;
    if(Math.hypot(points[end].x-p.x,points[end].y-p.y)/(duration*scale)>.45)continue;
   }else if(speed(i+1)>.45)continue;
   const history=[];for(let j=i-1;j>=0&&rows[i].time-rows[j].time<=.45;j--)if(points[j])history.push(j);
   const moving=history.filter(j=>Number.isFinite(speed(j))&&speed(j)>.6);
   if(moving.length<2||rows[i].time-rows[moving[0]+1].time>.17)continue;
   const lateral=Math.max(0,...history.map(j=>Math.abs(p.x-points[j].x)))/scale;
   // A sliding or sideways closing step can settle without downward travel.
   // Require substantial lateral motion followed by confirmed XY stability;
   // tracking quality, recent motion, blur, and duplicate guards still apply.
   if(lateral<.12)continue;
   if(events.some(e=>e.foot===foot&&rows[i].time-e.time<.23))continue;
   events.push({id:foot+'-lateral-'+i,foot,time:rows[i].time,candidate_time:rows[i].time,
    confidence:Math.min(...[i,i+1,i+2].map(j=>points[j]?.visibility??0)),
    settled_confirmed:true,lower:rows[i-1].time,upper:rows[i+1].time,
    method:'lateral_forefoot_settling'});
  }
 }
 return events;
}

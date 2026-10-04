// Timing review uses the player's fixed audio clock; it never aligns movement.
export function timingGrade(ms){
 if(!Number.isFinite(ms))return {label:'Needs review',points:null,tone:'pending'};
 const distance=Math.abs(ms),direction=ms<0?'early':'late';
 if(distance<=67+1e-7)return {label:'On beat',points:100,tone:'onbeat'};
 if(distance<=100+1e-7)return {label:ms<0?'Early':'Late',points:50,tone:'offbeat'};
 if(distance<=150+1e-7)return {label:`Very ${direction}`,points:25,tone:'offbeat'};
 return {label:'Missed beat',points:0,tone:'missed'};
}
export function timingScore(job,reference,offset,data){
 const analysis=data?.analysis;
 const beats=Array.from({length:16},(_,i)=>{
  const number=i+1,teacher=reference?.events?.find(e=>e.beat===number);
  const landing=job?.student?.detected_landings?.find(e=>e.beat===number);
  const assessed=analysis?.beats?.find(e=>e.beat===number);
  const detected=Number.isFinite(landing?.time)&&Number.isFinite(teacher?.time);
  const delta=Number.isFinite(assessed?.delta)?assessed.delta:detected?landing.time-teacher.time-offset:assessed?.candidate_delta;
  const ms=Number.isFinite(delta)?delta*1000:null;
  return {number,time:teacher?.time??assessed?.reference_time,ms,...timingGrade(ms)};
 });
 const measured=beats.filter(b=>b.points!==null);
 const final=measured.length===16&&analysis?.measured===16&&analysis?.counts?.unclear===0&&data?.sync?.confirmed===true&&data?.reference_reviewed===true&&!(analysis.reasons?.length)&&!(analysis.extras?.length);
 return {beats,measured:measured.length,final,score:measured.length?Math.round(measured.reduce((s,b)=>s+b.points,0)/measured.length):null};
}
// Use the displayed reference clock, never a wall-clock timer or the student's landing.
export function playbackBeatFeedback(result,time){
 const beats=result?.beats?.filter(b=>Number.isFinite(b.time)).sort((a,b)=>a.time-b.time);
 if(!beats?.length||!Number.isFinite(time))return null;
 const beat=beats.findLast(b=>b.time<=time+1e-7);
 if(!beat)return {number:null,label:`Ready for Beat ${beats[0].number}`,tone:'pending'};
 return {...beat,label:beat.points===null?'Not detected':beat.label};
}
export async function loadBufferedVideo(video, source, {fetchVideo = fetch} = {}) {
  const response = await fetchVideo(source);
  if (!response.ok) {
    const error = new Error('Could not load the teacher video. Reload the page and sign in if needed.');
    error.status = response.status;
    throw error;
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error('The teacher video is empty. Reload the page to try again.');
  const objectUrl = URL.createObjectURL(blob);
  try {
    video.src = objectUrl;
    video.load();
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
  return objectUrl;
}
export function beatWindow(time,bounds){
 if(!Number.isFinite(time)||!bounds||time<bounds.start||time>bounds.end)return null;
 return {start:Math.max(bounds.start,time-.35),end:Math.min(bounds.end,time+.45)};
}
export function scoreHeadline(a){
 if(!a||!a.measured)return 'No timing score yet';
 if(a.measured===16&&Number.isFinite(a.percentage))return `${a.counts.onbeat} of 16 steps on beat — ${Math.round(a.percentage)}%`;
 return `${a.counts.onbeat} of ${a.measured} assessable steps on beat`;
}
export function scoreSummary(a){
 const c=a?.counts;if(!c)return '';
 if(!a.measured&&c.unclear===16)return 'No score yet · 16 beats need review';
 const parts=[`${c.onbeat} on beat`,`${c.early} early`,`${c.late} late`,`${c.missed} missed`];
 if(c.unclear)parts.push(`${c.unclear} need review`);
 return parts.join(' · ');
}
const labels={onbeat:'On beat',early:'Early',late:'Late',missed:'Missed',unclear:'Needs review'};
export function beatLabel(value){return labels[value]||'Needs review';}
export function deltaText(delta,uncertainty){
 if(!Number.isFinite(delta))return 'No student landing matched to this beat';
 const comparison=delta<0?`${Math.abs(delta).toFixed(2)}s before the teacher`:`${Math.abs(delta).toFixed(2)}s after the teacher`;
 return `Estimated difference: ${comparison}${Number.isFinite(uncertainty)?` (±${uncertainty.toFixed(2)}s)`:''}`;
}
const explanation={reference_review_required:'The teacher’s 16 landing times still need review.',calibration_review_required:'The start of the 16-beat exercise still needs review.',audio_sync_confirmation_required:'Music alignment has not been confirmed yet.',reference_not_reviewed:'The teacher’s 16 landing times still need review.',calibration_not_reviewed:'The start of the 16-beat exercise still needs review.',synchronization_unconfirmed:'Music alignment has not been confirmed yet.',ambiguous_contact_assignment:'A possible student landing could match more than one teacher beat. Review this moment in the video.',extra_exercise_contacts:'Some possible student landings do not clearly match a teacher beat.'};
const readable=value=>explanation[value]||String(value).replaceAll('_',' ');
export function reviewNotes(data){
 const a=data?.analysis;if(!a)return [];
 const reasons=new Set(a.reasons||[]),notes=[];
 if(data.sync?.confirmed===false||reasons.has('synchronization_unconfirmed')||reasons.has('audio_sync_confirmation_required'))
  notes.push('The music alignment is not confirmed, so the app cannot tell whether steps are early, on time, or late yet.');
 if(reasons.has('reference_review_required')||reasons.has('reference_not_reviewed'))
  notes.push('The teacher’s 16 landing times still need review.');
 if(reasons.has('calibration_review_required')||reasons.has('calibration_not_reviewed'))
  notes.push('The start of the 16-beat exercise still needs review.');
 const extras=Array.isArray(a.extras)?a.extras:[];
 const candidates=new Set([...(a.beats||[]).flatMap(beat=>beat.candidates||[]),...extras].map(event=>event.id).filter(Boolean));
 if(extras.length||reasons.has('ambiguous_contact_assignment')){
  const count=candidates.size;
  const parts=[count?`MediaPipe found ${count} possible landings for the 16 teacher beats.`:'Some possible student landings are not matched to a teacher beat yet.'];
  if(extras.length)parts.push(`${extras.length} do not clearly match a beat.`);
  if(reasons.has('ambiguous_contact_assignment'))parts.push('Some could match more than one beat.');
  parts.push('Review the video before trusting a score.');notes.push(parts.join(' '));
 }
 if(!notes.length&&a.counts?.unclear===16)notes.push('The app could not confidently match student landings to the teacher’s beats yet.');
 return notes;
}
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
export class FootReview {
 constructor({getOffset,seekBeat}){
  this.getOffset=getOffset;this.seekBeat=seekBeat;this.generation=0;this.key=null;
  this.el=id=>document.getElementById(id);
  this.el('analyzeFeet').onclick=()=>this.action('analysis',{offset:this.getOffset()});
  this.el('confirmFootSync').onclick=()=>{if(this.el('audioReviewed').checked)this.action('sync',{offset:this.getOffset(),confirm_audio:true});};
  this.el('audioReviewed').onchange=()=>{this.el('confirmFootSync').disabled=!this.el('audioReviewed').checked;};
  window.addEventListener('focus',()=>{if(this.key)this.refresh();});
 }
 reset(){this.playbackResult=null;this.playbackKey=null;if(this.el('beatFeedback'))this.el('beatFeedback').hidden=true;clearTimeout(this.poll);this.generation++;this.key=null;this.el('footTiming').hidden=true;if(this.el('timingResult'))this.el('timingResult').hidden=true;}
 async load(job,reference){
  this.reset();if(!(job.local&&reference?.events?.length)&&job.lesson?.id!=='marching'&&job.id!=='07b20c60e88e4490b54f6c7b0044f258')return;
  if(job.lesson?.id==='marching'&&!reference)return;
  this.job=job;this.reference=reference;this.renderScore(null);
  this.key=job.id;this.el('footTiming').hidden=false;this.el('referenceReviewLink').href=`/practice/foot-reference.html?comparison=${job.id}`;
  if(job.local){this.el('footTiming').hidden=true;return;}
  await this.refresh();
 }
 async request(path,options){const response=await fetch(path,options);if(response.status===401)window.showSignIn?.();let value;try{value=await response.json();}catch{throw new Error('The timing review could not load. Reload and sign in again if needed.');}if(!response.ok)throw new Error(value.error||'Timing review is unavailable.');return value;}
 clearResult(){this.el('footHeadline').textContent='Timing review · checking evidence';this.el('footBeats').replaceChildren();this.el('footCounts').textContent='';this.el('footFeedback').replaceChildren();this.el('footExtras').textContent='';this.el('audioReviewed').checked=false;this.el('confirmFootSync').disabled=true;}
 async refresh(){
  if(this.job?.local){this.renderScore(null);return;}
  clearTimeout(this.poll);const token=++this.generation,key=this.key,offset=this.getOffset();if(!key)return;
  this.clearResult();
  this.renderScore(null);
  try{const data=await this.request(`/practice/api/foot-analysis/${key}?offset=${encodeURIComponent(offset)}`);if(token!==this.generation||key!==this.key||offset!==this.getOffset())return;this.render(data);if(data.state==='processing')this.poll=setTimeout(()=>this.refresh(),1000);}
  catch(error){if(token===this.generation){this.el('footStatus').textContent=error.message;this.el('analyzeFeet').disabled=false;this.renderScore(null);}}
 }
 async action(kind,payload){
  if(this.job?.local)return;
  clearTimeout(this.poll);const token=++this.generation,key=this.key;if(!key)return;
  this.clearResult();this.el('analyzeFeet').disabled=true;this.el('footStatus').textContent=kind==='sync'?'Saving your audio review…':'Starting local foot analysis…';
  try{const data=await this.request(`/practice/api/foot-${kind}/${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(token!==this.generation||key!==this.key||payload.offset!==this.getOffset())return;this.render(data);if(data.state==='processing')this.poll=setTimeout(()=>this.refresh(),1000);}
  catch(error){if(token===this.generation){this.el('footStatus').textContent=error.message;this.el('analyzeFeet').disabled=false;this.renderScore(null);}}
 }
 render(data){
  this.renderScore(data);
  this.el('analyzeFeet').disabled=data.state==='processing';this.el('analyzeFeet').textContent=data.state==='error'?'Retry foot analysis':data.state==='done'?'Refresh timing review':'Analyze foot timing';
  this.el('footStatus').textContent=data.message;
  this.el('footSyncText').textContent=data.sync?.confirmed?'The music alignment is confirmed for this setting.':'The app could not confirm that the music lines up. Listen to the count-in and later music at this setting, then confirm if they match.';
  this.el('manualFootSync').hidden=data.sync?.confirmed===true;
  this.el('footReferenceStatus').textContent=data.reference_reviewed?'The teacher’s 16 landing times are saved. Student landings and music alignment still need review.':'Teacher landing times need review. Open “Instructor: review teacher landings” below.';
  const a=data.analysis;if(!a){this.el('footHeadline').textContent='Marching · 16-step timing review';return;}
  this.el('footHeadline').textContent=scoreHeadline(a);
  this.el('footCounts').textContent=scoreSummary(a);
  const list=this.el('footFeedback');list.replaceChildren();
  for(const note of reviewNotes(data))list.append(node('li',note));
  if(a.measured){
   if(a.counts.early>a.counts.late)list.append(node('li','Several measured contacts arrive early. Try settling the foot a little later with the teacher.'));
   else if(a.counts.late>a.counts.early)list.append(node('li','Several measured contacts arrive late. Prepare the lift sooner so the foot can settle with the teacher.'));
   if(a.counts.missed)list.append(node('li','Review the missed beats and keep a steady alternating march.'));
  }
  const grid=this.el('footBeats');grid.replaceChildren();
  for(let bar=1;bar<=4;bar++){
   const row=node('div',undefined,'beat-row');row.append(node('h3',`Bar ${bar}`));const group=node('div',undefined,'beat-group');
   for(const beat of a.beats.filter(b=>b.bar===bar)){
    const button=node('button',undefined,`beat-button ${labels[beat.label]?beat.label:'unclear'}`);
    button.append(node('small',`Beat ${beat.within_bar}`),node('strong',beatLabel(beat.label)));
    const estimate=beat.delta??beat.candidate_delta;
    button.append(node('span',deltaText(estimate,beat.uncertainty)));
    if(beat.delta===null&&Number.isFinite(estimate))button.append(node('small','Estimate · not scored'));
    button.title=readable(beat.reason);button.disabled=!Number.isFinite(beat.reference_time);
    button.setAttribute('aria-label',`Bar ${bar} beat ${beat.within_bar}: ${beatLabel(beat.label)}. ${deltaText(estimate,beat.uncertainty)}. Review video.`);
    button.onclick=()=>{this.seekBeat(beat.reference_time,`Bar ${bar} · Beat ${beat.within_bar}`);this.el('footSelection').textContent=`Bar ${bar}, beat ${beat.within_bar}: ${readable(beat.reason)}. The comparison is paused near this contact; press Play to review.`;};group.append(button);
   }row.append(group);grid.append(row);
  }
  this.el('footExtras').textContent=a.extras?.length?`Possible extra landings to check in your video: ${a.extras.map(e=>Number(e.time).toFixed(2)+'s').join(', ')}.`:'';
 }
 updatePlayback(time,visible=true){
  const root=this.el('beatFeedback');if(!root)return;
  const beat=visible?playbackBeatFeedback(this.playbackResult,time):null;
  root.hidden=!beat;
  if(!beat)return;
  const key=`${beat.number}:${beat.label}:${beat.tone}`;
  if(key===this.playbackKey)return;
  this.playbackKey=key;root.dataset.tone=beat.tone;
  this.el('beatFeedbackNumber').textContent=beat.number===null?'Your timing':`Beat ${beat.number}`;
  this.el('beatFeedbackResult').textContent=beat.label;
 }
 renderScore(data){
  const root=this.el('timingResult');if(!root)return;root.hidden=false;
  const result=timingScore(this.job,this.reference,this.getOffset(),data);
  this.playbackResult=result;this.playbackKey=null;
  this.el('scoreValue').textContent=result.score===null?'—':result.score;
  this.el('scoreState').textContent=result.final?'Final result':result.score===null?'Waiting for analysis':'Preview · not final';
  const onbeat=result.beats.filter(b=>b.tone==='onbeat').length;
  this.el('scoreMessage').textContent=result.score===null?'Let’s check your timing.':`${onbeat} of ${result.measured} estimated steps on beat`;
  this.el('scoreExplanation').textContent=result.final?'Your foot timing compared with the teacher’s marked landings.':result.score===null?'Your timing score will appear here when student landings are available.':`Based on ${result.measured} of 16 landing estimates. Landing detection and music alignment must be confirmed before this becomes a final score.`;
  this.el('scoreAnalyze').hidden=this.job?.local||result.score!==null;
  this.el('scoreAnalyze').disabled=data?.state==='processing';
  this.el('scoreAnalyze').textContent=data?.state==='processing'?'Analyzing your steps…':'Analyze my steps';
  this.el('scoreAnalyze').onclick=()=>this.action('analysis',{offset:this.getOffset()});
  this.el('scoreReview').hidden=!!this.job?.local;
  this.el('scoreReview').onclick=()=>{this.el('timingDetails').open=true;this.el('footTiming').scrollIntoView({behavior:'smooth',block:'start'});};
  const counts=this.el('scoreCounts');counts.replaceChildren();
  for(const [label,test] of [['On beat',b=>b.tone==='onbeat'],['Early',b=>b.label.toLowerCase().includes('early')],['Late',b=>b.label.toLowerCase().includes('late')],['Missed',b=>b.tone==='missed'],['No estimate',b=>b.tone==='pending']]){
   const item=node('div');item.append(node('strong',result.beats.filter(test).length),node('span',label));counts.append(item);
  }
  const grid=this.el('scoreBeats');grid.replaceChildren();
  for(let bar=0;bar<4;bar++){
   const group=node('div',undefined,'score-bar');group.append(node('h3',`Bar ${bar+1}`));const row=node('div',undefined,'score-steps');
   for(const beat of result.beats.slice(bar*4,bar*4+4)){
    const button=node('button',undefined,`score-step ${beat.tone}`);
    button.append(node('span',`Beat ${beat.number}`),node('strong',beat.tone==='onbeat'?'✓':beat.tone==='pending'?'?':beat.ms<0?'←':'→'),node('small',beat.label));
    const difference=beat.ms===null?'No estimate':`${Math.abs(beat.ms).toFixed(1)} ms ${beat.ms<0?'early':'late'}`;
    button.setAttribute('aria-label',`Beat ${beat.number}: ${beat.label}. ${difference}. Review landing.`);
    button.disabled=!Number.isFinite(beat.time);
    button.onclick=()=>{grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');this.el('scoreSelected').textContent=`Beat ${beat.number} · ${beat.label} · ${difference}${result.final?'':' (estimate)'}`;this.seekBeat(beat.time,`Beat ${beat.number} · ${beat.label}`);};row.append(button);
   }group.append(row);grid.append(group);
  }
 }
}

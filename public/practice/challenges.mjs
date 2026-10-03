import {pairTrial} from './local-contacts.mjs';

export const validChallengeId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
export function challengePayload(record){
 return {take:record.id,lesson:record.lesson.id,version:record.lesson.version,reference_hash:record.referenceHash,
  video_hash:record.videoHash,deltas:pairTrial(record.analysis.events,record.reference.events,record.offset).map(p=>p.delta_ms),
  aligned:record.audioAlignment?.verified===true||record.manualSync?.verified===true,
  created_at:record.metadata?.challengeStartedAt||record.createdAt,source:record.metadata?.source,
  completed:record.metadata?.completed===true,interrupted:record.metadata?.interrupted===true};
}
export function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
export function button(text,fn,secondary=false){const n=el('button',text,secondary?'challenge-secondary':'challenge-primary');n.type='button';n.onclick=fn;return n;}
export async function request(path,data){
 const r=await fetch(path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 let body;try{body=await r.json();}catch{throw Error('The connection was interrupted. Please try again.');}
 if(!r.ok){const e=Error(body.error||'Please try again.');e.status=r.status;throw e;}return body;
}
function storedName(){try{return localStorage.getItem('dwc-challenge-name')||'';}catch{return '';}}
function rememberName(name){try{localStorage.setItem('dwc-challenge-name',name);}catch{}}
function intent(record,set){try{const k='dwc-challenge-intent:'+record.id;if(set)sessionStorage.setItem(k,'share');else{const pending=sessionStorage.getItem(k);sessionStorage.removeItem(k);return pending;}}catch{}}
function signIn(record,share=false){if(share)intent(record,true);location.assign('/practice/auth/google?next='+encodeURIComponent('/practice/compare.html?local='+record.id));}
export function nameField(value=storedName()){
 const label=el('label','Name your friends will see','challenge-name');const input=el('input');input.type='text';input.maxLength=40;input.required=true;input.autocomplete='nickname';input.placeholder='Your first name or nickname';input.value=value;label.append(input);return {label,input};
}
function modal(title){
 const dialog=el('dialog',undefined,'challenge-dialog');const top=el('div',undefined,'challenge-heading');const heading=el('h2',title);heading.id='challengeDialogTitle';dialog.setAttribute('aria-labelledby',heading.id);
 const close=button('Close',()=>dialog.close(),true);top.append(heading,close);dialog.append(top);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();return dialog;
}
export function shareControls(challenge,container){
 const url=new URL('/practice/challenge.html?id='+challenge.id,location.origin).href;
 const label=el('label','Challenge link','challenge-name'),link=el('input');link.type='text';link.readOnly=true;link.value=url;link.onclick=()=>link.select();label.append(link);
 const actions=el('div',undefined,'challenge-actions'),note=el('p',undefined,'challenge-note');note.setAttribute('role','status');
 const copy=button('Copy link',async()=>{try{await navigator.clipboard.writeText(url);note.textContent='Link copied. Paste it into a message to your friend.';}catch{container.append(label);link.focus();link.select();note.textContent='Select and copy the link below.';}},true);
 if(typeof navigator.share==='function')actions.append(button('Share challenge',async()=>{
  try{await navigator.share({title:challenge.title+' challenge',text:`Join me for ${challenge.title}! My timing score is ${challenge.score}/100.`,url});}
  catch(e){if(e.name!=='AbortError')note.textContent='Use Copy link to share this challenge.';}
 }));
 else copy.className='challenge-primary';
 const emailPanel=el('form',undefined,'challenge-email');
 const emailLabel=el('label','Friend’s email','challenge-name'),emailInput=el('input');emailInput.type='email';emailInput.required=true;emailInput.maxLength=254;emailInput.autocomplete='email';emailInput.placeholder='friend@example.com';emailLabel.append(emailInput);
 const emailNote=el('p',undefined,'challenge-note');emailNote.setAttribute('role','status');
 const send=button('Send challenge');send.type='submit';
 emailInput.addEventListener('input',()=>{send.disabled=false;send.textContent='Send challenge';emailNote.textContent='';});
 emailPanel.append(emailLabel,el('p','We’ll email this challenge link directly. Your friend signs in with Google to accept.','challenge-note'),send,emailNote);
 emailPanel.addEventListener('submit',async event=>{
  event.preventDefault();if(!emailInput.reportValidity())return;
  send.disabled=true;emailInput.disabled=true;send.textContent='Sending…';emailNote.textContent='';
  try{
   const sent=await request('/practice/api/challenges/'+challenge.id+'/email',{email:emailInput.value.trim()});
   if(sent.sent){send.textContent='Sent';emailNote.textContent=sent.already_sent?'This challenge invitation has already been sent to that address.':`Invitation sent to ${emailInput.value.trim()}. If it doesn’t arrive, ask your friend to check spam.`;}
   else{emailNote.textContent=sent.message;send.textContent='Check send status';send.disabled=false;}
  }catch(e){
   emailNote.textContent=e.message;send.textContent='Try again';send.disabled=false;
   if(e.status===401){send.disabled=true;const login=el('a','Sign in to send','challenge-link');login.href='/practice/auth/google?next='+encodeURIComponent('/practice/challenge.html?id='+challenge.id);emailNote.append(document.createTextNode(' '),login);}
  }finally{emailInput.disabled=false;}
 });
 actions.append(copy);container.append(emailPanel,actions,note);
}
function shareDialog(record,account){
 const dialog=modal('Challenge a friend');
 if(!account.can_save_scores){
  dialog.append(el('p','Sign in with Google to share this score and earn practice points together. Your recording stays on this device.'));
  dialog.append(button('Continue with Google',()=>signIn(record,true)));
  return;
 }
 dialog.append(el('p',`${record.lesson.title} · invite a friend to try your drill.`));
 const note=el('p','Preparing your challenge…','challenge-note');note.setAttribute('role','status');dialog.append(note);
 const retry=button('Try again',prepare,true);retry.hidden=true;dialog.append(retry);
 async function prepare(){
  retry.hidden=true;note.textContent='Preparing your challenge…';
  try{
   const challenge=await request('/practice/api/challenges',{...challengePayload(record),name:account.display_name||'Dancer'});
   if(!dialog.isConnected)return;
   note.textContent=`Sharing as ${challenge.name} · ${challenge.score}/100. Your recording stays private.`;
   shareControls(challenge,dialog);
   dialog.append(el('p','Your friend signs in with Google to join. Both players earn test points when they finish. Anyone with the link can join.','challenge-note'));
   dialog.querySelector('input[type=email]')?.focus();
  }catch(e){
   if(!dialog.isConnected)return;
   note.textContent=e.message;retry.hidden=false;
   if(e.status===401){retry.textContent='Continue with Google';retry.onclick=()=>signIn(record,true);}
  }
 }
 prepare();
}
const mounted=new Map();
export function mountChallengeResult(record,account){
 if(!record?.analysis||!record?.reference)return;
 const existing=mounted.get(record.id);if(existing){existing.record=record;return;}
 const state={record};mounted.set(record.id,state);
 const box=el('section',undefined,'challenge-card');box.id='challengeResult';box.setAttribute('aria-label','Challenge a friend');
 const copy=el('div');copy.append(el('h2','Your turn. Their turn.'),el('p','Invite a friend to try this drill with you.'));
 const actions=el('div',undefined,'challenge-actions');
 const invite=button('Challenge a friend',()=>shareDialog(state.record,account));
 if(!account.can_save_scores&&!account.google_available){invite.disabled=true;copy.append(el('p','Google sign-in is temporarily unavailable. Please try again later.','challenge-note'));}
 const save=button('Save score',async()=>{
  if(!account.can_save_scores){signIn(state.record);return;}
  save.disabled=true;
  try{const p=challengePayload(state.record);await request('/practice/api/scores',{take:p.take,lesson:p.lesson,deltas:p.deltas});notice.textContent='Score saved. Your video stays on this device.';save.textContent='Saved';}
  catch(e){notice.textContent=e.message;save.disabled=false;if(e.status===401){save.textContent='Sign in to save';save.onclick=()=>signIn(state.record);}}
 },true);
 const notice=el('p',undefined,'challenge-note');notice.setAttribute('role','status');actions.append(invite,save);box.append(copy,actions,notice);
 document.getElementById('timingResult')?.after(box);
 if(validChallengeId(record.challenge?.id))completeChallenge(record,account,box);
 if(account.can_save_scores&&intent(record,false)==='share')shareDialog(record,account);
}
async function completeChallenge(record,account,after){
 const box=el('section',undefined,'challenge-card challenge-completion');box.append(el('h2','Your challenge result'));
 const note=el('p','Saving your challenge result…');note.setAttribute('role','status');box.append(note);after.before(box);
 const again=button('Retry saving',run,true);box.append(again);again.hidden=true;
 async function run(){
  again.hidden=true;
  if(!account.can_save_scores){note.textContent='Sign in to finish this challenge. Your analyzed take is saved on this device.';again.hidden=false;again.textContent='Continue with Google';again.onclick=()=>signIn(record);return;}
  try{
   const id=record.challenge.id,done=await request(`/practice/api/challenges/${id}/complete`,challengePayload(record));
   const retryPractice=document.getElementById('recordAgain');if(retryPractice)retryPractice.href=`/practice/#lesson=${encodeURIComponent(record.lesson.id)}&action=record`;
   note.textContent=`Challenge complete · ${done.score}/100. You and your friend each earned ${done.points} test points.`;
   box.append(el('p','Test points are separate from your timing score and do not unlock paid content.','challenge-note'));
   const link=el('a','View challenge →','challenge-link');link.href='/practice/challenge.html?id='+id;box.append(link);
  }catch(e){note.textContent=e.message;again.hidden=false;
   if(e.status===401){again.textContent='Continue with Google';again.onclick=()=>signIn(record);}
   else if([409,410,422].includes(e.status)){again.textContent='View challenge';again.onclick=()=>location.assign('/practice/challenge.html?id='+record.challenge.id);}
  }
 }
 await run();
}
export async function mountChallengeDashboard(container){
 const box=el('section',undefined,'challenge-card challenge-dashboard');box.setAttribute('aria-label','Your challenges');container.append(box);
 async function load(){
  box.replaceChildren(el('p','Loading your challenges…'));
  try{
   const data=await request('/practice/api/challenges');box.replaceChildren();
   const head=el('div',undefined,'challenge-heading');head.append(el('h2','Your challenges'),el('span',`${data.balance} test points`,'challenge-balance'));box.append(head);
   box.append(el('p','Practice together. Points are for testing and do not unlock paid content.','challenge-note'));
   if(!data.challenges.length){box.append(el('p','Finish a drill, then choose Challenge a friend beside your score.'));return;}
   const list=el('div',undefined,'challenge-list');let expanded=false;
   const render=()=>{list.replaceChildren();for(const c of data.challenges.slice(0,expanded?30:3)){
    const a=el('a',undefined,'challenge-row');a.href='/practice/challenge.html?id='+c.id;
    const left=el('span');left.append(el('strong',c.title),el('small',c.is_sender?'Sent by you':`From ${c.name}`));
    let status=c.is_sender?(c.finishes?`${c.finishes} completed`:c.accepted_count?'Accepted':'Ready to share'):c.completed?'Completed':'Accepted · record your take';
    if(!c.available&&!c.completed&&!c.finishes)status='Expired';
    a.append(left,el('span',status));list.append(a);
   }};render();box.append(list);
   if(data.challenges.length>3)box.append(button('View recent challenges',event=>{expanded=!expanded;render();event.currentTarget.textContent=expanded?'Show fewer':'View recent challenges';},true));
   box.append(button('Refresh',load,true));
  }catch(e){box.replaceChildren(el('h2','Your challenges'),el('p',e.message),button('Retry',load,true));}
 }
 await load();
}

import {mountChallengeResult,mountChallengeDashboard} from './challenges.mjs';
const accountPromise=fetch('/practice/api/account').then(r=>r.ok?r.json():{}).catch(()=>({}));
window.addEventListener('dance-result',async event=>{await accountPromise;result(event.detail.record);});
const account=await accountPromise;
if(account.can_save_scores){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/practice/profile.css';document.head.append(sheet);
 const header=document.querySelector('header'),profile=document.createElement('a');profile.href='/practice/profile.html';profile.className='header-profile';profile.setAttribute('aria-label','My profile · '+(account.display_name||'Dancer'));
 const greeting=document.createElement('span');greeting.className='profile-greeting';greeting.textContent='Hi, '+(account.display_name||'Dancer');
 const avatar=document.createElement('span');avatar.className='profile-avatar';avatar.textContent=(account.display_name||'D').slice(0,1).toUpperCase();
 if(account.photo_url){const image=document.createElement('img');image.src=account.photo_url;image.alt='';image.referrerPolicy='no-referrer';image.onerror=()=>{avatar.textContent=(account.display_name||'D').slice(0,1).toUpperCase();};avatar.replaceChildren(image);}
 profile.append(greeting,avatar);header?.insertBefore(profile,document.getElementById('navToggle')||document.getElementById('signOut')||null);
 const menu=document.getElementById('siteNav');if(menu){const link=document.createElement('a');link.href='/practice/profile.html';link.textContent='My profile';menu.prepend(link);}
}

const signout=document.getElementById('signOut');if(signout)signout.hidden=!account.signed_in;
if(!account.signed_in&&account.google_available){
 const login=document.createElement('a');login.href='/practice/login?next='+encodeURIComponent(location.pathname+location.search);login.textContent='Sign in';login.className='account-signin';login.style.cssText='color:#f9f9f9;text-decoration:none;font-size:14px;padding:10px 14px;border:1px solid #2c2c30;border-radius:8px';
 signout?.before(login);
}

function el(tag,text){const node=document.createElement(tag);if(text)node.textContent=text;return node;}
function card(){const node=el('section');node.className='learner-account';node.style.cssText='margin:20px 0;padding:20px;border:1px solid #2c2c30;border-radius:14px;background:#161618;color:#f9f9f9';return node;}
function action(text){const b=el('button',text);b.type='button';b.style.cssText='background:#2563eb;color:white;border:0;border-radius:8px;padding:12px 16px;min-height:44px;font:inherit;cursor:pointer';return b;}
function result(record){mountChallengeResult(record,account);}

if(account.can_save_scores&&document.getElementById('libraryScreen')){
 mountChallengeDashboard(document.getElementById('libraryScreen'));
 try{
  const response=await fetch('/practice/api/scores');if(!response.ok)throw Error();const data=await response.json();
  const box=card(),details=el('details');details.append(el('summary',`Your saved scores (${data.scores.length})`));
  for(const score of data.scores){details.append(el('p',`${score.lesson==='2step'?'Two-Step':'Marching'} · ${score.score}/100 · ${score.measured}/16 estimates · ${new Date(score.saved*1000).toLocaleDateString()}`));}
  if(!data.scores.length)details.append(el('p','Finish a drill and choose Save this score to start your history.'));
  box.append(details);document.getElementById('libraryScreen')?.append(box);
 }catch{}
}

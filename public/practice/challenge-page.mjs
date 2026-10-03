import {el,button,request,validChallengeId} from './challenges.mjs';
const root=document.getElementById('challengeContent');
const id=new URLSearchParams(location.search).get('id');
async function load(){
 try{
  if(!validChallengeId(id))throw Error('This challenge link is incomplete. Ask your friend to share it again.');
  const [c,account]=await Promise.all([request('/practice/api/challenges/'+id),request('/practice/api/account')]);
  // The invitation click is the acceptance intent. Keep the authenticated POST
  // separate from the public GET so mail scanners cannot accept a challenge.
  if(c.available&&!c.is_sender&&!c.completed){
   if(!account.can_save_scores){
    if(!account.google_available)throw Error('Google sign-in is temporarily unavailable. Please try again later.');
    location.replace('/practice/auth/google?next='+encodeURIComponent('/practice/challenge.html?id='+id));return;
   }
   root.replaceChildren(el('p','Opening your timing practice…','challenge-note'));
   try{
    if(!c.accepted)await request('/practice/api/challenges/'+id+'/accept',{});
   }catch(e){
    if(e.status===401){location.replace('/practice/auth/google?next='+encodeURIComponent('/practice/challenge.html?id='+id));return;}
    throw e;
   }
   location.replace('/practice/?challenge='+id+'#lesson='+encodeURIComponent(c.lesson));return;
  }
  root.replaceChildren(el('p','DANCE TOGETHER','eyebrow'),el('h1',c.is_sender?'This is your challenge':`${c.name} challenged you.`));
  const drill=el('div',undefined,'challenge-drill'),image=el('img');image.src=c.poster;image.alt=c.title+' reference demonstration';
  const info=el('div');info.append(el('h2',c.title));const score=el('div',undefined,'challenge-score');score.append(document.createTextNode(String(c.score)),el('small',' /100'));info.append(score,el('p',`${c.is_sender?'Your':c.name+"’s"} timing score · ${c.measured}/16 estimated steps`,'challenge-note'));drill.append(image,info);root.append(drill);
  if(c.completed){
   root.append(el('h2','Challenge complete'),el('p',`Your score: ${c.completed.score}/100 · ${c.completed.measured}/16 estimated steps.`),el('p',`You both earned ${c.completed.points} test points.`));
   const link=el('a','Back to practice','challenge-primary');link.href='/practice/';root.append(link);
  }else if(!c.available){root.append(el('p',c.reason),el('p','You can still practice both free drills from the library.','challenge-note'));}
  else if(c.is_sender){
   root.append(el('p','This browser is signed in with the Google account that sent this challenge. To accept as your friend, choose their Google account.'));
   const change=el('a','Use a different Google account','challenge-primary');
   change.href='/practice/auth/google?switch=1&next='+encodeURIComponent('/practice/challenge.html?id='+id);root.append(change);
   const practice=el('a','Practice this drill','challenge-secondary');practice.href='/practice/#lesson='+encodeURIComponent(c.lesson);root.append(practice);
  }

  if(c.is_sender&&c.results?.length){
   root.append(el('h2','Friends who finished'));
   for(const r of c.results){const row=el('div',undefined,'challenge-row');row.append(el('strong',r.name),el('span',`${r.score}/100 · ${r.measured}/16 estimates · +${r.points} points each`));root.append(row);}
  }
  root.append(el('p','Test points do not unlock paid content. Videos stay on each person’s device.','challenge-note'));
  const details=el('details');details.append(el('summary','How challenge points work'),el('p','Both players earn 100 points for their first completed challenge together, then 50, 25, and 10 for later challenges with the same person—even on a different drill. Your timing score is separate.'),el('p','A friend must accept, record a new full take, and finish audio alignment and analysis. Opening a link or accepting it does not earn points. Each friend can complete this link once. Links expire after 30 days or when the reference changes.'));root.append(details);
 }catch(e){root.replaceChildren(el('h1','Couldn’t open this challenge'),el('p',e.message),button('Try again',load,true));}
}
load();

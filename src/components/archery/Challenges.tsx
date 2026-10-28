'use client'
import {useId,useRef,useState} from 'react'
import type {ArcheryData} from '@/lib/archery/types'
import type {Perform} from './ArcheryHub'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'
import ClassmateWheel from './ClassmateWheel'
import DisputePanel from './DisputePanel'
export default function Challenges({data,perform}:{data:ArcheryData;perform:Perform}){
 const [opponent,setOpponent]=useState(''),[choosing,setChoosing]=useState(false),picker=useRef<HTMLButtonElement>(null),label=useId()
 const person=data.roster.find(p=>p.id===opponent&&p.id!==data.me),canChoose=data.roster.some(p=>p.id!==data.me)
 function closePicker(){setChoosing(false);requestAnimationFrame(()=>picker.current?.focus({preventScroll:true}))}
 async function invite(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!person)return;const form=event.currentTarget,f=new FormData(form);if(await perform('challenge_create',{opponentId:person.id,game:f.get('game')},true)){form.reset();setOpponent('')}}
 return <section aria-label="Class challenges">
  <h2 className={s.progressHeading}>Class challenges</h2>
  <p className={s.muted}>Choose a classmate, agree on a game, then accept or decline. A winner is enough; scores are optional.</p>
  {!data.instructor&&<form className={s.card} onSubmit={invite}>
   <h3 className={a.roundTitle}>Challenge a classmate</h3>
   <div className={s.field}><span id={`${label}-label`}>Classmate</span><button ref={picker} type="button" className={a.classmateButton} aria-labelledby={`${label}-label ${label}-value`} aria-haspopup="dialog" disabled={!canChoose} onClick={()=>setChoosing(true)}><span id={`${label}-value`}>{person?.name??(canChoose?'Choose a classmate':'No classmates available')}</span><span aria-hidden="true">⌃<br/>⌄</span></button></div>
   <p className={a.classmateCount}>{data.roster.length} students in this class · Current enrollments</p>
   <label className={s.field}>Game<input name="game" maxLength={160} placeholder="e.g. Ten rings or tic tac toe" required/></label>
   <button className={s.button} disabled={!person}>Send challenge</button>
   {choosing&&<ClassmateWheel people={data.roster} me={data.me} initialId={person?.id??''} onChoose={id=>{setOpponent(id);closePicker()}} onDismiss={closePicker}/>}
  </form>}
  {!data.challenges.length&&<p className={s.card}>No challenges yet. Invitations appear here while the app is open.</p>}
  {data.challenges.map(c=>{
   const disputed=c.dispute?.status==='pending'
   const person=(id:string|null)=>id===c.challenger?c.challenger_name:id===c.opponent?c.opponent_name:'Unknown player'
   return <article className={s.card} key={c.id}>
    <p className={s.eyebrow}>{c.status}</p><h3 className={a.roundTitle}>{c.challenger_name} vs {c.opponent_name}</h3><p>{c.game}</p>
    {c.status==='pending'&&c.opponent===data.me&&<div className={s.row}><button className={s.button} onClick={()=>void perform('challenge_respond',{id:c.id,accept:true})}>Accept challenge</button><button className={`${s.button} ${s.secondary}`} onClick={()=>void perform('challenge_respond',{id:c.id,accept:false})}>Decline</button></div>}
    {c.status==='pending'&&c.challenger===data.me&&<p className={s.muted}>Waiting for {c.opponent_name} to respond.</p>}
    {c.dispute&&<DisputePanel dispute={c.dispute} players={[{id:c.challenger,name:c.challenger_name},{id:c.opponent,name:c.opponent_name}]} instructor={data.instructor} perform={perform}/>}
    {c.status==='accepted'&&!disputed&&c.proposed_winner&&<><p>Reported winner: <strong>{person(c.proposed_winner)}</strong></p>{c.reported_by_me?<p className={s.muted}>Waiting for your opponent to confirm.</p>:<div className={s.row}><button className={s.button} onClick={()=>void perform('challenge_confirm',{id:c.id,accept:true})}>Confirm result</button><button className={`${s.button} ${s.secondary}`} onClick={()=>void perform('challenge_confirm',{id:c.id,accept:false})}>Dispute result</button></div>}</>}
    {c.status==='accepted'&&!disputed&&(!c.proposed_winner||data.instructor)&&<form onSubmit={async event=>{event.preventDefault();const f=new FormData(event.currentTarget);await perform('challenge_result',{id:c.id,winnerId:f.get('winner'),notes:f.get('notes')})}}>
     <label className={s.field}>Winner<select aria-label="Winner" name="winner" required defaultValue=""><option value="" disabled>Choose the winner</option><option value={c.challenger}>{c.challenger_name}</option><option value={c.opponent}>{c.opponent_name}</option></select></label>
     <label className={s.field}>Score or result notes (optional)<input name="notes" maxLength={2000} placeholder="Winner only is fine"/></label>
     <button className={s.button}>{data.instructor?'Confirm as instructor':'Report result'}</button>
    </form>}
    {c.status==='completed'&&<p className={s.success}>Winner: {person(c.winner_id)}</p>}
    {c.notes&&<p className={s.progressNotes}>{c.notes}</p>}
    {['pending','accepted'].includes(c.status)&&(!disputed||data.instructor)&&(c.challenger===data.me||data.instructor)&&<button className={`${s.button} ${s.secondary}`} onClick={()=>void perform('challenge_cancel',{id:c.id})}>Cancel challenge</button>}
   </article>
  })}
 </section>
}

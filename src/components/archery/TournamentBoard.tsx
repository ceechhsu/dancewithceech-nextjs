'use client'
import {useState} from 'react'
import type {ArcheryData,Match,Tournament} from '@/lib/archery/types'
import type {Perform} from './ArcheryHub'
import MatchResult from './MatchResult'
import DisputePanel from './DisputePanel'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'

const laneOrder={upper:0,lower:1,final:2,reset:3}
const keyOf=(m:Match)=>`${m.bracket||'upper'}-${m.round}`
const isDone=(m:Match)=>Boolean(m.resolved||m.winner_id||m.bye)

export default function TournamentBoard({t,data,perform,now}:{t:Tournament;data:ArcheryData;perform:Perform;now:number}){
 const [roundView,setRoundView]=useState<string|null>(null)
 const me=t.engine_version===2?data.tournamentMe:data.me
 const name=(id:string|null)=>id?t.players?.find(p=>p.id===id)?.name||data.roster.find(p=>p.id===id)?.name||'Former participant':'Winner of earlier match'
 const matches=data.matches.filter(m=>m.tournament_id===t.id)
 const sorted=[...matches].sort((x,y)=>laneOrder[x.bracket||'upper']-laneOrder[y.bracket||'upper']||x.round-y.round||x.position-y.position)
 const joined=Boolean(me&&t.participants.includes(me))
 const seconds=t.registration_ends_at?Math.max(0,Math.ceil((Date.parse(t.registration_ends_at)-now)/1000)):null
 const registrationOpen=t.status==='registration'&&(seconds===null||seconds>0)
 const waitingToDraw=!t.bracket_size&&['registration','registration_closed'].includes(t.status)
 const next=me?sorted.find(m=>!isDone(m)&&(m.a===me||m.b===me)):undefined
 const personalDispute=me?matches.filter(m=>m.dispute&&(m.a===me||m.b===me)).sort((x,y)=>Date.parse(y.dispute!.created_at)-Date.parse(x.dispute!.created_at))[0]:undefined
 const losses=me?matches.filter(m=>!m.bye&&m.a&&m.b&&(m.a===me||m.b===me)&&m.winner_id&&m.winner_id!==me).length:0
 const eliminated=losses>=(t.format==='double'?2:1)
 const rounds=Array.from(new Map(sorted.map(m=>[keyOf(m),{key:keyOf(m),bracket:m.bracket||'upper',round:m.round}])).values())
 const firstReady=sorted.find(m=>!isDone(m)&&m.a&&m.b)
 const autoRound=t.status==='completed'?rounds.at(-1)?.key:next?keyOf(next):firstReady?keyOf(firstReady):rounds[0]?.key
 const activeRound=roundView&&rounds.some(r=>r.key===roundView)?roundView:autoRound
 const roundName=(bracket:string,round:number)=>{
  if(bracket==='final')return 'Championship'
  if(bracket==='reset')return 'Championship rematch'
  if(t.format==='double')return `${bracket==='lower'?'Second chance':'Main'} · Round ${round}`
  const last=t.bracket_size?Math.log2(t.bracket_size):0
  return round===last?'Final':round===last-1?'Semifinals':`Round ${round}`
 }
 const sourceName=(id:string|null|undefined,loser:boolean|undefined)=>{
  const source=matches.find(m=>m.id===id)
  return source?`${loser?'Loser':'Winner'} of ${roundName(source.bracket||'upper',source.round)}, match ${source.position}`:'Winner of earlier match'
 }
 const status=t.status==='cancelled'?'Cancelled':t.status==='completed'?'Completed':waitingToDraw?(registrationOpen?'Registration open':'Registration closed'):'In play'
 return <article className={s.card} aria-label={t.title}>
  <p className={s.eyebrow}>{status} · {t.participants.length} {waitingToDraw?'joined':'players'}{t.bracket_size?` · ${t.bracket_size-t.participants.length} ${t.bracket_size-t.participants.length===1?'bye':'byes'}`:''}</p>
  <h3 className={a.roundTitle}>{t.title}</h3>
  <p className={a.formatBadge}>{t.format==='double'?'Double elimination · Two losses to exit':'Single elimination'}</p>
  <p>{t.game}</p>{t.instructions&&<p className={a.instructions}>{t.instructions}</p>}
  {waitingToDraw&&<div className={a.registration}>
   {registrationOpen?<>{seconds===null?<p>Signup stays open until the instructor closes it.</p>:<p className={a.countdown} aria-label="Registration time remaining">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')} <span>left to join</span></p>}<p className={s.muted}>The bracket is drawn automatically when signup closes.</p></>:<p>Registration is closed.{t.participants.length>=2?' Preparing the bracket…':' At least two players are needed for a draw. The instructor can start a new tournament.'}</p>}
   {registrationOpen&&(t.engine_version===2||!data.instructor)&&<>
    <p>{joined?'You’re in! Your opponent will appear when signup closes.':data.instructor?'Want to compete too? You can join as the instructor.':'Want to play? Join before registration closes.'}</p>
    <button className={`${s.button} ${joined?s.secondary:''}`} disabled={!joined&&t.participants.length>=64} onClick={()=>void perform(joined?'tournament_leave':'tournament_join',{id:t.id})}>{joined?'Leave tournament':t.participants.length>=64?'Tournament full':'Enter tournament'}</button>
   </>}
   {joined&&!registrationOpen&&<p>You joined this tournament.</p>}
   {data.instructor&&(registrationOpen||t.participants.length>=2)&&<button className={`${s.button} ${a.closeRegistration}`} onClick={()=>void perform('tournament_close',{id:t.id})}>{registrationOpen?'Close registration & draw':'Draw bracket'}</button>}
   <details className={a.entrants}><summary>Who’s joined ({t.participants.length})</summary>{t.participants.length?<ul>{t.participants.map(id=><li key={id}>{name(id)}{id===me?' (you)':''}</li>)}</ul>:<p>No one has joined yet.</p>}</details>
  </div>}
  {t.winner_id&&<p className={s.success}>Champion: {name(t.winner_id)}{t.winner_id===me?' — that’s you!':''}</p>}
  {joined&&personalDispute?.dispute&&personalDispute.dispute.status!=='pending'&&<section aria-label="Your dispute decision">
   <p className={s.muted}>Your match: {name(personalDispute.a)} vs {name(personalDispute.b)}</p>
   <DisputePanel dispute={personalDispute.dispute} players={[{id:personalDispute.a!,name:name(personalDispute.a)},{id:personalDispute.b!,name:name(personalDispute.b)}]} instructor={data.instructor} perform={perform}/>
  </section>}
  {t.status==='active'&&joined&&<section className={a.nextMatch} aria-label="Your tournament status">
   <p className={s.eyebrow}>{losses} {losses===1?'loss':'losses'}{t.format==='double'?' · Two losses to exit':''}</p>
   {next?<><p>{roundName(next.bracket||'upper',next.round)}</p><h4>Your next match</h4>{next.a&&next.b?<><p className={a.opponent}>You vs {name(next.a===me?next.b:next.a)}</p><p>Find each other and play. Report the match winner when you’re done.</p><MatchResult key={next.id} match={next} data={data} name={name} perform={perform} asPlayer={t.engine_version===2}/></>:<p>Your opponent will appear when the earlier match finishes.</p>}</>:<p>{eliminated?'Your tournament run is complete. Follow the remaining matches below.':losses===1&&t.format==='double'?'You’re still in! Waiting for your second-chance opponent.':'You’re waiting for your next match.'}</p>}
  </section>}
  {t.bracket_size&&<>
   <p className={s.muted}>Class bracket · {t.format==='double'?'Main and Second chance feed the Championship. A bye advances a player without adding a win or loss.':'Follow each round below.'}</p>
   {matches.some(m=>m.bracket==='reset')&&<p className={a.resetNotice}>Championship rematch: both finalists now have one loss. The winner of this match is the champion.</p>}
   <nav className={a.roundTabs} aria-label={`${t.title} rounds`}>{rounds.map(r=><button type="button" key={r.key} aria-pressed={activeRound===r.key} onClick={()=>setRoundView(r.key)}>{roundName(r.bracket,r.round)}</button>)}</nav>
   <div className={a.bracket} role="region" tabIndex={0} aria-label={`${t.title} bracket`}>
    {rounds.map(r=><section className={a.bracketRound} data-current={activeRound===r.key} key={r.key} aria-label={t.format==='double'?roundName(r.bracket,r.round):`Round ${r.round}`}><h4>{roundName(r.bracket,r.round)}</h4>
     {matches.filter(m=>keyOf(m)===r.key&&!(m.resolved&&!m.a&&!m.b)).map(m=><div className={a.match} key={m.id} data-match-id={m.id} data-bracket={m.bracket||'upper'}>
      <p className={a.matchLabel}>Match {m.position}{m.bye?' · Bye':''}</p>
      <p className={m.winner_id&&m.winner_id===m.a?a.winner:undefined}>{m.a?name(m.a):m.bye?'Bye':sourceName(m.a_source,m.a_loser)}{me&&m.a===me?' (you)':''}</p>
      <p className={m.winner_id&&m.winner_id===m.b?a.winner:undefined}>{m.b?name(m.b):m.bye?'Bye':sourceName(m.b_source,m.b_loser)}{me&&m.b===me?' (you)':''}</p>
      {m.bye&&<small>Advances automatically</small>}
      {m.winner_id&&!m.bye&&<small>Winner: {name(m.winner_id)}</small>}
      {m.dispute?.status==='pending'?<small>Result disputed · Awaiting instructor decision</small>:m.proposed_winner&&<small>Reported winner: {name(m.proposed_winner)} · awaiting confirmation</small>}
      {m.dispute&&m.dispute.status!=='pending'&&<DisputePanel dispute={m.dispute} players={[{id:m.a!,name:name(m.a)},{id:m.b!,name:name(m.b)}]} instructor={data.instructor} perform={perform}/>}
      {m.notes&&<p className={s.progressNotes}>{m.notes}</p>}
      {data.instructor&&t.status==='active'&&!isDone(m)&&m.a&&m.b&&!(t.engine_version===2&&(m.a===me||m.b===me))&&<MatchResult match={m} data={data} name={name} perform={perform}/>}
     </div>)}
    </section>)}
   </div>
  </>}
  {data.instructor&&['registration','registration_closed','active'].includes(t.status)&&<details><summary>Cancel this tournament</summary><p>This keeps its history and stops further results. Open a new tournament if the draw needs to be replaced.</p><button className={`${s.button} ${s.danger}`} onClick={()=>void perform('tournament_cancel',{id:t.id})}>Confirm cancellation</button></details>}
 </article>
}

'use client'
import {useEffect,useState} from 'react'
import type {ArcheryData} from '@/lib/archery/types'
import type {Perform} from './ArcheryHub'
import TournamentBoard from './TournamentBoard'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'

export default function Tournaments({data,date,perform,hosting=false,onCreated}:{data:ArcheryData;date:string;perform:Perform;hosting?:boolean;onCreated?:()=>void}){
 const tournaments=data.tournaments.filter(t=>t.event_date===date)
 const [serverClock,setServerClock]=useState(()=>Date.parse(data.serverNow))
 const [timed,setTimed]=useState(true),[minutes,setMinutes]=useState(5),[format,setFormat]=useState('single')
 useEffect(()=>{
  const start=Date.now(),server=Date.parse(data.serverNow)
  const tick=()=>setServerClock(server+Date.now()-start)
  tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer)
 },[data.serverNow])
 const canHost=data.instructor&&date===data.today
 if(hosting?!canHost:!tournaments.length)return null
 return <section aria-label={hosting?'Tournament setup':'Class tournaments'}><h2 className={s.progressHeading}>{hosting?'Host a tournament':'Tournaments'}</h2>
  {!hosting&&<p className={s.muted}>Find your opponent and report who won. Pairings update automatically after results are confirmed.</p>}
  {hosting&&canHost&&<div className={s.card}><form onSubmit={async event=>{
   event.preventDefault();const form=event.currentTarget,f=new FormData(form)
   if(await perform('tournament_open',{title:f.get('title'),game:f.get('game'),instructions:f.get('instructions'),date,format,signupMinutes:timed?minutes:null},true)){form.reset();onCreated?.()}
  }}>
   <label className={s.field}>Tournament name<input name="title" maxLength={120} required placeholder="e.g. Friday class tournament"/></label>
   <label className={s.field}>Game<input name="game" maxLength={160} required placeholder="e.g. Ten rings or tic tac toe"/></label>
   <label className={s.field}>How to play (optional)<textarea name="instructions" rows={2} maxLength={1000} placeholder="e.g. Best of three. First to two wins."/></label>
   <label className={s.field}>Tournament format<select aria-label="Tournament format" value={format} onChange={e=>setFormat(e.target.value)}><option value="single">Single elimination</option><option value="double">Double elimination</option></select></label>
   <p className={a.formatHint}>{format==='double'?'Two match losses and you’re out. A first loss moves you to the second-chance bracket. The championship includes a rematch if needed.':'One match loss and you’re out. Winners advance until one champion remains.'}</p>
   <div className={a.setupGrid}>
    <label className={s.field}>Signup closes<select aria-label="Signup closes" value={timed?'timer':'manual'} onChange={e=>setTimed(e.target.value==='timer')}><option value="timer">After a timer</option><option value="manual">When I close it</option></select></label>
    {timed&&<label className={s.field}>Signup timer (minutes)<input type="number" min={1} max={120} step={1} required value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label>}
   </div>
   <p className={s.muted}>{timed?'You can close signup early. When time runs out, signup closes and the bracket is drawn automatically.':'Keep signup open until everyone is ready, then close it to draw the bracket.'} You can join as a player after opening signup.</p>
   <button className={s.button}>{timed?`Open ${minutes}-minute registration`:'Open registration'}</button>
  </form></div>}
  {!hosting&&tournaments.map(t=><TournamentBoard key={t.id} t={t} data={data} perform={perform} now={serverClock}/>)}
 </section>
}

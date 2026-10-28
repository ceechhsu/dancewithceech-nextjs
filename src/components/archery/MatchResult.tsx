'use client'
import type {ArcheryData,Match} from '@/lib/archery/types'
import type {Perform} from './ArcheryHub'
import s from '@/components/attendance/Attendance.module.css'
import DisputePanel from './DisputePanel'

export default function MatchResult({match:m,data,name,perform,asPlayer=false}:{match:Match;data:ArcheryData;name:(id:string|null)=>string;perform:Perform;asPlayer?:boolean}){
 const managing=data.instructor&&!asPlayer
 if(!m.a||!m.b||m.winner_id)return null
 if(m.dispute?.status==='pending')return <DisputePanel dispute={m.dispute} players={[{id:m.a,name:name(m.a)},{id:m.b,name:name(m.b)}]} instructor={data.instructor} perform={perform}/>
 if(m.proposed_winner&&!managing)return <div>
  <p>Reported winner: <strong>{name(m.proposed_winner)}</strong></p>
  {m.notes&&<p className={s.progressNotes}>{m.notes}</p>}
  {m.reported_by_me?<p>Waiting for your opponent to confirm.</p>:<><p>Check the result with your opponent. Confirming advances the winner.</p><div className={s.row}><button className={s.button} onClick={()=>void perform('match_confirm',{id:m.id,accept:true})}>Confirm match result</button><button className={`${s.button} ${s.secondary}`} onClick={()=>void perform('match_confirm',{id:m.id,accept:false})}>Dispute result</button></div></>}
 </div>
 return <form onSubmit={async event=>{event.preventDefault();const f=new FormData(event.currentTarget);await perform('match_result',{id:m.id,winnerId:f.get('winner'),notes:f.get('notes')})}}>
  {managing&&m.proposed_winner&&<p>A player reported {name(m.proposed_winner)} as winner. You can resolve the result below.</p>}
  <label className={s.field}>{managing?`Match ${m.position} winner`:'Match winner'}<select aria-label={managing?`Match ${m.position} winner`:'Match winner'} name="winner" required defaultValue=""><option value="" disabled>Choose winner</option><option value={m.a}>{name(m.a)}</option><option value={m.b}>{name(m.b)}</option></select></label>
  <label className={s.field}>Score or result notes (optional)<input name="notes" maxLength={2000} placeholder="e.g. 2–1, or tic tac toe winner"/></label>
  {!managing&&<p className={s.muted}>Your opponent confirms before the winner advances. No numeric score is required.</p>}
  <button className={s.button}>{managing?'Advance winner':'Report match winner'}</button>
 </form>
}

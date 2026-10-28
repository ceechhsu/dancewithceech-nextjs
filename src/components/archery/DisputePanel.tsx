'use client'
import type {Person,ResultDispute} from '@/lib/archery/types'
import type {Perform} from './ArcheryHub'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'

export default function DisputePanel({dispute,players,instructor,competing=false,perform}:{dispute:ResultDispute;players:Person[];instructor:boolean;competing?:boolean;perform:Perform}){
 const name=(id:string|null)=>players.find(p=>p.id===id)?.name||'Former participant'
 const pending=dispute.status==='pending'
 return <section className={pending?a.disputePending:a.disputeHistory} aria-label={pending?'Disputed result':'Dispute decision'}>
  {pending?<>
   <p role="status">{instructor?(competing?'Result disputed. Review the outcome together before making your instructor decision.':'Result disputed. Both players have been asked to find you.'):'Result disputed. Please find your instructor together so they can decide the winner.'}</p>
   <p className={s.muted}>This result is paused until the instructor decides.</p>
   <p>Reported winner: <strong>{name(dispute.reported_winner)}</strong></p>
   {dispute.reported_notes&&<p className={s.progressNotes}>{dispute.reported_notes}</p>}
   {instructor&&<form onSubmit={async event=>{
    event.preventDefault();const f=new FormData(event.currentTarget)
    await perform('dispute_resolve',{id:dispute.id,winnerId:f.get('winner'),notes:f.get('notes')})
   }}>
    <p>Review the result with both players, then choose the winner.</p>
    <label className={s.field}>Winner selected by instructor<select aria-label="Winner selected by instructor" name="winner" required defaultValue=""><option value="" disabled>Choose winner</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className={s.field}>Decision notes (optional)<input name="notes" maxLength={2000} placeholder="What you decided with the players"/></label>
    <button className={s.button}>Resolve dispute</button>
   </form>}
  </>:<>
   <p className={dispute.status==='resolved'?s.success:s.muted}>{dispute.status==='resolved'?'Resolved by instructor':'Cancelled by instructor'}</p>
   {dispute.status==='resolved'&&<p>Instructor’s decision: <strong>{name(dispute.winner_id)}</strong></p>}
   {dispute.decision_notes&&<p className={s.progressNotes}>{dispute.decision_notes}</p>}
   <details><summary>Dispute record</summary><p>Originally reported winner: {name(dispute.reported_winner)}</p>{dispute.reported_notes&&<p className={s.progressNotes}>{dispute.reported_notes}</p>}</details>
  </>}
 </section>
}

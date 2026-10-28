'use client'
import type {ArcheryData} from '@/lib/archery/types'
import type {Perform} from './ArcheryHub'
import DisputePanel from './DisputePanel'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'

export default function DisputeReview({data,perform}:{data:ArcheryData;perform:Perform}){
 if(!data.instructor)return null
 return <section aria-label="Instructor disputes"><h2 className={s.progressHeading}>Resolve disputes</h2>
  <p className={s.muted}>Meet with both players, review what happened, and decide the winner. Your decision resumes the result and is saved in its history.</p>
  {!data.disputes?.length&&<p className={s.card}>No disputes waiting for your decision.</p>}
  {data.disputes?.map(d=><article className={s.card} key={d.id} aria-label={`Dispute: ${d.players.map(p=>p.name).join(' vs ')}`}>
   <p className={s.eyebrow}>{d.kind==='challenge'?'Classmate challenge':d.tournament_title||'Tournament match'}</p>
   <h3 className={a.roundTitle}>{d.players.map(p=>p.name).join(' vs ')}</h3><p>{d.game}</p>
   <DisputePanel dispute={d} players={d.players} instructor perform={perform}/>
  </article>)}
 </section>
}

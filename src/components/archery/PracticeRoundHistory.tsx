import type {ArcheryRound} from '@/lib/archery/types'
import {progressDate} from '@/lib/attendance/progress'
import {roundMarks,scoreRing} from '@/lib/archery/scores'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'

export default function PracticeRoundHistory({rounds,title,review=false}:{rounds:ArcheryRound[];title:string;review?:boolean}){
 return <section aria-label={review?'Student practice history':'Individual round history'}>
  <h2 className={s.progressHeading}>{title}</h2>
  {!rounds.length&&<p className={s.card}>No {review?'student ':''}practice rounds for this day.</p>}
  {rounds.map(round=><article className={s.card} key={round.id}>
   <p className={s.eyebrow}>{progressDate(round.entry_date)}{review?` · ${round.student_name}`:''}</p>
   <h3 className={a.roundTitle}>{round.distance} {round.unit} · {round.scores.length} {round.scores.length===1?'arrow':'arrows'}</h3>
   <p className={a.total}><strong>{round.total}</strong><span> / {round.scores.length*10}</span></p>
   <p className={a.scoreList} aria-label="Arrow scores">{roundMarks(round).map((mark,i)=><span data-ring={scoreRing(mark)} key={i}>{mark}</span>)}</p>
   {round.notes&&<p className={s.progressNotes}>{round.notes}</p>}
  </article>)}
 </section>
}

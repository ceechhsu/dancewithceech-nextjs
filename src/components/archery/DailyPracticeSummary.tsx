import type {ArcheryData} from '@/lib/archery/types'
import PracticeSummaryTable from './PracticeSummaryTable'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'

export default function DailyPracticeSummary({data,date}:{data:ArcheryData;date:string}){
 const rounds=data.roundDate===date?data.dayRounds:undefined
 if(data.instructor)return <section className={a.dailySummary} aria-label="Daily practice summary">
  <section className={a.personalSummary} aria-label="Your practice summary"><h3>Your practice</h3>
   {data.roundDate!==date?<p role="status" className={s.muted}>Loading your rounds…</p>:!data.personalDayRounds?.length?<p className={s.muted}>No personal practice rounds for this day.</p>:<><p className={s.muted}>{data.personalDayRounds.length} round{data.personalDayRounds.length===1?'':'s'} · Your practice</p><PracticeSummaryTable rounds={data.personalDayRounds}/></>}
  </section>
  <section className={a.studentSummary} aria-label="Student practice summary"><h3>Student practice</h3>
   {!rounds?<p role="status" className={s.muted}>Loading student rounds…</p>:!rounds.length?<p className={s.muted}>No student rounds for this day.</p>:<><p className={s.muted}>{rounds.length} round{rounds.length===1?'':'s'} · Class review</p><PracticeSummaryTable rounds={rounds} showStudent/></>}
  </section>
 </section>
 return <section className={a.dailySummary} aria-label="Daily practice summary">
  <h3>Round summary</h3>
  {!rounds?<p role="status" className={s.muted}>Loading this day’s rounds…</p>:!rounds.length?<p className={s.muted}>No rounds recorded for this day.</p>:<>
   <p className={s.muted}>{rounds.length} round{rounds.length===1?'':'s'} · Your practice</p>
   <PracticeSummaryTable rounds={rounds}/>
  </>}
 </section>
}

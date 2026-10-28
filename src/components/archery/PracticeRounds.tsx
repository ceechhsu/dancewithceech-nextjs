'use client'
import {useRef,useState} from 'react'
import type {ArcheryData} from '@/lib/archery/types'
import {progressDate} from '@/lib/attendance/progress'
import type {Perform} from './ArcheryHub'
import {scorePoints,scoreRing,type ScoreMark} from '@/lib/archery/scores'
import ScoreWheel from './ScoreWheel'
import PracticeRoundHistory from './PracticeRoundHistory'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'
export default function PracticeRounds({data,date,perform,onTryStudent}:{data:ArcheryData;date:string;perform:Perform;onTryStudent?:()=>void}){
 const [count,setCount]=useState('5'),[scores,setScores]=useState<(ScoreMark|'')[]>(Array(100).fill('')),[active,setActive]=useState<number|null>(null)
 const arrowButtons=useRef<(HTMLButtonElement|null)[]>([])
 const n=Number(count),validCount=Number.isInteger(n)&&n>=1&&n<=100
 const entered=validCount?scores.slice(0,n):[],total=entered.reduce((sum,x)=>sum+(x===''?0:scorePoints(x)),0),complete=validCount&&entered.every(Boolean)
 const rounds=data.roundDate===date?[...(data.dayRounds??[])].reverse():data.rounds.filter(r=>r.entry_date===date)
 const personal=data.roundDate===date?[...(data.personalDayRounds??[])].reverse():(data.personalRounds??[]).filter(r=>r.entry_date===date)
 function dismissWheel(){const index=active;setActive(null);requestAnimationFrame(()=>{if(index!==null)arrowButtons.current[index]?.focus({preventScroll:true})})}
 function useScore(mark:ScoreMark){if(active===null)return;const index=active;setScores(current=>current.map((value,i)=>i===index?mark:value));setActive(null);requestAnimationFrame(()=>arrowButtons.current[Math.min(index+1,n-1)]?.focus({preventScroll:true}))}
 async function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!complete)return;const form=event.currentTarget,f=new FormData(form);const ok=await perform('round_save',{date,distance:Number(f.get('distance')),unit:f.get('unit'),scores:(entered as ScoreMark[]).map(scorePoints),marks:entered,notes:f.get('notes')},true);if(ok)setScores(Array(100).fill(''))}
 return <>
  {date<=data.today&&<form className={s.card} onSubmit={save}>
   <h2>Record a round</h2><p className={s.eyebrow}>{progressDate(date)}</p><p className={s.muted}>Five arrows to start. Change the distance and arrow count for every round.</p>
   {data.instructor&&<p className={s.muted}>Your own practice scorecard. Student practice is available for review below.</p>}
   <div className={a.setupGrid}>
    <label className={s.field}>Distance<input name="distance" type="number" inputMode="decimal" min="0.1" max="1000" step="0.1" placeholder="Choose distance" required/></label>
    <label className={s.field}>Unit<select aria-label="Unit" name="unit" defaultValue="m"><option value="m">Meters</option><option value="yd">Yards</option></select></label>
    <label className={s.field}>Arrows this round<input type="number" inputMode="numeric" min="1" max="100" step="1" value={count} onChange={e=>setCount(e.target.value)} required/></label>
   </div>
   <p className={s.muted}>Tap an arrow to open the score wheel. M is a miss; X is an inner ten.</p>
   <div className={a.arrowGrid} role="group" aria-label="Arrow scores">{validCount&&Array.from({length:n},(_,i)=><button type="button" ref={element=>{arrowButtons.current[i]=element}} key={i} className={a.arrowScore} data-ring={scores[i]?scoreRing(scores[i] as ScoreMark):undefined} aria-label={`Arrow ${i+1}: ${scores[i]||'not scored'}. Choose score.`} onClick={()=>setActive(i)}><span>Arrow {i+1}</span><strong>{scores[i]||'—'}</strong></button>)}</div>
   <p className={a.entryProgress} role="status">{entered.filter(Boolean).length} of {validCount?n:0} arrows entered. Tap any arrow to change it.</p>
   <p className={a.total}>Round total <strong>{total}</strong><span> / {validCount?n*10:0}</span></p>
   <label className={s.field}>Notes (optional)<textarea name="notes" rows={2} maxLength={2000}/></label>
   <button className={s.button} disabled={!complete}>Save round</button>
   {active!==null&&<ScoreWheel arrow={active+1} count={n} initialMark={scores[active]||undefined} onUse={useScore} onDismiss={dismissWheel}/>}
  </form>}
  <PracticeRoundHistory rounds={data.instructor?personal:rounds} title={data.instructor?'Your practice rounds':'Your rounds'}/>
  {data.instructor&&<>
   <PracticeRoundHistory rounds={rounds} title="Student practice rounds" review/>
   {onTryStudent&&<details className={s.card}><summary>Preview a student’s view</summary><p className={s.muted}>Try a sample student’s scorecard. Your instructor practice stays on your account.</p><button type="button" className={`${s.button} ${s.secondary}`} onClick={onTryStudent}>Try a student scorecard</button></details>}
  </>}
  <p className={s.muted}>Compare rounds with the same distance and arrow count.</p>
 </>
}

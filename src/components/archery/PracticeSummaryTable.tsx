import type {ArcheryRound} from '@/lib/archery/types'
import {roundMarks,scoreRing} from '@/lib/archery/scores'
import a from './Archery.module.css'

export default function PracticeSummaryTable({rounds,showStudent=false}:{rounds:ArcheryRound[];showStudent?:boolean}){
 return <div className={a.summaryScroll} role="region" aria-label="Round summary table, scroll for more rounds" tabIndex={0}>
  <table className={a.summaryTable}><caption className={a.srOnly}>{showStudent?'Student practice rounds':'Your practice rounds'} for the selected day</caption>
   <thead><tr><th scope="col">Round</th>{showStudent&&<th scope="col">Student</th>}<th scope="col">Distance</th><th scope="col">Scores</th><th scope="col">Total</th></tr></thead>
   <tbody>{rounds.map((round,i)=><tr key={round.id}><th scope="row">{i+1}</th>{showStudent&&<td>{round.student_name}</td>}<td>{round.distance} {round.unit}<small className={a.summaryDetail}>{round.scores.length} {round.scores.length===1?'arrow':'arrows'}</small></td><td><div className={a.summaryScores}>{roundMarks(round).map((mark,i)=><span data-ring={scoreRing(mark)} key={i}>{mark}</span>)}</div></td><td className={a.summaryTotal}>{round.total}<small> / {round.scores.length*10}</small></td></tr>)}</tbody>
  </table>
 </div>
}

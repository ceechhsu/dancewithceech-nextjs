export const SCORE_MARKS=['M','1','2','3','4','5','6','7','8','9','10','X'] as const
export type ScoreMark=typeof SCORE_MARKS[number]
export const WHEEL_MARKS=[...SCORE_MARKS].reverse()
export function scorePoints(mark:ScoreMark){return mark==='M'?0:mark==='X'?10:Number(mark)}
export function scoreRing(mark:ScoreMark){const points=scorePoints(mark);return mark==='M'?'miss':points<=2?'white':points<=4?'black':points<=6?'blue':points<=8?'red':'yellow'}
export function parseArrowScores(scores:unknown,marks?:unknown):{scores:number[];marks:ScoreMark[]}{
 if(marks!==undefined){
  if(!Array.isArray(marks)||marks.length<1||marks.length>100||marks.some(m=>!SCORE_MARKS.includes(m)))throw Error('Enter 1–100 valid arrow marks: M, 1–10 or X.')
  const values=(marks as ScoreMark[]).map(scorePoints)
  if(scores!==undefined&&(!Array.isArray(scores)||scores.length!==values.length||scores.some((s,i)=>s!==values[i])))throw Error('Arrow scores must match their target marks.')
  return {scores:values,marks:marks as ScoreMark[]}
 }
 if(!Array.isArray(scores)||scores.length<1||scores.length>100||scores.some(s=>!Number.isInteger(s)||s<0||s>10))throw Error('Enter 1–100 arrow scores from 0 to 10.')
 return {scores,marks:scores.map(s=>s===0?'M':String(s) as ScoreMark)}
}
export function roundMarks(round:{scores:number[];score_marks?:ScoreMark[]}){return round.score_marks??round.scores.map(s=>s===0?'M':String(s) as ScoreMark)}
export function scoreForRotation(rotation:number){const index=((Math.round(-rotation/30)%12)+12)%12;return WHEEL_MARKS[index]}
export function rotationForScore(mark:ScoreMark,current=0){const target=-WHEEL_MARKS.indexOf(mark)*30;return target+Math.round((current-target)/360)*360}
export function angleDelta(previous:number,next:number){return ((next-previous+540)%360)-180}

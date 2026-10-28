'use client'
import {useEffect,useId,useRef,useState} from 'react'
import {SCORE_MARKS,WHEEL_MARKS,angleDelta,rotationForScore,scoreForRotation,scorePoints,scoreRing,type ScoreMark} from '@/lib/archery/scores'
import s from '@/components/attendance/Attendance.module.css'
import w from './ScoreWheel.module.css'

type Gesture={id:number;angle:number;startRotation:number;x:number;y:number;cx:number;cy:number;moved:boolean}
function point(angle:number,r:number){return [160+Math.sin(angle*Math.PI/180)*r,160-Math.cos(angle*Math.PI/180)*r]}
function segment(angle:number){const [ax,ay]=point(angle-15,150),[bx,by]=point(angle+15,150),[cx,cy]=point(angle+15,94),[dx,dy]=point(angle-15,94);return `M ${ax} ${ay} A 150 150 0 0 1 ${bx} ${by} L ${cx} ${cy} A 94 94 0 0 0 ${dx} ${dy} Z`}

export default function ScoreWheel({arrow,count,initialMark,onUse,onDismiss}:{arrow:number;count:number;initialMark?:ScoreMark;onUse:(mark:ScoreMark)=>void;onDismiss:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),slider=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null)
 const [rotation,setRotation]=useState(()=>rotationForScore(initialMark??'X')),[dragging,setDragging]=useState(false)
 const currentRotation=useRef(rotation),title=useId(),help=useId()
 const mark=scoreForRotation(rotation),ring=scoreRing(mark),value=scorePoints(mark)
 const update=(angle:number)=>{currentRotation.current=angle;setRotation(angle)}
 useEffect(()=>{const element=dialog.current;element?.showModal();slider.current?.focus({preventScroll:true});return()=>element?.close()},[])
 function step(amount:number){const next=SCORE_MARKS[(SCORE_MARKS.indexOf(mark)+amount+12)%12];update(rotationForScore(next,currentRotation.current))}
 function pointerDown(event:React.PointerEvent<HTMLDivElement>){
  if(event.button!==0||gesture.current)return
  const box=event.currentTarget.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2
  if(Math.hypot(event.clientX-cx,event.clientY-cy)<24)return
  gesture.current={id:event.pointerId,angle:Math.atan2(event.clientX-cx,cy-event.clientY)*180/Math.PI,startRotation:currentRotation.current,x:event.clientX,y:event.clientY,cx,cy,moved:false}
  event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.focus({preventScroll:true});setDragging(true)
 }
 function pointerMove(event:React.PointerEvent<HTMLDivElement>){
  const g=gesture.current;if(!g||g.id!==event.pointerId)return
  const angle=Math.atan2(event.clientX-g.cx,g.cy-event.clientY)*180/Math.PI
  if(Math.hypot(event.clientX-g.x,event.clientY-g.y)>8)g.moved=true
  update(currentRotation.current+angleDelta(g.angle,angle));g.angle=angle
 }
 function pointerUp(event:React.PointerEvent<HTMLDivElement>){
  const g=gesture.current;if(!g||g.id!==event.pointerId)return
  gesture.current=null;setDragging(false)
  if(g.moved)update(Math.round(currentRotation.current/30)*30)
  else {const index=((Math.round((g.angle-currentRotation.current)/30)%12)+12)%12;update(rotationForScore(WHEEL_MARKS[index],currentRotation.current))}
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
 }
 function cancelPointer(){const g=gesture.current;if(g){gesture.current=null;setDragging(false);update(g.startRotation)}}
 return <dialog ref={dialog} className={w.dialog} aria-labelledby={title} aria-describedby={help} onCancel={event=>{event.preventDefault();onDismiss()}}>
  <p className={s.eyebrow}>Arrow {arrow} of {count}</p><h2 id={title}>Choose your score</h2>
  <p id={help} className={s.muted}>Spin a score to the top marker. Tap a ring or use the arrows, then confirm.</p>
  <div ref={slider} className={w.wheel} data-dragging={dragging} role="slider" tabIndex={0} aria-label={`Arrow ${arrow} score`} aria-valuemin={0} aria-valuemax={11} aria-valuenow={SCORE_MARKS.indexOf(mark)} aria-valuetext={`${mark==='M'?'Miss':mark==='X'?'X, inner ten':mark}, ${value} points, ${ring==='miss'?'gray':ring}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelPointer} onLostPointerCapture={cancelPointer} onKeyDown={event=>{
   if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Home','End'].includes(event.key)){event.preventDefault();if(event.key==='Home'||event.key==='End')update(rotationForScore(event.key==='Home'?'M':'X',currentRotation.current));else step(event.key==='ArrowUp'||event.key==='ArrowRight'?1:-1)}
  }}>
   <svg viewBox="0 0 320 320" aria-hidden="true" focusable="false">
    <g className={w.rotor} style={{transform:`rotate(${rotation}deg)`}}>
     {WHEEL_MARKS.map((score,i)=>{const [x,y]=point(i*30,122),color=scoreRing(score);return <g key={score}><path d={segment(i*30)} fill={`var(--ring-${color})`} stroke="#78818e" strokeWidth="1"/><text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={['white','yellow'].includes(color)?'#111318':'#fff'} transform={`rotate(${-rotation} ${x} ${y})`}>{score}</text></g>})}
    </g>
    <circle cx="160" cy="160" r="80" fill={`var(--ring-${ring})`}/>
    <text className={w.selected} x="160" y="151" textAnchor="middle" dominantBaseline="central" fill={['white','yellow'].includes(ring)?'#111318':'#fff'}>{mark}</text>
    <text className={w.points} x="160" y="192" textAnchor="middle" fill={['white','yellow'].includes(ring)?'#111318':'#fff'}>{value} points</text>
    <path d="M 149 2 L 171 2 L 160 21 Z" fill="#fff" stroke="#111318" strokeWidth="2"/>
   </svg>
  </div>
  <div className={w.stepper}><button type="button" aria-label="Previous score" onClick={()=>step(-1)}>−</button><p role="status" aria-live="polite">{mark==='M'?'M · Miss':mark==='X'?'X · Inner ten':`${mark} · ${ring}`}<span>{value} points</span></p><button type="button" aria-label="Next score" onClick={()=>step(1)}>+</button></div>
  <div className={w.actions}><button type="button" className={`${s.button} ${s.secondary}`} onClick={onDismiss}>Cancel</button><button type="button" className={s.button} onClick={()=>onUse(mark)}>Use {mark}</button></div>
 </dialog>
}

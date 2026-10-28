'use client'
import {useEffect,useId,useRef,useState} from 'react'
import type {Person} from '@/lib/archery/types'
import s from '@/components/attendance/Attendance.module.css'
import w from './ClassmateWheel.module.css'

const ROW=48
export default function ClassmateWheel({people,me,initialId,onChoose,onDismiss}:{people:Person[];me:string|null;initialId:string;onChoose:(id:string)=>void;onDismiss:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),wheel=useRef<HTMLDivElement>(null),id=useId()
 const [candidateId,setCandidateId]=useState(()=>people.find(p=>p.id===initialId&&p.id!==me)?.id??people.find(p=>p.id!==me)?.id??people[0]?.id??'')
 const initialIndex=useRef(Math.max(0,people.findIndex(p=>p.id===candidateId))),candidate=people.find(p=>p.id===candidateId)??people.find(p=>p.id!==me)??people[0]
 const rosterVersion=useRef(people.map(p=>p.id+p.name).join('|'))
 const eligible=Boolean(candidate&&candidate.id!==me)
 useEffect(()=>{const element=dialog.current;element?.showModal();wheel.current?.scrollTo({top:initialIndex.current*ROW,behavior:'instant'});wheel.current?.focus({preventScroll:true});return()=>element?.close()},[])
 useEffect(()=>{
  const version=people.map(p=>p.id+p.name).join('|');if(rosterVersion.current===version)return
  rosterVersion.current=version
  const index=Math.max(0,people.findIndex(p=>p.id===candidate?.id));wheel.current?.scrollTo({top:index*ROW,behavior:'instant'})
 },[people,candidate?.id])
 function chooseIndex(index:number){const person=people[index];if(!person||person.id===me)return;setCandidateId(person.id);wheel.current?.scrollTo({top:index*ROW,behavior:'instant'})}
 function navigate(key:string){
  let index=people.findIndex(p=>p.id===candidate?.id)
  const step=key==='ArrowUp'||key==='PageUp'||key==='End'?-1:1
  if(key==='Home')index=0
  else if(key==='End')index=people.length-1
  else index=Math.max(0,Math.min(people.length-1,index+step*(key.startsWith('Page')?5:1)))
  while(index>=0&&index<people.length&&people[index].id===me)index+=step
  if(index<0)index=people.findIndex(p=>p.id!==me)
  else if(index>=people.length){index=people.length-1;while(index>=0&&people[index].id===me)index--}
  chooseIndex(index)
 }
 function confirm(){if(eligible)onChoose(candidate!.id)}
 return <dialog ref={dialog} className={w.dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} onCancel={event=>{event.preventDefault();onDismiss()}}>
  <p className={s.eyebrow}>{people.length} student{people.length===1?'':'s'} in your class</p>
  <h2 id={`${id}-title`}>Choose a classmate</h2><p id={`${id}-help`} className={s.muted}>Scroll to a name, then confirm.</p>
  <div className={w.frame}>
   <div className={w.highlight} aria-hidden="true"/>
   <div ref={wheel} className={w.wheel} role="listbox" aria-label="Archery class roster" aria-orientation="vertical" aria-activedescendant={candidate?`${id}-${candidate.id}`:undefined} tabIndex={0} onScroll={event=>{
    const index=Math.max(0,Math.min(people.length-1,Math.round(event.currentTarget.scrollTop/ROW))),next=people[index]?.id??'';setCandidateId(next)
   }} onKeyDown={event=>{
    if(['ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)){event.preventDefault();navigate(event.key)}
    else if(event.key==='Enter'){event.preventDefault();confirm()}
   }}>
    {people.map((person,index)=><div id={`${id}-${person.id}`} key={person.id} role="option" aria-selected={eligible&&person.id===candidate?.id} aria-disabled={person.id===me} className={w.option} onClick={()=>chooseIndex(index)}><span>{person.name}{person.id===me?' (you)':''}</span></div>)}
   </div>
  </div>
  <p className={w.hint} role="status" aria-live="polite">{candidate?.id===me?'This is you. Choose another student to challenge.':'Your name is marked “you.” Choose any other classmate.'}</p>
  <div className={w.actions}><button type="button" className={`${s.button} ${s.secondary}`} onClick={onDismiss}>Cancel</button><button type="button" className={s.button} disabled={!eligible} onClick={confirm}>{eligible?`Choose ${candidate!.name}`:'Choose a classmate'}</button></div>
 </dialog>
}

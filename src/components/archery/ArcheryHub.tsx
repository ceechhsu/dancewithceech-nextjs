'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {attendanceApi,errorMessage} from '@/lib/attendance/client'
import {progressDate} from '@/lib/attendance/progress'
import type {ArcheryData,ArcheryTransport} from '@/lib/archery/types'
import PracticeRounds from './PracticeRounds'
import Challenges from './Challenges'
import Tournaments from './Tournaments'
import ArcheryCalendar from './ArcheryCalendar'
import DailyPracticeSummary from './DailyPracticeSummary'
import DisputeReview from './DisputeReview'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'

export type Perform=(action:string,body:Record<string,unknown>,create?:boolean)=>Promise<boolean>
export default function ArcheryHub({classId,transport,onTryStudent,startPractice=false}: {classId:string;transport?:ArcheryTransport;onTryStudent?:()=>void;startPractice?:boolean}) {
 const [data,setData]=useState<ArcheryData|null>(null),[mode,setMode]=useState<'practice'|'challenges'|'host'|'disputes'|null>(startPractice?'practice':null),[date,setDate]=useState<string|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const generation=useRef(0),locked=useRef(false),pending=useRef<{key:string;id:string}|null>(null)
 const content=useRef<HTMLElement|null>(null)
 const dayActions=useRef<HTMLElement|null>(null)
 const tournaments=useRef<HTMLElement|null>(null)
 function chooseDate(date:string){setDate(date);setMode(null);setMessage('');requestAnimationFrame(()=>{dayActions.current?.focus({preventScroll:true});dayActions.current?.scrollIntoView({block:'start',behavior:'instant'})})}
 function chooseMode(next:'practice'|'challenges'|'host'|'disputes'){
  if(!date&&data)setDate(data.today)
  setMode(next)
  requestAnimationFrame(()=>{
   content.current?.focus({preventScroll:true})
   content.current?.scrollIntoView({block:'start',behavior:'instant'})
  })
 }
 const invoke=useCallback<ArcheryTransport>((action,body={})=>transport?transport(action,{classId,...body}):attendanceApi(action==='list'?`archery?${new URLSearchParams({classId,...(typeof body.date==='string'?{date:body.date}:{})})}`:'archery',action==='list'?undefined:{action,classId,...body}),[classId,transport])
 const load=useCallback(async()=>{const version=++generation.current;const value=await invoke('list',date?{date}:{}) as ArcheryData;if(version===generation.current){setData(value);if(startPractice&&!date)setDate(value.today)}},[invoke,date,startPractice])
 const invalidate=useCallback(()=>{generation.current++},[])
 useEffect(()=>{let cancelled=false;const refresh=()=>{if(document.visibilityState!=='hidden'&&!cancelled)void load().then(()=>{if(!cancelled)setError('')}).catch(err=>{if(!cancelled)setError(errorMessage(err))})};refresh();const timer=setInterval(refresh,5000);window.addEventListener('focus',refresh);return()=>{cancelled=true;invalidate();clearInterval(timer);window.removeEventListener('focus',refresh)}},[load,invalidate])
 const perform:Perform=async(action,body,create=false)=>{
  if(locked.current)return false
  locked.current=true;setBusy(true);setError('');setMessage('')
  const key=action+JSON.stringify(body)
  if(create&&pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()}
  try{
   await invoke(action,{...body,...(create?{id:pending.current!.id}:{})})
   pending.current=null;setMessage('Saved.')
   // An accepted mutation stays successful when the follow-up read fails.
   // Forms must reset so a refresh outage cannot turn into a duplicate write.
   try{await load()}catch{setError('Saved, but refreshing the view failed. It will refresh automatically when the connection returns.')}
   return true
  }
  catch(err){setError(errorMessage(err));return false}finally{locked.current=false;setBusy(false)}
 }
 if(!data)return <section className={s.card}>{error?<><p role="alert">{error}</p><button className={s.button} onClick={()=>void load().catch(err=>setError(errorMessage(err)))}>Try again</button></>:<p role="status">Loading archery…</p>}</section>
 const incoming=data.challenges.filter(c=>c.opponent===data.me&&c.status==='pending').length
 const disputed=data.disputes?.length??0
 const selectedDate=date||(startPractice?data.today:null)
 const hasTournaments=data.tournaments.some(t=>t.event_date===selectedDate)
 return <div className={a.hub}>
  <p className={s.eyebrow}>{data.instructor?'Instructor workspace':'Your archery space'}</p>
  <h1 className={s.title}>{data.className}</h1>
  <p className={s.muted}>{data.instructor?'Choose a day to record your practice, review student scores or host a class tournament.':'Your practice, your progress. Start with a day on the calendar.'}</p>
  <ArcheryCalendar data={data} selected={selectedDate} onSelect={chooseDate}/>
  <div role="status" aria-live="polite">{incoming>0&&<p className={s.success}>You have {incoming} new challenge{incoming===1?'':'s'}.</p>}</div>
  {incoming>0&&<button className={`${s.button} ${s.secondary}`} onClick={()=>chooseMode('challenges')}>View challenges</button>}
  {data.instructor&&disputed>0&&<><p role="status" className={a.disputePending}>{disputed} disputed {disputed===1?'result needs':'results need'} your decision.</p><button className={s.button} onClick={()=>chooseMode('disputes')}>Resolve disputes</button></>}
  {selectedDate&&<section className={a.dayActions} ref={dayActions} tabIndex={-1} aria-label="Selected day">
  <p className={s.eyebrow}>{selectedDate===data.today?'Today · ':''}{progressDate(selectedDate)}</p>
  <h2 className={a.dayHeading}>Your day at the range</h2>
  {selectedDate>data.today&&<p className={s.muted}>Come back on this day to record scores. Tournaments open on the day of class.</p>}
  <DailyPracticeSummary data={data} date={selectedDate}/>
  <nav className={a.modes} aria-label="Archery modes">
   <button className={`${s.button} ${mode!=='practice'?s.secondary:''}`} aria-pressed={mode==='practice'} aria-controls="archery-mode-content" onClick={()=>chooseMode('practice')}>Individual scoring</button>
   <button className={`${s.button} ${mode!=='challenges'?s.secondary:''}`} aria-pressed={mode==='challenges'} aria-controls="archery-mode-content" onClick={()=>chooseMode('challenges')}>{data.instructor?'Review class challenges':'Challenge a classmate'}</button>
   {data.instructor&&selectedDate===data.today&&<button className={`${s.button} ${mode!=='host'?s.secondary:''}`} aria-pressed={mode==='host'} aria-controls="archery-mode-content" onClick={()=>chooseMode('host')}>Host a tournament</button>}
  </nav>
  </section>}
  {error&&<p role="alert" className={s.error}>{error}</p>}{message&&<p role="status" className={s.success}>{message}</p>}
  {selectedDate&&mode&&<section id="archery-mode-content" ref={content} tabIndex={-1} className={a.modeContent} aria-label={mode==='practice'?'Individual scoring':mode==='challenges'?'Classmate challenges':mode==='disputes'?'Dispute review':'Host tournament'}>
   <fieldset disabled={busy} className={s.progressFields}>
    {mode==='practice'?<PracticeRounds key={selectedDate} data={data} date={selectedDate} perform={perform} onTryStudent={onTryStudent}/>:mode==='challenges'?<Challenges data={data} perform={perform}/>:mode==='disputes'?<DisputeReview data={data} perform={perform}/>:<Tournaments data={data} date={selectedDate} perform={perform} hosting onCreated={()=>{setMode(null);requestAnimationFrame(()=>{tournaments.current?.focus({preventScroll:true});tournaments.current?.scrollIntoView({block:'start',behavior:'instant'})})}}/>}
   </fieldset>
  </section>}
  {selectedDate&&hasTournaments&&mode!=='disputes'&&<section ref={tournaments} tabIndex={-1} className={a.modeContent} aria-label="Day tournaments"><fieldset disabled={busy} className={s.progressFields}><Tournaments data={data} date={selectedDate} perform={perform}/></fieldset></section>}
  <p className={a.footnote}>Class date: {progressDate(data.today)} · Invitations refresh while this page is open. {data.instructor?'Your practice scores are private to you. Student scores are available for class review;':'Individual scores are visible to you and your instructor;'} brackets are visible to this class.</p>
 </div>
}

'use client'
import {useCallback,useEffect,useState} from 'react'
import {attendanceApi,errorMessage} from '@/lib/attendance/client'
import {dateLabel} from '@/lib/attendance/calendar'
import type {StudentRequest} from '@/lib/attendance/calendar'
import s from './Attendance.module.css'
type ReviewRequest=StudentRequest&{student_name:string;email:string;meeting_date:string;current_status:'present'|'absent';current_revision:number}
export default function CorrectionRequests({classId,onChanged}:{classId:string;onChanged:()=>void}) {
  const [requests,setRequests]=useState<ReviewRequest[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState('')
  const load=useCallback(async()=>{try{setRequests((await attendanceApi<{requests:ReviewRequest[]}>(`requests?classId=${encodeURIComponent(classId)}`)).requests);setError('')}catch(e){setError(errorMessage(e))}},[classId])
  useEffect(()=>{void load();const refresh=()=>{if(document.visibilityState==='visible')void load()};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[load])
  async function review(event:React.FormEvent<HTMLFormElement>,request:ReviewRequest) {
    event.preventDefault();const form=new FormData(event.currentTarget),submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null
    const decision=submitter?.value;if(decision!=='approved'&&decision!=='kept')return
    setBusy(request.id);setError('');setMessage('')
    try{await attendanceApi('requests',{action:'review',classId,requestId:request.id,decision,response:form.get('response'),expectedRevision:request.current_revision});await load();setMessage(decision==='approved'?'Correction approved. Attendance totals are updated.':'Request reviewed. The current record was kept.');onChanged()}
    catch(e){setError(errorMessage(e))}finally{setBusy(null)}
  }
  const pending=requests?.filter(r=>r.status==='pending')||[]
  return <section className={s.card} aria-label="Correction requests">
    <div className={s.spread}><h2>Correction requests{pending.length?` · ${pending.length}`:''}</h2><button className={`${s.button} ${s.secondary}`} onClick={()=>void load()}>Refresh requests</button></div>
    {error&&<p className={s.error} role="alert">{error} Refresh requests to review the latest record.</p>}
    {message&&<p className={s.success} role="status">{message}</p>}
    {!requests&&!error&&<p role="status">Loading requests…</p>}
    {requests&&!pending.length&&<p className={s.muted}>No pending requests for this class.</p>}
    <ul className={s.list}>{pending.map(r=><li key={r.id}><form onSubmit={e=>void review(e,r)}>
      <h3>{r.student_name||r.email}</h3><p className={s.muted}>{r.email} · {dateLabel(r.meeting_date)}</p>
      <p>Current: <strong>{r.current_status}</strong> → Requested: <strong>{r.requested_status}</strong></p>
      <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:'12px 0'}}>{r.explanation}</p>
      <label className={s.field}>Response to student (optional)<textarea name="response" maxLength={2000} rows={2}/></label>
      <div className={s.row}><button disabled={busy!==null} value="approved" className={s.button}>{busy===r.id?'Saving…':'Approve correction'}</button><button disabled={busy!==null} value="kept" className={`${s.button} ${s.secondary}`}>Keep current record</button></div>
    </form></li>)}</ul>
    {!!requests?.some(r=>r.status!=='pending')&&<details><summary>Reviewed requests</summary><ul className={s.list}>{requests.filter(r=>r.status!=='pending').map(r=><li key={r.id}><strong>{r.student_name||r.email} · {dateLabel(r.meeting_date)}</strong><p>{r.status==='approved'?'Correction approved':'Record kept'}</p><p>{r.explanation}</p>{r.response&&<p>Your response: {r.response}</p>}</li>)}</ul></details>}
  </section>
}

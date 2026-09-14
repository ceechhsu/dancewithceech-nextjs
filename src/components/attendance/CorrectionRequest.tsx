'use client'
import { useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import type { CalendarMeeting, StudentRequest } from '@/lib/attendance/calendar'
import s from './Attendance.module.css'
import c from './Calendar.module.css'

export default function CorrectionRequest({classId,meeting,requests,onSaved}:{classId:string;meeting:CalendarMeeting;requests:StudentRequest[];onSaved:()=>void}) {
  const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState<number|null>(null)
  const record=meeting.record
  const history=requests.filter(r=>r.meeting_id===meeting.id&&r.enrollment_id===record?.enrollment_id)
  const awaitingRefresh=sent!==null&&history.length===sent
  const pending=awaitingRefresh||history.some(r=>r.status==='pending')
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!record)return
    const form=new FormData(event.currentTarget);setBusy(true);setError('')
    try {
      await attendanceApi("requests",{action:'create',classId,meetingId:meeting.id,enrollmentId:record.enrollment_id,requested_status:form.get('requested_status'),explanation:form.get('explanation')})
      setSent(history.length);setEditing(false);onSaved()
    }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
  }
  return <div className={c.request}>
    {history.map(r=><div key={r.id} className={c.requestHistory}>
      <strong>{r.status==='pending'?'Correction requested · Pending review':r.status==='approved'?'Correction approved':'Reviewed · Record kept'}</strong>
      <p>{r.explanation}</p>
      {r.response&&<p>Instructor response: {r.response}</p>}
    </div>)}
    {awaitingRefresh&&!history.some(r=>r.status==='pending')&&<p role="status">Correction requested · Pending review</p>}
    {error&&<p className={s.error} role="alert">{error}</p>}
    {record&&meeting.status==='closed'&&!pending&&!editing&&<button className={`${s.button} ${s.secondary}`} onClick={()=>setEditing(true)}>Request a correction</button>}
    {editing&&!pending&&<form onSubmit={submit}>
      <h3>Request a correction</h3>
      <p className={s.muted}>Your attendance stays unchanged until your instructor reviews this request.</p>
      <label className={s.field}>What should your attendance be?
        <select name="requested_status" required defaultValue={record?.status==='absent'?'present':'absent'}>
          <option value={record?.status==='absent'?'present':'absent'}>{record?.status==='absent'?'Present':'Absent'}</option>
        </select>
      </label>
      <label className={s.field}>Tell your instructor what happened
        <textarea name="explanation" required minLength={3} maxLength={2000} rows={3} autoFocus />
      </label>
      <div className={s.row}><button disabled={busy} className={s.button}>{busy?'Sending…':'Send request'}</button><button disabled={busy} type="button" className={`${s.button} ${s.secondary}`} onClick={()=>setEditing(false)}>Cancel</button></div>
    </form>}
  </div>
}

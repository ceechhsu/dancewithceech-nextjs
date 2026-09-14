'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {attendanceApi,errorMessage} from '@/lib/attendance/client'
import {dateLabel} from '@/lib/attendance/calendar'
import type {ScheduleException} from '@/lib/attendance/calendar'
import type {AttendanceClass} from '@/lib/attendance/types'
import s from './Attendance.module.css'
type ScheduleData={class:AttendanceClass;exceptions:ScheduleException[]}
export default function ScheduleManager({classId,onChanged}:{classId:string;onChanged:(value:AttendanceClass)=>void}) {
  const [data,setData]=useState<ScheduleData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[cancelling,setCancelling]=useState(false)
  const reasonInput=useRef<HTMLInputElement>(null)
  const load=useCallback(async()=>{try{setData(await attendanceApi<ScheduleData>(`schedule?classId=${encodeURIComponent(classId)}`));setError('')}catch(e){setError(errorMessage(e))}},[classId])
  useEffect(()=>{void load()},[load])
  const parts=data?new Intl.DateTimeFormat('en-CA',{timeZone:data.class.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()):[]
  const p=Object.fromEntries(parts.map(v=>[v.type,v.value])),today=`${p.year}-${p.month}-${p.day}`
  async function mutate(body:object,success:string) {
    setBusy(true);setError('');setMessage('')
    try{const result=await attendanceApi<ScheduleData>('schedule',{...body,classId});setData(result);setMessage(success);setCancelling(false);onChanged(result.class)}
    catch(e){setError(errorMessage(e))}finally{setBusy(false)}
  }
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!data)return
    const form=new FormData(event.currentTarget),end=String(form.get('end_date'))
    const start=String(form.get('start_date')),shorten=end<data.class.end_date||start>data.class.start_date
    if(shorten&&!confirm(`Change ${data.class.name} to ${dateLabel(start)} – ${dateLabel(end)}? Scheduled dates outside this range will be removed. Existing attendance records will be preserved.`))return
    await mutate({action:'save',start_date:form.get('start_date'),end_date:end,days:form.getAll('days').map(Number),expectedRevision:data.class.schedule_revision,confirmShorten:shorten},'Class schedule updated. Past records are preserved.')
  }
  async function exclude(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=new FormData(event.currentTarget),date=String(form.get('date'))
    if(!confirm(`Mark ${data?.class.name} on ${dateLabel(date)} as no class? Existing check-ins will be preserved but excluded from totals.`))return
    await mutate({action:'exclude',date,kind:form.get('kind'),reason:form.get('reason')},'No-class date saved. Students will not receive an absence for this class.')
  }
  return <section className={s.card} aria-label="Class schedule">
    <div className={s.spread}><h2>Class schedule</h2><button disabled={!data||busy||data.exceptions.some(e=>e.date===today)} className={`${s.button} ${s.secondary}`} onClick={()=>{setCancelling(true);requestAnimationFrame(()=>reasonInput.current?.focus())}}>Cancel today’s class</button></div>
    {error&&<div className={s.error} role="alert"><p>{error}</p><button className={`${s.button} ${s.secondary}`} onClick={()=>void load()}>Reload schedule</button></div>}
    {message&&<p className={s.success} role="status">{message}</p>}
    {!data&&!error&&<p role="status">Loading schedule…</p>}
    {data&&<>
      <p className={s.muted}>{dateLabel(data.class.start_date)} – {dateLabel(data.class.end_date)}</p>
      {data.exceptions.some(e=>e.date===today)&&<p>No class today · {data.exceptions.find(e=>e.date===today)?.reason||'Scheduled exception'}</p>}
      {cancelling&&<form onSubmit={async event=>{event.preventDefault();if(confirm(`Cancel ${data.class.name} for today, ${dateLabel(today)}? Attendance will not count, and you can undo this.`))await mutate({action:'exclude',date:today,kind:'cancelled',reason:reasonInput.current?.value||''},'Today’s class has been cancelled.')}}>
        <h3>Cancel {data.class.name} · {dateLabel(today)}</h3><label className={s.field}>Reason (optional)<input ref={reasonInput} maxLength={2000} placeholder="For example, power outage"/></label>
        <div className={s.row}><button disabled={busy} className={`${s.button} ${s.danger}`}>Confirm cancellation</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>setCancelling(false)}>Keep class</button></div>
      </form>}
      <details><summary>Manage schedule</summary>
        <form onSubmit={save} key={data.class.schedule_revision} style={{marginTop:16}}>
          <div className={s.grid}><label className={s.field}>First class date<input name="start_date" type="date" required defaultValue={data.class.start_date}/></label><label className={s.field}>Last class date<input name="end_date" type="date" required defaultValue={data.class.end_date}/></label></div>
          <fieldset><legend>Weekly class days</legend><div className={s.days}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day,index)=><label key={day}><input type="checkbox" name="days" value={index} defaultChecked={data.class.days.includes(index)}/>{day}</label>)}</div></fieldset>
          <button disabled={busy} className={s.button}>{busy?'Saving…':'Save schedule'}</button>
        </form>
        <h3 style={{marginTop:24}}>Holidays and no-class dates</h3>
        <form onSubmit={exclude}>
          <label className={s.field}>Date<input name="date" type="date" required/></label>
          <label className={s.field}>Type<select name="kind"><option value="holiday">Holiday / planned break</option><option value="cancelled">Cancelled class</option></select></label>
          <label className={s.field}>Reason (optional)<input name="reason" maxLength={2000} placeholder="For example, Thanksgiving break"/></label>
          <button disabled={busy} className={`${s.button} ${s.secondary}`}>Add no-class date</button>
        </form>
      </details>
      {!!data.exceptions.length&&<ul className={s.list}>{data.exceptions.map(e=><li key={e.date}><div className={s.spread}><div><strong>{dateLabel(e.date)} · {e.kind==='cancelled'?'Cancelled':'No class'}</strong>{e.reason&&<p>{e.reason}</p>}</div><button disabled={busy} className={`${s.button} ${s.secondary}`} onClick={()=>{if(confirm(`Restore ${data.class.name} on ${dateLabel(e.date)}? Existing attendance returns to totals. Missing attendance will stay pending for your review; no QR window is reopened.`))void mutate({action:'restore',date:e.date},'Class date restored. Review any pending attendance; no new absences were added.')}}>Undo</button></div></li>)}</ul>}
    </>}
  </section>
}

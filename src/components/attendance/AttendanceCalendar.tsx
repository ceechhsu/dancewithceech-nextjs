'use client'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { calendarBounds,calendarMonth,calendarDay,checkInTime,dateLabel,dayLabels,monthLabel,semesterSummary,shiftMonth } from '@/lib/attendance/calendar'
import type { CalendarData } from '@/lib/attendance/calendar'
import CorrectionRequest from './CorrectionRequest'
import s from './Attendance.module.css'
import c from './Calendar.module.css'

export default function AttendanceCalendar({data,onRefresh}:{data:CalendarData;onRefresh:()=>void}) {
  const bounds=calendarBounds(data)
  const initialMonth=data.today.slice(0,7)<bounds.first?bounds.first:data.today.slice(0,7)>bounds.last?bounds.last:data.today.slice(0,7)
  const [month,setMonth]=useState(initialMonth),[view,setView]=useState<'calendar'|'list'>('calendar'),[selected,setSelected]=useState<string|null>(null)
  const detail=useRef<HTMLElement>(null)
  const shownMonth=month<bounds.first?bounds.first:month>bounds.last?bounds.last:month
  const days=calendarMonth(data,shownMonth),summary=semesterSummary(data)
  const selectedDay=selected?calendarDay(data,selected):null
  function choose(date:string) {setSelected(date);requestAnimationFrame(()=>{detail.current?.focus();detail.current?.scrollIntoView({block:'nearest',behavior:'auto'})})}
  function changeMonth(amount:number) {setMonth(shiftMonth(shownMonth,amount));setSelected(null)}
  const list=days.filter(day=>day&&day.state!=='none')
  return <>
    <div className={s.spread}>
      <div><p className={s.eyebrow}>{data.class.college}</p><h1 className={s.title}>{data.class.name}</h1></div>
      <div className={c.toggle} aria-label="Attendance view">
        <button aria-pressed={view==='calendar'} onClick={()=>setView('calendar')}>Calendar</button>
        <button aria-pressed={view==='list'} onClick={()=>setView('list')}>List</button>
      </div>
    </div>
    <p className={s.muted}>{data.class.term} {data.class.year} · Times shown in {data.class.timezone.replaceAll('_',' ')}</p>
    <section className={c.calendar} aria-label={`${data.class.name} attendance calendar`}>
      <div className={c.monthBar}>
        <button aria-label="Previous month" disabled={shownMonth<=bounds.first} onClick={()=>changeMonth(-1)}><ChevronLeft aria-hidden="true" size={22}/></button>
        <h2 aria-live="polite">{monthLabel(shownMonth)}</h2>
        <button aria-label="Next month" disabled={shownMonth>=bounds.last} onClick={()=>changeMonth(1)}><ChevronRight aria-hidden="true" size={22}/></button>
      </div>
      {view==='calendar'?<>
        <div className={c.weekdays} aria-hidden="true">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d}>{d}</span>)}</div>
        <div className={c.monthGrid}>
          {days.map((day,index)=>day?<button key={day.date} className={`${c.day} ${c[day.state]} ${selected===day.date?c.selected:''}`} aria-label={`${dateLabel(day.date)}${day.today?', Today':''}: ${dayLabels[day.state]}`} aria-pressed={selected===day.date} onClick={()=>choose(day.date)}>
            <span className={c.dateNumber}>{day.day}{day.state==='present'?<Check size={14} aria-hidden="true"/>:day.state==='absent'?<X size={14} aria-hidden="true"/>:null}</span>
            <span className={c.dayText}>{day.today?'Today':day.state==='none'?'—':day.state==='holiday'?'No class':day.state==='upcoming'?'Next':day.state==='cancelled'?'Cancelled':day.state==='mixed'?'Mixed':dayLabels[day.state]}</span>
          </button>:<span key={`blank-${index}`} aria-hidden="true"/>)}
        </div>
        <div className={c.legend} aria-label="Calendar key">
          <span><i className={c.present}/>✓ Present</span><span><i className={c.absent}/>Absent</span><span><i className={c.upcoming}/>Upcoming</span><span><i className={c.none}/>No class</span><span>Pending = not finalized</span>
        </div>
      </>:<ul className={c.entries}>
        {list.length?list.map(day=>day&&<li key={day.date}><button onClick={()=>choose(day.date)} aria-pressed={selected===day.date}>
          <span><strong>{dateLabel(day.date)}</strong>{day.meetings.filter(m=>m.record?.checked_in_at).map(m=><span key={m.id} className={c.listTime}>Checked in · {checkInTime(m.record!.checked_in_at,data.class.timezone)}</span>)}</span>
          <span className={`${c.badge} ${c[day.state]}`}>{dayLabels[day.state]}</span>
        </button></li>):<li className={s.muted}>No scheduled classes this month.</li>}
      </ul>}
      <div className={c.summary} aria-label="Semester summary">
        {(['present','absent','remaining'] as const).map(key=><div key={key}><strong>{summary[key]}</strong><span>{key==='present'?'Present':key==='absent'?'Absent':'Remaining'}</span></div>)}
      </div>
      <p className={c.footnote}>Semester summary · Present counts as soon as you check in. Absent counts after the attendance window closes. Holidays and cancellations are excluded.</p>
    </section>
    {selectedDay&&<section className={`${s.card} ${c.detail}`} ref={detail} tabIndex={-1} aria-label="Attendance details">
      <p className={s.eyebrow}>{data.class.college} · {data.class.name}</p>
      <h2>{dateLabel(selectedDay.date)}</h2>
      <p><span className={`${c.badge} ${c[selectedDay.state]}`}>{dayLabels[selectedDay.state]}</span></p>
      {selectedDay.reason&&<p>{selectedDay.reason}</p>}
      {selectedDay.state==='upcoming'&&<p>Class starts at {checkInTime(`${selectedDay.date}T${data.class.start_time.slice(0,5)}:00Z`,'UTC')}. Scan your instructor’s QR code in class to check in.</p>}
      {selectedDay.state==='pending'&&<p>Your instructor has not finalized this attendance record. This is not counted as an absence.</p>}
      {selectedDay.meetings.map((meeting,index)=><div key={meeting.id} className={c.sessionDetail}>
        {selectedDay.meetings.length>1&&<h3>Session {index+1} · {meeting.status==='cancelled'?'Cancelled':meeting.record?.status==='present'?'Present':meeting.record?.status==='absent'?'Absent':'Pending'}</h3>}
        {meeting.record?.checked_in_at&&<p>Checked in · {checkInTime(meeting.record.checked_in_at,data.class.timezone)}</p>}
        {!meeting.record?.checked_in_at&&meeting.record?.status==='present'&&<p className={s.muted}>{meeting.record.source==='manual'?'Marked present by your instructor. No check-in time recorded.':'Original check-in time unavailable.'}</p>}
        {meeting.status==='open'&&<p className={s.muted}>{meeting.record?.status==='present'?'Your check-in is included in your Present total. The attendance window is still open.':'The attendance window is still open. You are not counted as absent while it is open.'}</p>}
        {meeting.status!=='cancelled'&&!['holiday','cancelled'].includes(selectedDay.state)&&<CorrectionRequest key={`${meeting.id}-${meeting.record?.revision}`} classId={data.class.id} meeting={meeting} requests={data.requests} onSaved={onRefresh}/>}
      </div>)}
      {!selectedDay.meetings.length&&selectedDay.state==='none'&&<p>No class is scheduled for this date.</p>}
    </section>}
  </>
}

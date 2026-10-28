'use client'
import {useState} from 'react'
import {monthCells,moveMonth,monthTitle} from '@/lib/archery/calendar'
import {progressDate} from '@/lib/attendance/progress'
import type {ArcheryData} from '@/lib/archery/types'
import s from '@/components/attendance/Attendance.module.css'
import a from './Archery.module.css'

export default function ArcheryCalendar({data,selected,onSelect}:{data:ArcheryData;selected:string|null;onSelect:(date:string)=>void}){
 const [month,setMonth]=useState(data.today.slice(0,7))
 return <section className={`${s.card} ${a.calendar}`} aria-label="Archery calendar">
  <div className={a.calendarHeader}>
   <button type="button" className={a.monthArrow} aria-label="Previous month" onClick={()=>setMonth(moveMonth(month,-1))}>‹</button>
   <h2 aria-live="polite">{monthTitle(month)}</h2>
   <button type="button" className={a.monthArrow} aria-label="Next month" onClick={()=>setMonth(moveMonth(month,1))}>›</button>
  </div>
  <div className={a.calendarGrid}>
   {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><span className={a.weekday} key={day}>{day}</span>)}
   {monthCells(month).map((date,i)=>{
    if(!date)return <span key={`empty-${i}`}/>
    const rounds=(data.roundDays?.[date]??data.rounds.filter(r=>r.entry_date===date).length)+(data.personalRoundDays?.[date]??0),tournaments=data.tournamentDays?.[date]??data.tournaments.filter(t=>t.event_date===date).length
    const disabled=date<data.earliestDate||Boolean(data.classEndDate&&date>data.classEndDate)
    return <button key={date} type="button" disabled={disabled} data-date={date} aria-label={`${progressDate(date)}${date===data.today?', today':''}${rounds?`, ${rounds} practice round${rounds===1?'':'s'}`:''}${tournaments?`, ${tournaments} tournament${tournaments===1?'':'s'}`:''}`} aria-pressed={selected===date} aria-current={date===data.today?'date':undefined} className={`${a.calendarDay} ${date===data.today?a.today:''} ${selected===date?a.selectedDay:''}`} onClick={()=>onSelect(date)}>
     <span>{Number(date.slice(-2))}</span><span className={a.dayMarkers} aria-hidden="true">{rounds>0&&<i className={a.practiceDot}/>} {tournaments>0&&<i className={a.tournamentDot}/>}</span>
    </button>
   })}
  </div>
  <div className={a.calendarFooter}><p><i className={a.practiceDot}/> Practice <i className={a.tournamentDot}/> Tournament</p><button type="button" className={a.todayLink} onClick={()=>{setMonth(data.today.slice(0,7));onSelect(data.today)}}>Today</button></div>
  <p className={s.muted}>Choose a day to record practice or join a tournament.</p>
 </section>
}

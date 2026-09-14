'use client'
import { useCallback, useEffect, useState } from 'react'
import { attendanceApi, AttendanceApiError, errorMessage } from '@/lib/attendance/client'
import type { CalendarData } from '@/lib/attendance/calendar'
import type { AttendanceClass } from '@/lib/attendance/types'
import AttendanceCalendar from './AttendanceCalendar'
import GoogleLogin from './GoogleLogin'
import s from './Attendance.module.css'

function ClassHistory({classId}:{classId:string}) {
  const [data,setData]=useState<CalendarData|null>(null),[error,setError]=useState(''),[login,setLogin]=useState(false)
  const load=useCallback(async()=>{
    try {const value=await attendanceApi<CalendarData>(`calendar?classId=${encodeURIComponent(classId)}`);setData(value);setError('');setLogin(false)}
    catch(e){setError(errorMessage(e));if(e instanceof AttendanceApiError&&e.status===401){setLogin(true);setData(null)}}
  },[classId])
  useEffect(()=>{
    const initial=setTimeout(()=>void load(),0)
    const refresh=()=>{if(document.visibilityState==='visible')void load()}
    window.addEventListener('focus',refresh)
    const timer=setInterval(refresh,30000)
    return()=>{clearTimeout(initial);window.removeEventListener('focus',refresh);clearInterval(timer)}
  },[load])
  if(login)return <GoogleLogin returnTo={`/attendance/history/${classId}`}/>
  return <>
    <a href="/dashboard">← My Classes</a>
    {error&&<div className={s.error} role="alert"><p>{error}</p><button className={`${s.button} ${s.secondary}`} onClick={()=>void load()}>Try again</button></div>}
    {!data&&!error&&<p role="status">Loading your attendance…</p>}
    {data&&<AttendanceCalendar data={data} onRefresh={()=>void load()}/>}
  </>
}
function HistoryClasses() {
  const [classes,setClasses]=useState<AttendanceClass[]|null>(null),[error,setError]=useState(''),[login,setLogin]=useState(false)
  useEffect(()=>{
    let active=true
    Promise.all([attendanceApi<{classes:AttendanceClass[]}>('classes'),attendanceApi<{classes:AttendanceClass[]}>('history')]).then(([current,past])=>{
      if(active)setClasses([...new Map([...past.classes,...current.classes].map(c=>[c.id,c])).values()])
    }).catch(e=>{if(active){setError(errorMessage(e));setLogin(e instanceof AttendanceApiError&&e.status===401)}})
    return()=>{active=false}
  },[])
  if(login)return <GoogleLogin returnTo="/attendance/history"/>
  return <><h1 className={s.title}>My attendance</h1><p>Choose a class to view your calendar and attendance details.</p>
    {error&&<p className={s.error} role="alert">{error}</p>}
    {!classes&&!error&&<p role="status">Loading your classes…</p>}
    {classes?.length===0&&<p className={s.card}>No classes found for your Google account.</p>}
    <div className={s.grid}>{classes?.map(c=><article className={s.card} key={c.id}><p className={s.eyebrow}>{c.college}</p><h2>{c.name}</h2><p>{c.term} {c.year}</p><a href={`/attendance/history/${c.id}`}>View attendance →</a></article>)}</div>
  </>
}
export default function AttendanceHistory({classId}:{classId?:string}) {
  return classId?<ClassHistory key={classId} classId={classId}/>:<HistoryClasses/>
}

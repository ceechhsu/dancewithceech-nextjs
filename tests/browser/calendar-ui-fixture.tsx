// Isolated visual fixture: fictional records only, never imported by the application.
import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import AttendanceCalendar from '../../src/components/attendance/AttendanceCalendar'
import ScheduleManager from '../../src/components/attendance/ScheduleManager'
import CorrectionRequests from '../../src/components/attendance/CorrectionRequests'
import type {CalendarData} from '../../src/lib/attendance/calendar'
import s from '../../src/components/attendance/Attendance.module.css'
const data:CalendarData={class:{id:'fixture',name:'Hip Hop',college:'Cabrillo College',instructor_email:'teacher@example.com',location_label:'Studio',term:'Fall',year:2026,start_date:'2026-09-01',end_date:'2026-12-18',days:[2,4],start_time:'09:30:00',end_time:'11:00:00',timezone:'America/Los_Angeles',archived:false,schedule_revision:1},today:'2026-09-13',now:'2026-09-13T19:00:00Z',enrollments:[{id:'e',effective_from:'2026-09-01',effective_to:null}],exceptions:[{date:'2026-09-15',kind:'holiday',reason:'Planned break'},{date:'2026-09-17',kind:'cancelled',reason:'Power outage'}],requests:[],meetings:[{id:'m1',meeting_date:'2026-09-01',status:'closed',record:{meeting_id:'m1',enrollment_id:'e',status:'present',source:'check_in',revision:1,updated_at:'2026-09-01T16:32:00Z',checked_in_at:'2026-09-01T16:32:00Z'}},{id:'m2',meeting_date:'2026-09-03',status:'closed',record:{meeting_id:'m2',enrollment_id:'e',status:'absent',source:'finalized',revision:1,updated_at:'2026-09-03T17:00:00Z',checked_in_at:null}}]}
window.fetch=async(input,init)=>{
 const url=String(input),body=init?.body?JSON.parse(String(init.body)):null
 if(url.includes('/requests')){
  if(body?.action==='create')data.requests.push({id:'req',meeting_id:body.meetingId,enrollment_id:'e',requested_status:body.requested_status,explanation:body.explanation,status:'pending',response:null,created_at:new Date().toISOString(),reviewed_at:null})
  if(body?.action==='review'){const r=data.requests.find(r=>r.id===body.requestId)!;r.status=body.decision;r.response=body.response; if(body.decision==='approved')data.meetings[1].record!.status=r.requested_status}
  return Response.json({requests:data.requests.map(r=>({...r,student_name:'Jordan Sample',email:'jordan@example.com',meeting_date:'2026-09-03',current_status:data.meetings[1].record!.status,current_revision:1}))})
 }
 if(url.includes('/schedule')){
  if(body?.action==='save')Object.assign(data.class,{start_date:body.start_date,end_date:body.end_date,days:body.days,schedule_revision:(data.class.schedule_revision||1)+1})
  if(body?.action==='exclude')data.exceptions.push({date:body.date,kind:body.kind,reason:body.reason})
  if(body?.action==='restore')data.exceptions=data.exceptions.filter(e=>e.date!==body.date)
  return Response.json({class:data.class,exceptions:data.exceptions})
 }
 return Response.json(data)
}
function App(){const[revision,setRevision]=useState(0);const refresh=()=>setRevision(n=>n+1);return <main className={s.shell}><p style={{color:'#b8bec8'}}>Visual test · Fictional student · No real records changed</p><header className={s.header}><a href="#">DWC</a><span>Welcome, Jordan</span><span aria-label="Menu">☰</span></header><AttendanceCalendar data={{...data}} onRefresh={refresh}/><h2>Instructor controls — test fixture</h2><ScheduleManager classId="fixture" onChanged={refresh}/><CorrectionRequests key={revision} classId="fixture" onChanged={refresh}/></main>}
createRoot(document.getElementById('root')!).render(<App/>);

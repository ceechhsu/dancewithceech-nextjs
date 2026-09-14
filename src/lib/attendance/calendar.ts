import type { AttendanceClass, AttendanceRecord } from './types'

export interface ScheduleException { date: string; kind: 'holiday' | 'cancelled'; reason: string }
export interface StudentRequest {
  id: string; meeting_id: string; enrollment_id: string; requested_status: 'present' | 'absent';
  explanation: string; status: 'pending' | 'approved' | 'kept'; response: string | null;
  created_at: string; reviewed_at: string | null;
}
export interface CalendarMeeting {
  id: string; meeting_date: string; status: 'open' | 'closed' | 'cancelled'; record: AttendanceRecord | null;
}
export interface CalendarData {
  class: AttendanceClass; today: string; now: string;
  enrollments: { id: string; effective_from: string; effective_to: string | null }[];
  exceptions: ScheduleException[]; meetings: CalendarMeeting[]; requests: StudentRequest[];
}
export type DayState = 'present' | 'absent' | 'upcoming' | 'pending' | 'cancelled' | 'holiday' | 'none' | 'mixed'
export const dayLabels: Record<DayState,string> = {present:'Present',absent:'Absent',upcoming:'Upcoming',pending:'Pending',cancelled:'Cancelled',holiday:'No class',none:'No class',mixed:'Mixed results'}
export interface CalendarDay { date: string; day: number; state: DayState; meetings: CalendarMeeting[]; reason?: string; today: boolean }

// Date-only values stay in UTC arithmetic; attendance instants use the class timezone.
const dateValue = (date: string) => new Date(`${date}T12:00:00Z`)
export function shiftMonth(month: string, amount: number) {
  const value=dateValue(`${month}-01`);value.setUTCMonth(value.getUTCMonth()+amount);return value.toISOString().slice(0,7)
}
export function calendarBounds(data: CalendarData) {
  const dates=[data.class.start_date,data.class.end_date,...data.meetings.map(m=>m.meeting_date)].sort()
  return {first:dates[0].slice(0,7),last:dates[dates.length-1].slice(0,7)}
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(dateValue(date))
}
export function monthLabel(month: string) {
  return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(dateValue(`${month}-01`))
}
export function checkInTime(timestamp: string | null | undefined, timezone: string) {
  if(!timestamp)return null
  return new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(timestamp)).toLowerCase()
}
function enrolled(data: CalendarData,date: string) {
  return data.enrollments.some(e=>date>=e.effective_from&&(!e.effective_to||date<=e.effective_to))
}
function scheduled(data: CalendarData,date: string) {
  const c=data.class
  return date>=c.start_date&&date<=c.end_date&&c.days.includes(dateValue(date).getUTCDay())&&enrolled(data,date)
}
function beforeClass(data: CalendarData,date:string) {
  if(date!==data.today)return date>data.today
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:data.class.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(data.now))
  return time<data.class.start_time.slice(0,5)
}
export function calendarDay(data:CalendarData,date:string):CalendarDay {
  const meetings=data.meetings.filter(m=>m.meeting_date===date&&(m.record||enrolled(data,date)))
  const exception=data.exceptions.find(e=>e.date===date)
  const active=meetings.filter(m=>m.status!=='cancelled')
  let state:DayState='none'
  if(exception) state=exception.kind
  else if(active.length) {
    const states=new Set(active.map(m=>m.record?.status==='present'?'present':m.status==='closed'&&m.record?.status==='absent'?'absent':'pending'))
    state=states.size>1?'mixed':[...states][0] as DayState
  } else if(meetings.length)state='cancelled'
  else if(scheduled(data,date)&&!data.class.archived)state=beforeClass(data,date)?'upcoming':'pending'
  return {date,day:Number(date.slice(-2)),state,meetings,reason:exception?.reason,today:date===data.today}
}
export function calendarMonth(data:CalendarData,month:string):(CalendarDay|null)[] {
  const start=dateValue(`${month}-01`)
  const count=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate()
  const cells:(CalendarDay|null)[]=Array(start.getUTCDay()).fill(null)
  for(let n=1;n<=count;n++)cells.push(calendarDay(data,`${month}-${String(n).padStart(2,'0')}`))
  while(cells.length%7)cells.push(null)
  return cells
}
export function semesterSummary(data:CalendarData) {
  const result={present:0,absent:0,remaining:0}
  const excluded=new Set(data.exceptions.map(e=>e.date))
  for(const m of data.meetings) {
    if(m.status==='cancelled'||!m.record||excluded.has(m.meeting_date)||!enrolled(data,m.meeting_date))continue
    // Confirmed presence is immediate; absence waits for finalization.
    if(m.record.status==='present'||m.status==='closed')result[m.record.status]++
  }
  if(!data.class.archived) {
    const end=dateValue(data.class.end_date),current=dateValue(data.class.start_date)
    while(current<=end) {
      const date=current.toISOString().slice(0,10)
      if(scheduled(data,date)&&beforeClass(data,date)&&!excluded.has(date)&&!data.meetings.some(m=>m.meeting_date===date))result.remaining++
      current.setUTCDate(current.getUTCDate()+1)
    }
  }
  return result
}

import { calendarDay, semesterSummary, type CalendarData, type DayState } from '../attendance/calendar'
import type { AttendanceRecord } from '../attendance/types'
export const OWNER_CLASSES = [
 {id:'85031666-dc8f-4f0f-9c73-efa2e5f0e397',name:'Mission Weight Training',college:'Mission College'},
 {id:'c2dc52af-fcd7-4a22-93b3-bee9bbcdc114',name:'Mission Hip Hop',college:'Mission College'},
 {id:'627c78c6-6a49-4b61-85fd-89181a1d6645',name:'West Valley Hip Hop',college:'West Valley College'},
 {id:'f69a5511-26f5-42c0-b66c-05e99e3242da',name:'Cabrillo Hip Hop',college:'Cabrillo College'},
] as const
const OWNER='dancewithceech@gmail.com'
export type ClassInfo = {id:string;name:string;college:string;instructor_email:string;term:string;year:number;archived:boolean;timezone:string;start_date:string;end_date:string;days:number[];start_time:string}
export type ClassEnrollment = {id:string;name:string;first_name:string|null;last_name:string|null;email:string|null;google_sub:string|null;effective_from:string;effective_to:string|null;removed_at:string|null}
export type ClassMeeting = {id:string;meeting_date:string;status:'open'|'closed'|'cancelled'}
export type ClassData = {enrollments:ClassEnrollment[];meetings:ClassMeeting[];records:AttendanceRecord[];exceptions:{date:string;kind:'holiday'|'cancelled'}[]}
export type ClassHistory = {id:string;date:string;state:DayState;label:string;source:string;checkedInAt:string|null;eligible:boolean}
export type ClassStudent = {id:string;name:string;email:string|null;account:string|null;effectiveFrom:string;summary:{present:number;absent:number;remaining:number};history:ClassHistory[]}
export type ClassView = {class:Pick<ClassInfo,'id'|'name'|'college'|'term'|'year'|'timezone'>;students:ClassStudent[];generatedAt:string}
export class ClassViewError extends Error {constructor(public status:number){super(status===404?'Class not found.':'Class records are temporarily unavailable.')}}
const sourceLabels={check_in:'Check-in',manual:'Instructor marked',finalized:'Finalized',instructor_credit:'Instructor credit'}
export function buildClassView(info:ClassInfo,data:ClassData,now=new Date().toISOString()):ClassView {
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:info.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now))
 const students=data.enrollments.filter(e=>!e.effective_to&&!e.removed_at).map(e=>{
  const records=new Map(data.records.filter(r=>r.enrollment_id===e.id).map(r=>[r.meeting_id,r]))
  const calendar:CalendarData={class:{...info,location_label:'',end_time:''},today,now,enrollments:[e],exceptions:data.exceptions.map(x=>({...x,reason:''})),requests:[],meetings:data.meetings.map(m=>({...m,record:records.get(m.id)??null}))}
  const sub=e.google_sub?.startsWith('google:')?e.google_sub.slice(7):e.google_sub
  const account=sub&&/^[a-zA-Z0-9_-]{1,255}$/.test(sub)?'google:'+sub:null
  const history=data.meetings.filter(m=>m.meeting_date>=e.effective_from||records.has(m.id)).map(m=>{
   const record=records.get(m.id),day=calendarDay(calendar,m.meeting_date)
   const eligible=m.meeting_date>=e.effective_from&&(!e.effective_to||m.meeting_date<=e.effective_to)
   const state:DayState=day.state==='holiday'?'holiday':m.status==='cancelled'?'cancelled':day.state
   const label=state==='holiday'?'No class':state==='cancelled'?'Cancelled':!record?(m.status==='open'?'Pending':'No record'):state==='present'?'Present':state==='absent'?'Absent':state==='mixed'?'Mixed results':'Pending'
   return {id:m.id,date:m.meeting_date,state,label,source:record?sourceLabels[record.source]:'No saved record',checkedInAt:record?.checked_in_at??null,eligible}
  }).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))
  return {id:e.id,name:[e.first_name,e.last_name].filter(Boolean).join(' ').trim()||e.name||'Unnamed student',email:e.email||null,account,effectiveFrom:e.effective_from,summary:semesterSummary(calendar),history}
 }).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id))
 return {class:{id:info.id,name:info.name,college:info.college,term:info.term,year:info.year,timezone:info.timezone},students,generatedAt:now}
}
export interface ClassStore {classInfo(id:string):Promise<ClassInfo|null>;classData(id:string):Promise<ClassData>}
export async function loadClassView(id:string,deps:{authorize:()=>Promise<void>;getStore:()=>ClassStore;now?:()=>string}):Promise<ClassView> {
 await deps.authorize()
 if(!OWNER_CLASSES.some(c=>c.id===id))throw new ClassViewError(404)
 const store=deps.getStore(),info=await store.classInfo(id)
 if(!info||info.id!==id||info.instructor_email.trim().toLowerCase()!==OWNER||info.term!=='Fall'||info.year!==2026||info.archived)throw new ClassViewError(404)
 return buildClassView(info,await store.classData(id),deps.now?.())
}

import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerKey } from '@/lib/supabase-server-key'
import { requireOwner } from './server'
import { loadClassView, ClassViewError, type ClassInfo, type ClassEnrollment, type ClassMeeting, type ClassData, type ClassStore } from './classes'
import type { AttendanceRecord } from '../attendance/types'
type Page<T>={data:T[]|null;error:unknown;count:number|null}
async function all<T>(page:(from:number,to:number)=>PromiseLike<Page<T>>):Promise<T[]> {
 const rows:T[]=[]
 while(true){const {data,error,count}=await page(rows.length,rows.length+999);if(error||!data||count===null)throw new ClassViewError(503);rows.push(...data);if(rows.length>=count)return rows;if(!data.length)throw new ClassViewError(503)}
}
function classStore():ClassStore {
 const url=process.env.ATTENDANCE_SUPABASE_URL||process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=process.env.ATTENDANCE_SUPABASE_URL?process.env.ATTENDANCE_SUPABASE_SERVICE_ROLE_KEY:getSupabaseServerKey()
 if(!url||!key)throw new ClassViewError(503)
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(10000)})}})
 return {
  async classInfo(id){
   const {data,error}=await db.from('attendance_classes').select('id,name,college,instructor_email,term,year,archived,timezone,start_date,end_date,days,start_time').eq('id',id).eq('instructor_email','dancewithceech@gmail.com').eq('term','Fall').eq('year',2026).eq('archived',false).maybeSingle()
   if(error)throw new ClassViewError(503)
   return data as ClassInfo|null
  },
  async classData(id){
   const [enrollments,meetings,exceptions]=await Promise.all([
    all<ClassEnrollment>((from,to)=>db.from('attendance_enrollments').select('id,name,first_name,last_name,email,google_sub,effective_from,effective_to,removed_at',{count:'exact'}).eq('class_id',id).is('effective_to',null).is('removed_at',null).order('id').range(from,to)),
    all<ClassMeeting>((from,to)=>db.from('attendance_meetings').select('id,meeting_date,status',{count:'exact'}).eq('class_id',id).is('merged_into',null).order('meeting_date').order('id').range(from,to)),
    all<ClassData['exceptions'][number]>((from,to)=>db.from('attendance_schedule_exceptions').select('date,kind',{count:'exact'}).eq('class_id',id).order('date').range(from,to)),
   ])
   const records=enrollments.length&&meetings.length?await all<AttendanceRecord>((from,to)=>db.from('attendance_records').select('meeting_id,enrollment_id,status,source,revision,updated_at,checked_in_at',{count:'exact'}).in('meeting_id',meetings.map(m=>m.id)).in('enrollment_id',enrollments.map(e=>e.id)).order('meeting_id').order('enrollment_id').range(from,to)):[]
   return {enrollments,meetings,exceptions,records}
  },
 }
}
export const loadOwnerClass=(id:string)=>loadClassView(id,{authorize:requireOwner,getStore:classStore})

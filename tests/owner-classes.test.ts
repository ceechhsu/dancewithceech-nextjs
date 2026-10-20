import test from 'node:test'
import assert from 'node:assert/strict'
import { buildClassView, loadClassView, OWNER_CLASSES, type ClassInfo, type ClassData } from '../src/lib/owner-dashboard/classes'
const info:ClassInfo={...OWNER_CLASSES[0],instructor_email:'dancewithceech@gmail.com',term:'Fall',year:2026,archived:false,timezone:'America/Los_Angeles',start_date:'2026-09-01',end_date:'2026-12-15',days:[1,3],start_time:'10:00:00'}
const student={id:'student-a',name:'Saved Name',first_name:'Ada',last_name:'Dancer',email:'ada@example.invalid',google_sub:'google:123',effective_from:'2026-09-02',effective_to:null,removed_at:null}
const rec=(meeting_id:string,status:'present'|'absent',source='check_in')=>({meeting_id,enrollment_id:'student-a',status,source:source as 'check_in'|'instructor_credit',revision:1,updated_at:'2026-10-20T16:00:00Z',checked_in_at:null})
const data:ClassData={enrollments:[student,{...student,id:'student-b',name:'New Student',first_name:null,last_name:null,email:null,google_sub:null},{...student,id:'removed',removed_at:'2026-10-01T00:00:00Z'}],meetings:[{id:'early',meeting_date:'2026-09-01',status:'closed'},{id:'credit',meeting_date:'2026-10-05',status:'closed'},{id:'absent',meeting_date:'2026-10-07',status:'closed'},{id:'pending',meeting_date:'2026-10-12',status:'open'},{id:'missing',meeting_date:'2026-10-14',status:'closed'},{id:'cancelled',meeting_date:'2026-10-16',status:'cancelled'},{id:'holiday',meeting_date:'2026-10-19',status:'closed'}],records:[rec('early','present'),rec('credit','present','instructor_credit'),rec('absent','absent'),rec('pending','absent'),rec('cancelled','present'),rec('holiday','present')],exceptions:[{date:'2026-10-19',kind:'holiday'}]}
test('class history reuses existing attendance semantics and includes unlinked students',()=>{
 const view=buildClassView(info,data,'2026-10-20T17:00:00Z')
 assert.equal(view.students.length,2)
 const a=view.students.find(s=>s.id==='student-a')!
 assert.equal(a.name,'Ada Dancer');assert.equal(a.account,'google:123');assert.equal(a.summary.present,1);assert.equal(a.summary.absent,1)
 assert.equal(a.history.find(h=>h.id==='credit')!.source,'Instructor credit')
 assert.equal(a.history.find(h=>h.id==='pending')!.state,'pending')
 assert.equal(a.history.find(h=>h.id==='missing')!.label,'No record')
 assert.equal(a.history.find(h=>h.id==='cancelled')!.state,'cancelled')
 assert.equal(a.history.find(h=>h.id==='holiday')!.state,'holiday')
 assert.equal(a.history.find(h=>h.id==='early')!.eligible,false)
 const b=view.students.find(s=>s.id==='student-b')!
 assert.equal(b.account,null);assert.equal(b.email,null);assert.equal(b.summary.absent,0)
 assert.ok(!('records' in view));assert.ok(!('instructor_email' in view.class))
})
test('owner authorization and manifest scope run before constructing a class store',async()=>{
 let constructed=0
 const getStore=()=>{constructed++;throw new Error('storage reached')}
 await assert.rejects(loadClassView(OWNER_CLASSES[0].id,{authorize:async()=>{throw new Error('denied')},getStore}),/denied/)
 await assert.rejects(loadClassView('outside-scope',{authorize:async()=>{},getStore}),/Class not found/)
 assert.equal(constructed,0)
})
test('wrong owner, term or archive state cannot load student records',async()=>{
 let reads=0
 for(const change of [{instructor_email:'other@example.invalid'},{term:'Spring'},{year:2025},{archived:true}]) {
 await assert.rejects(loadClassView(info.id,{authorize:async()=>{},getStore:()=>({classInfo:async()=>({...info,...change}),classData:async()=>{reads++;return data}})}),/Class not found/)
 }
 assert.equal(reads,0)
})

test('a cancelled meeting stays cancelled even when another meeting on that date is present',()=>{
 const sameDay={...data,meetings:[{id:'cancelled',meeting_date:'2026-10-05',status:'cancelled' as const},{id:'credit',meeting_date:'2026-10-05',status:'closed' as const}],records:[rec('cancelled','present'),rec('credit','present','instructor_credit')],exceptions:[]}
 const student=buildClassView(info,sameDay,'2026-10-20T17:00:00Z').students.find(s=>s.id==='student-a')!
 assert.equal(student.summary.present,1)
 assert.equal(student.history.find(h=>h.id==='cancelled')!.label,'Cancelled')
 const holiday=buildClassView(info,{...sameDay,exceptions:[{date:'2026-10-05',kind:'holiday'}]},'2026-10-20T17:00:00Z').students.find(s=>s.id==='student-a')!
 assert.equal(holiday.history.find(h=>h.id==='cancelled')!.label,'No class')
})

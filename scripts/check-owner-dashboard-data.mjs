// Full local production HTTP -> Supabase SDK -> synthetic PostgREST fixture QA.
// Every backend URL and key here is a loopback fixture. Never points at production.
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import { encode } from 'next-auth/jwt'
const origin='http://127.0.0.1:3151', database='http://127.0.0.1:3152'
const classId='85031666-dc8f-4f0f-9c73-efa2e5f0e397'
const calls=[]
let failTrainer=false, failHistorical=false, failRoster=false, incompleteClasses=false
const fixtures={
  attendance_classes:[{id:classId,name:'Mission Weight Training',college:'Mission College',instructor_email:'dancewithceech@gmail.com',term:'Fall',year:2026,archived:false,timezone:'America/Los_Angeles',start_date:'2026-09-01',end_date:'2026-12-15',days:[1,3],start_time:'10:00:00'}],
  attendance_enrollments:[{id:'fixture-student',name:'Fixture Student',first_name:'Fixture',last_name:'Student',email:'student@example.invalid',google_sub:'fixture-student',effective_from:'2026-09-01',effective_to:null,removed_at:null},{id:'fixture-unlinked',name:'Unlinked Student',first_name:null,last_name:null,email:null,google_sub:null,effective_from:'2026-09-01',effective_to:null,removed_at:null}],
  attendance_meetings:[{id:'fixture-meeting',meeting_date:'2026-10-19',status:'closed',private_token:'NEVER_EXPOSE_TOKEN',location_lat:123}],
  attendance_records:[{meeting_id:'fixture-meeting',enrollment_id:'fixture-student',status:'present',source:'instructor_credit',revision:1,checked_in_at:null,updated_at:'2026-10-19T17:00:00Z'}],
  attendance_schedule_exceptions:[],
  owner_account_directory:[{user_id:'google:fixture-signin-only',email:'signin-only@example.invalid',first_sign_in_at:'2026-10-18T08:00:00Z',last_sign_in_at:'2026-10-19T08:00:00Z'}],
  owner_account_email_matches:[{user_id:'google:fixture-practice',email:'historical@example.invalid',matched_at:'2026-10-20T00:00:00Z'}],
  beatfirst_preview_attempts:[{user_id:'google:fixture-unknown',attempt_id:'00000000-0000-4000-8000-000000000002',level_id:2,saved_at:'2026-09-20T08:00:00Z'},{user_id:'google:fixture-practice',attempt_id:'00000000-0000-4000-8000-000000000001',level_id:4,saved_at:'2026-10-19T08:10:00Z'}],
  trainer_scores:[{account:'google:fixture-practice',take:'fixture-take',lesson:'marching',saved:Date.parse('2026-10-19T08:20:00Z')/1000}],
}
const db=http.createServer((req,res)=>{
  const url=new URL(req.url,database), table=url.pathname.split('/').pop()
  calls.push({method:req.method,table,select:url.searchParams.get('select'),expiryFilter:url.searchParams.has('expires_at'),exactCount:req.headers.prefer?.includes('count=exact')})
  res.setHeader('Content-Type','application/json')
  if(failTrainer&&table==='trainer_scores'){res.statusCode=503;res.end(JSON.stringify({message:'private backend diagnostic must not escape',code:'XX000'}));return}
  if(failHistorical&&table==='owner_account_email_matches'){res.statusCode=503;res.end('{}');return}
  if(table==='owner_directory_erase_account'){
    assert.equal(req.method,'POST');let payload='';req.on('data',c=>payload+=c);req.on('end',()=>{assert.deepEqual(JSON.parse(payload),{p_user_id:'google:fixture-owner'});res.end('null')});return
  }
  if(failRoster&&table==='attendance_enrollments'){res.statusCode=503;res.end('{}');return}
  if(table==='attendance_meetings')assert.equal(url.searchParams.get('merged_into'),'is.null','Merged roll calls must be excluded')
  let data=fixtures[table]
  if(table==='attendance_classes'&&url.searchParams.get('id')?.startsWith('in.')) {
    assert.equal(url.searchParams.get('instructor_email'),'eq.dancewithceech@gmail.com');assert.equal(url.searchParams.get('term'),'eq.Fall');assert.equal(url.searchParams.get('year'),'eq.2026');assert.equal(url.searchParams.get('archived'),'eq.false')
    data=[classId,'c2dc52af-fcd7-4a22-93b3-bee9bbcdc114','627c78c6-6a49-4b61-85fd-89181a1d6645','f69a5511-26f5-42c0-b66c-05e99e3242da'].map(id=>({...fixtures.attendance_classes[0],id}))
    if(incompleteClasses)data=data.slice(0,3)
  }
  if(table==='attendance_enrollments'&&url.searchParams.get('select')==='google_sub,email'){
    assert.equal(url.searchParams.get('effective_to'),'is.null');assert.equal(url.searchParams.get('removed_at'),'is.null');assert.ok(url.searchParams.get('class_id')?.startsWith('in.'))
    data=[{google_sub:'fixture-practice',email:'historical@example.invalid'},{google_sub:null,email:'roster-only@example.invalid'}]
  }
  if(!data){res.statusCode=404;res.end('{}');return}
  assert.equal(req.method,'GET','No tracking writes are permitted during local read QA')
  res.setHeader('Content-Range',`0-0/${table==='beatfirst_preview_attempts'?25:data.length}`)
  res.end(JSON.stringify(data))
})
await new Promise((resolve,reject)=>{db.once('error',reject);db.listen(3152,'127.0.0.1',resolve)})
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3151'],{stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_ENV:'production',AUTH_SECRET:'owner-dashboard-local-test-only',OWNER_DASHBOARD_ENABLED:'true',OWNER_DASHBOARD_LOCAL_PREVIEW:'true',ATTENDANCE_SUPABASE_URL:database,ATTENDANCE_SUPABASE_SERVICE_ROLE_KEY:'local-fixture-placeholder',SITE_PROFILE_LOCAL_TEST_STORAGE:'true',OWNER_SOCIAL_IMPORTED_SNAPSHOTS:'true',OWNER_SIGNIN_RECORDING_ENABLED:'false',OWNER_SIGNIN_PRIVACY_REVIEWED:'false',OWNER_DIRECTORY_SUPABASE_URL:database,OWNER_DIRECTORY_SUPABASE_SERVER_KEY:'local-fixture-placeholder',BEATFIRST_SUPABASE_URL:database,BEATFIRST_SUPABASE_SERVICE_ROLE_KEY:'local-fixture-placeholder',TRAINER_SUPABASE_URL:database,TRAINER_SUPABASE_SECRET_KEY:'local-fixture-placeholder',RESEND_API_KEY:'re_local_fixture_placeholder',NEXT_PUBLIC_SUPABASE_URL:database,NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-fixture-placeholder',SUPABASE_SERVICE_ROLE_KEY:'local-fixture-placeholder'}})
let logs='';server.stdout.on('data',chunk=>logs+=chunk);server.stderr.on('data',chunk=>logs+=chunk)
async function token(email='dancewithceech@gmail.com',verified=true){return 'authjs.session-token='+await encode({secret:'owner-dashboard-local-test-only',salt:'authjs.session-token',token:{email,googleSub:'fixture-owner',googleEmailVerified:verified},maxAge:600})}
try {
  let ready=false
  for(let i=0;i<40;i++){try{await fetch(origin+'/admin');ready=true;break}catch{await delay(250)}}
  assert.ok(ready,logs)
  const ownerHeaders={cookie:await token()}
  const response=await fetch(origin+'/api/admin/overview',{headers:ownerHeaders})
  assert.equal(response.status,200)
  const report=await response.json()
  assert.equal(report.accounts.length,3)
  assert.equal(report.accounts.find(x=>x.email==='signin-only@example.invalid').beatfirst,0)
  const practice=report.accounts.find(x=>x.id==='google:fixture-practice')
  assert.equal(practice.email,'historical@example.invalid');assert.equal(practice.emailSource,'historical-match');assert.equal(report.accounts.find(x=>x.id==='google:fixture-unknown').email,null);assert.equal(report.accounts.filter(x=>x.lastSignIn).length,1);assert.equal(practice.lastSignIn,null);assert.equal(practice.beatfirst,1);assert.equal(practice.trainer,1)
  assert.equal(report.coverage.find(x=>x.id==='beatfirst').state,'limited','A server cap smaller than requested must be explicit')
  assert.ok(report.coverage.find(x=>x.id==='beatfirst').detail.includes('2 of 25'))
  assert.ok(calls.every(x=>x.exactCount))
  assert.ok(calls.find(x=>x.table==='owner_account_directory').expiryFilter)
  const before=calls.length
  const denied=[]
  for(const headers of [{},{cookie:await token('ordinary@example.invalid')},{cookie:await token('dancewithceech@gmail.com',false)}]){
    const r=await fetch(origin+'/api/admin/overview',{headers});assert.ok([401,403].includes(r.status));const text=await r.text();assert.ok(!text.includes('example.invalid'));assert.ok(!text.includes('fixture-practice'));denied.push(r.status)
    const html=await(await fetch(origin+'/admin',{headers})).text();assert.ok(!html.includes('signin-only@example.invalid'));assert.ok(!html.includes('fixture-practice'))
  }
  assert.equal(calls.length,before,'Denied requests must never query any backend')
  failTrainer=true
  const partial=await(await fetch(origin+'/api/admin/overview',{headers:ownerHeaders})).json()
  assert.equal(partial.coverage.find(x=>x.id==='trainer').state,'unavailable');assert.equal(partial.coverage.find(x=>x.id==='beatfirst').state,'limited');assert.ok(!JSON.stringify(partial).includes('private backend diagnostic'))
  failHistorical=true
  const withoutHistorical=await(await fetch(origin+'/api/admin/overview',{headers:ownerHeaders})).json()
  assert.equal(withoutHistorical.coverage.find(x=>x.id==='historical-emails').state,'unavailable')
  assert.equal(withoutHistorical.accounts.find(x=>x.id==='google:fixture-practice').email,null)
  const classBefore=calls.length
  for(const headers of [{},{cookie:await token('ordinary@example.invalid')},{cookie:await token('dancewithceech@gmail.com',false)}]) {
    const result=await fetch(origin+'/api/admin/classes/'+classId,{headers});assert.ok([401,403].includes(result.status))
    assert.ok(!(await result.text()).includes('student@example.invalid'))
    const deniedHtml=await(await fetch(origin+'/admin/classes/'+classId,{headers})).text();assert.ok(!deniedHtml.includes('student@example.invalid'))
  }
  assert.equal((await fetch(origin+'/api/admin/classes/outside-scope',{headers:ownerHeaders})).status,404)
  assert.equal(calls.length,classBefore,'Denied class requests must not construct/read storage')
  const classResult=await fetch(origin+'/api/admin/classes/'+classId,{headers:ownerHeaders})
  assert.equal(classResult.status,200);assert.match(classResult.headers.get('cache-control'),/private, no-store/)
  const classView=await classResult.json()
  assert.equal(classView.students.length,2)
  assert.equal(classView.students.find(s=>s.account==='google:fixture-student').summary.present,1)
  assert.equal(classView.students.find(s=>s.account===null).summary.absent,0)
  assert.ok(!JSON.stringify(classView).includes('NEVER_EXPOSE_TOKEN'))
  assert.ok(calls.filter(c=>c.table?.startsWith('attendance_')).every(c=>!/(token|location|note|college_id)/.test(c.select)))
  assert.equal((await fetch(origin+'/api/admin/classes/'+classId,{method:'POST',headers:ownerHeaders})).status,405)
  failTrainer=false;failHistorical=false
  const otherBefore=calls.length
  for(const headers of [{},{cookie:await token('ordinary@example.invalid')},{cookie:await token('dancewithceech@gmail.com',false)}]){
    const deniedOther=await fetch(origin+'/api/admin/other-users',{headers});assert.ok([401,403].includes(deniedOther.status));assert.ok(!(await deniedOther.text()).includes('example.invalid'))
    const html=await(await fetch(origin+'/admin/other-users',{headers})).text();assert.ok(!html.includes('signin-only@example.invalid'))
  }
  assert.equal(calls.length,otherBefore,'Denied Other users must not read any storage')
  const otherResponse=await fetch(origin+'/api/admin/other-users',{headers:ownerHeaders})
  assert.equal(otherResponse.status,200);assert.match(otherResponse.headers.get('cache-control'),/private, no-store/)
  const other=await otherResponse.json()
  assert.deepEqual(other.accounts.map(x=>x.id).sort(),['google:fixture-signin-only','google:fixture-unknown'])
  assert.ok(!JSON.stringify(other).includes('historical@example.invalid'))
  assert.ok(!JSON.stringify(other).includes('roster-only@example.invalid'))
  assert.deepEqual(other.activity.map(x=>x.user_id),['google:fixture-unknown'])
  const otherHtml=await(await fetch(origin+'/admin/other-users',{headers:ownerHeaders})).text()
  assert.ok(otherHtml.includes('Other users'));assert.ok(otherHtml.includes('signin-only@example.invalid'));assert.ok(!otherHtml.includes('historical@example.invalid'))
  failRoster=true
  const failedOther=await fetch(origin+'/api/admin/other-users',{headers:ownerHeaders});assert.equal(failedOther.status,503);assert.ok(!(await failedOther.text()).includes('example.invalid'))
  const failedHtml=await(await fetch(origin+'/admin/other-users',{headers:ownerHeaders})).text();assert.ok(failedHtml.includes('Other users temporarily unavailable'));assert.ok(!failedHtml.includes('signin-only@example.invalid'))
  failRoster=false;incompleteClasses=true
  const rosterBefore=calls.filter(c=>c.table==='attendance_enrollments').length
  assert.equal((await fetch(origin+'/api/admin/other-users',{headers:ownerHeaders})).status,503)
  assert.equal(calls.filter(c=>c.table==='attendance_enrollments').length,rosterBefore,'Incomplete class metadata must prevent roster reads')
  incompleteClasses=false
  assert.equal((await fetch(origin+'/api/admin/other-users',{method:'POST',headers:ownerHeaders})).status,405)
  const erasureBefore=calls.length
  assert.equal((await fetch(origin+'/api/account/signin-record',{method:'DELETE',headers:{origin}})).status,401)
  assert.equal((await fetch(origin+'/api/account/signin-record',{method:'DELETE',headers:{...ownerHeaders,origin:'https://other.invalid'}})).status,403)
  assert.equal(calls.length,erasureBefore)
  // Next normalizes loopback Request URLs to localhost; exercise that exact same origin.
  const erased=await fetch(origin+'/api/account/signin-record',{method:'DELETE',headers:{...ownerHeaders,origin:'http://localhost:3151'}})
  assert.equal(erased.status,200);assert.deepEqual(await erased.json(),{deleted:true})
  assert.equal(calls.at(-1).table,'owner_directory_erase_account')
  const preview=await fetch(origin+'/admin/preview');assert.equal(preview.status,404)
  assert.equal((await fetch(origin+'/profile/preview')).status,404)
  console.log(JSON.stringify({fixtureBackendsOnly:true,ownerRead:200,verifiedJoin:true,signinWithoutPlay:true,historicalEmailWithoutInventedSignin:true,unknownEmailPreserved:true,atomicErasureRpc:true,privateClassRead:true,otherUsersFiltered:true,otherUsersDenialBeforeStorage:true,otherUsersMembershipFailureClosed:true,classDenialBeforeStorage:true,unlinkedStudentIncluded:true,classSensitiveFieldsExcluded:true,missingEmailPreserved:true,serverCapDetected:true,sourceFailureIsolated:true,expiryFilter:true,denied,backendCallsOnDenial:0,productionDemo:preview.status,methods:[...new Set(calls.map(x=>x.method))]},null,2))
} finally {
  if(server.exitCode===null){server.kill('SIGTERM');await once(server,'exit').catch(()=>{})}await new Promise(resolve=>db.close(resolve))
}

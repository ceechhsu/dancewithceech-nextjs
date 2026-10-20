// Full local production HTTP -> Supabase SDK -> synthetic PostgREST fixture QA.
// Every backend URL and key here is a loopback fixture. Never points at production.
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import { encode } from 'next-auth/jwt'
const origin='http://127.0.0.1:3151', database='http://127.0.0.1:3152'
const calls=[]
let failTrainer=false
const fixtures={
  owner_account_directory:[{user_id:'google:fixture-signin-only',email:'signin-only@example.invalid',first_sign_in_at:'2026-10-18T08:00:00Z',last_sign_in_at:'2026-10-19T08:00:00Z'}],
  beatfirst_preview_attempts:[{user_id:'google:fixture-practice',attempt_id:'00000000-0000-4000-8000-000000000001',level_id:4,saved_at:'2026-10-19T08:10:00Z'}],
  trainer_scores:[{account:'google:fixture-practice',take:'fixture-take',lesson:'marching',saved:Date.parse('2026-10-19T08:20:00Z')/1000}],
}
const db=http.createServer((req,res)=>{
  const url=new URL(req.url,database), table=url.pathname.split('/').pop()
  calls.push({method:req.method,table,select:url.searchParams.get('select'),expiryFilter:url.searchParams.has('expires_at'),exactCount:req.headers.prefer?.includes('count=exact')})
  res.setHeader('Content-Type','application/json')
  if(failTrainer&&table==='trainer_scores'){res.statusCode=503;res.end(JSON.stringify({message:'private backend diagnostic must not escape',code:'XX000'}));return}
  const data=fixtures[table]
  if(!data){res.statusCode=404;res.end('{}');return}
  assert.equal(req.method,'GET','No tracking writes are permitted during local read QA')
  res.setHeader('Content-Range',`0-0/${table==='beatfirst_preview_attempts'?25:data.length}`)
  res.end(JSON.stringify(data))
})
await new Promise((resolve,reject)=>{db.once('error',reject);db.listen(3152,'127.0.0.1',resolve)})
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3151'],{stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_ENV:'production',AUTH_SECRET:'owner-dashboard-local-test-only',OWNER_DASHBOARD_ENABLED:'true',OWNER_DASHBOARD_LOCAL_PREVIEW:'true',SITE_PROFILE_LOCAL_TEST_STORAGE:'true',OWNER_SOCIAL_IMPORTED_SNAPSHOTS:'true',OWNER_SIGNIN_RECORDING_ENABLED:'false',OWNER_SIGNIN_PRIVACY_REVIEWED:'false',OWNER_DIRECTORY_SUPABASE_URL:database,OWNER_DIRECTORY_SUPABASE_SERVER_KEY:'local-fixture-placeholder',BEATFIRST_SUPABASE_URL:database,BEATFIRST_SUPABASE_SERVICE_ROLE_KEY:'local-fixture-placeholder',TRAINER_SUPABASE_URL:database,TRAINER_SUPABASE_SECRET_KEY:'local-fixture-placeholder',RESEND_API_KEY:'re_local_fixture_placeholder',NEXT_PUBLIC_SUPABASE_URL:database,NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-fixture-placeholder',SUPABASE_SERVICE_ROLE_KEY:'local-fixture-placeholder'}})
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
  assert.equal(report.accounts.length,2)
  assert.equal(report.accounts.find(x=>x.email==='signin-only@example.invalid').beatfirst,0)
  const practice=report.accounts.find(x=>x.id==='google:fixture-practice')
  assert.equal(practice.email,null);assert.equal(practice.lastSignIn,null);assert.equal(practice.beatfirst,1);assert.equal(practice.trainer,1)
  assert.equal(report.coverage.find(x=>x.id==='beatfirst').state,'limited','A server cap smaller than requested must be explicit')
  assert.ok(report.coverage.find(x=>x.id==='beatfirst').detail.includes('1 of 25'))
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
  const preview=await fetch(origin+'/admin/preview');assert.equal(preview.status,404)
  assert.equal((await fetch(origin+'/profile/preview')).status,404)
  console.log(JSON.stringify({fixtureBackendsOnly:true,ownerRead:200,verifiedJoin:true,signinWithoutPlay:true,missingEmailPreserved:true,serverCapDetected:true,sourceFailureIsolated:true,expiryFilter:true,denied,backendCallsOnDenial:0,productionDemo:preview.status,methods:[...new Set(calls.map(x=>x.method))]},null,2))
} finally {
  server.kill('SIGTERM'); await once(server,'exit').catch(()=>{});await new Promise(resolve=>db.close(resolve))
}

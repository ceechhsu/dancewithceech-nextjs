import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {createGateway} from './phone-preview-gateway.mjs'

test('password-free preview keeps test routes and cross-origin writes restricted', async()=>{
 const upstream=http.createServer((req,res)=>{res.setHeader('Set-Cookie','attendance_device=verified; Path=/; HttpOnly; Secure; SameSite=Lax');res.end(JSON.stringify({cookie:req.headers.cookie,origin:req.headers.origin}))})
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r))
 const gateway=createGateway({teacherToken:'teacher-session',port:upstream.address().port})
 await new Promise(r=>gateway.listen(0,'127.0.0.1',r))
 const url=`http://127.0.0.1:${gateway.address().port}`
 const headers={}
 try {
  assert.equal((await fetch(url+'/attendance/instructor')).status,200)
  assert.equal((await fetch(url+'/api/auth/session')).status,404)
  assert.equal((await fetch(url+'/api/attendance/classes',{method:'POST',headers:{...headers,origin:'https://evil.example'}})).status,403)
  const good=await fetch(url+'/attendance/instructor',{headers});assert.equal(good.status,200)
  assert.equal((await good.json()).cookie,'authjs.session-token=teacher-session')
  const studentCheckIn=await fetch(url+'/attendance/checkin/current-token',{headers})
  assert.equal((await studentCheckIn.json()).cookie,'')
  assert.match(studentCheckIn.headers.get('set-cookie')||'',/attendance_device=verified/)
  const studentApi=await fetch(url+'/api/attendance/classes',{headers:{cookie:'attendance_device=test-device'}})
  assert.match((await studentApi.json()).cookie,/authjs\.session-token=teacher-session/)
  const post=await fetch(url+'/api/attendance/classes',{method:'POST',headers:{...headers,origin:url}})
  assert.equal(post.status,200);assert.equal((await post.json()).origin,`http://localhost:${upstream.address().port}`)
 }finally{gateway.closeAllConnections();upstream.closeAllConnections();await Promise.all([new Promise(r=>gateway.close(r)),new Promise(r=>upstream.close(r))])}
})

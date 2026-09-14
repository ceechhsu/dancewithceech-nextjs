import {createRequire} from 'node:module'
import assert from 'node:assert/strict'
import {encode} from 'next-auth/jwt'
const {chromium}=createRequire(import.meta.url)('playwright')
const origin='http://localhost:3104'
const browser=await chromium.launch({headless:true,channel:'chrome'})
const teacher=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:37,longitude:-122,accuracy:5},permissions:['geolocation']})
const student=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:37,longitude:-122,accuracy:5},permissions:['geolocation']})
async function login(context,email){const token=await encode({secret:'local-attendance-fixture-only',salt:'authjs.session-token',token:{email,name:email.split('@')[0],googleSub:`test-${email}`,googleEmailVerified:true}});await context.addCookies([{name:'authjs.session-token',value:token,url:origin,httpOnly:true,sameSite:'Lax'}])}
async function post(context,resource,body){const response=await context.request.post(`${origin}/api/attendance/${resource}`,{headers:{origin},data:body});const result=await response.json();assert.equal(response.status(),200,JSON.stringify(result));return result}
try{
 await login(teacher,'teacher@example.com');await login(student,'student@example.com')
 const previous=await teacher.request.get(origin+'/api/attendance/classes').then(r=>r.json());for(const cls of previous.classes){const m=await teacher.request.get(origin+'/api/attendance/meetings?classId='+cls.id).then(r=>r.json());if(m.meeting?.status==='open')await post(teacher,'meetings',{action:'close',meetingId:m.meeting.id})}
 const {class:c}=await post(teacher,'classes',{action:'create',name:'Fictional Hip Hop Test',college:'Example College',term:'Fall',year:2026,start_date:'2020-01-01',end_date:'2030-01-01',timezone:'America/Los_Angeles',days:[1,3],start_time:'09:30',end_time:'11:00',location_label:'Test room'})
 await post(teacher,'enrollments',{action:'import',classId:c.id,rows:[{name:'Sample Student',email:'student@example.com',college_id:'00123'},{name:'Sample Absent',email:'absent@example.com'}]})
 const page=await teacher.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${origin}/attendance/instructor`);await page.getByLabel('Class',{exact:true}).selectOption(c.id);await page.getByRole('button',{name:'Take attendance · 10 minutes'}).click();await page.locator('svg:has(title)').waitFor();await page.screenshot({path:'/tmp/attendance-instructor-mobile.png',fullPage:true})
 const meeting=await teacher.request.get(`${origin}/api/attendance/meetings?classId=${c.id}`).then(r=>r.json())
 const {token}=await post(teacher,'meetings',{action:'token',meetingId:meeting.meeting.id,location:{latitude:37,longitude:-122,accuracy:5,timestamp:Date.now()}})
 const sp=await student.newPage();sp.on('pageerror',e=>errors.push(e.message));await sp.goto(`${origin}/attendance/checkin/${token}`);await sp.getByRole('heading',{name:'You’re checked in'}).waitFor();await sp.screenshot({path:'/tmp/attendance-student-mobile.png',fullPage:true})
 await sp.getByRole('link',{name:'View my attendance'}).click();await sp.getByText('Present',{exact:true}).first().waitFor()
 await page.getByRole('button',{name:'Refresh roster'}).click();await page.getByText('Sample Student',{exact:true}).waitFor()
 await page.getByRole('button',{name:'End now',exact:true}).click();await page.getByText('Meeting closed.',{exact:true}).waitFor()
 await sp.goto(`${origin}/attendance/checkin/${token}`);await sp.locator('main [role=alert]').waitFor();assert.match(await sp.locator('main [role=alert]').innerText(),/expired|closed/i)
 await page.evaluate(()=>navigator.serviceWorker.ready);await teacher.setOffline(true);await page.reload();await page.getByRole('heading',{name:'Offline attendance',exact:true}).waitFor();const offlineRow=page.locator('li').filter({hasText:'Sample Absent'});await offlineRow.getByRole('button',{name:'Mark present',exact:true}).click();await offlineRow.getByText(/Pending: present/).waitFor();await teacher.setOffline(false);await page.goto(origin+'/attendance/instructor');await page.getByLabel('Class',{exact:true}).selectOption(c.id);await page.waitForFunction(async id=>{const d=await fetch('/api/attendance/meetings?classId='+id).then(r=>r.json());return d.records?.filter(r=>r.status==='present').length===2},c.id);await page.getByText('0 pending changes',{exact:true}).waitFor()
 const outsider=await browser.newContext();await login(outsider,'outside@example.com');const result=await outsider.request.get(`${origin}/api/attendance/classes`).then(r=>r.json());assert.equal(result.classes.length,0);const history=await outsider.request.get(`${origin}/api/attendance/history`).then(r=>r.json());assert.equal(history.records.length,0)
 assert.equal((await student.request.post(origin+'/api/attendance/push',{headers:{origin},data:{}})).status(),403)
 assert.equal((await teacher.request.post(origin+'/api/attendance/classes',{headers:{origin:'https://wrong.example'},data:{action:'create'}})).status(),403)
 const anonymous=await browser.newContext();assert.equal((await anonymous.request.get(origin+'/api/attendance/classes')).status(),401)
 assert.deepEqual(errors,[]);console.log('PASS: mobile instructor open/QR, authenticated student check-in/history, close/expiry, offline reload/manual correction/automatic sync, outsider isolation; no browser runtime errors. OAuth itself not exercised.')
}catch(error){for(const page of teacher.pages()){console.log((await page.locator('body').innerText()).slice(0,3000));await page.screenshot({path:'/tmp/attendance-test-failure.png',fullPage:true})}throw error}finally{await browser.close()}

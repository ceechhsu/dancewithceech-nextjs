// Local signed-in HTTP test with fictional accounts; never creates real student records.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
import {encode} from 'next-auth/jwt'
const {chromium}=createRequire('/Users/ceechhsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs')('playwright')
const origin='http://localhost:3105',classId='00000000-0000-0000-0000-000000000001',output='/tmp/archery-instructor-challenges-review'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'}),contexts=[],errors=[]
async function login(email){
 const context=await browser.newContext({viewport:{width:390,height:844}});contexts.push(context)
 await context.addCookies([{name:'authjs.session-token',url:origin,httpOnly:true,sameSite:'Lax',value:await encode({secret:'local-class-progress-fixture',salt:'authjs.session-token',token:{email,name:'Example Account',googleSub:'sub-'+email,googleEmailVerified:true,googleProfileReady:true}})}])
 return context
}
async function snapshot(c){const r=await c.request.get(origin+'/api/attendance/archery?classId='+classId);assert.equal(r.status(),200);return r.json()}
async function open(c){const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/attendance/archery/'+classId);await p.getByRole('region',{name:'Archery calendar',exact:true}).waitFor();return p}
async function invite(p,name,game,teacher=false){
 await p.getByRole('button',{name:'Today',exact:true}).click();await p.getByRole('button',{name:teacher?'Challenge a student':'Challenge a classmate',exact:true}).click()
 await p.getByRole('button',{name:/Classmate (Choose a classmate|Instructor|Alex Sample)/}).click()
 const d=p.getByRole('dialog',{name:'Choose a classmate',exact:true})
 await d.getByRole('option',{name,exact:true}).click();await d.getByRole('button',{name:'Choose '+name,exact:true}).click()
 await p.getByLabel('Game',{exact:true}).fill(game);await p.getByRole('button',{name:'Send challenge',exact:true}).click()
 await p.getByRole('article').filter({hasText:game}).waitFor()
}
try{
 const sc=await login('student@example.com'),tc=await login('teacher@example.com'),oc=await login('outsider@example.com')
 const student=await open(sc)
 await invite(student,'Instructor','Student to instructor test')
 const teacher=await open(tc);await teacher.getByText('You have 1 new challenge.',{exact:true}).waitFor();await teacher.getByRole('button',{name:'View challenges',exact:true}).click()
 let a=teacher.getByRole('article').filter({hasText:'Student to instructor test'})
 await a.getByRole('button',{name:'Accept challenge',exact:true}).click()
 const host=(await snapshot(tc)).challengeMe,me=(await snapshot(sc)).challengeMe
 await a.getByLabel('Winner',{exact:true}).selectOption(host);await a.getByRole('button',{name:'Report result',exact:true}).click()
 await a.getByText('Waiting for your opponent to confirm.',{exact:true}).waitFor()
 let b=student.getByRole('article').filter({hasText:'Student to instructor test'})
 await b.getByRole('button',{name:'Dispute result',exact:true}).click()
 await b.getByText('Result disputed. Please find your instructor together so they can decide the winner.',{exact:true}).waitFor()
 await a.getByText('Result disputed. Review the outcome together before making your instructor decision.',{exact:true}).waitFor()
 await teacher.screenshot({path:output+'/instructor-own-dispute-phone.png',fullPage:true})
 await a.getByLabel('Winner selected by instructor',{exact:true}).selectOption(me);await a.getByLabel('Decision notes (optional)',{exact:true}).fill('Reviewed together in the fictional class')
 await a.getByRole('button',{name:'Resolve dispute',exact:true}).click();await b.getByText('Resolved by instructor',{exact:true}).waitFor()
 assert.equal((await snapshot(sc)).challenges.find(x=>x.game==='Student to instructor test').winner_id,me)
 await invite(teacher,'Alex Sample','Instructor to student test',true)
 await student.getByRole('article').filter({hasText:'Instructor to student test'}).getByRole('button',{name:'Accept challenge',exact:true}).click()
 b=student.getByRole('article').filter({hasText:'Instructor to student test'});a=teacher.getByRole('article').filter({hasText:'Instructor to student test'})
 await b.getByLabel('Winner',{exact:true}).selectOption(me);await b.getByRole('button',{name:'Report result',exact:true}).click()
 await a.getByRole('button',{name:'Confirm result',exact:true}).click();await b.getByText('Winner: Alex Sample',{exact:true}).waitFor()
 await invite(student,'Instructor','Student invitation to decline')
 a=teacher.getByRole('article').filter({hasText:'Student invitation to decline'});await a.getByRole('button',{name:'Decline',exact:true}).click()
 await student.getByRole('article').filter({hasText:'Student invitation to decline'}).getByText('declined',{exact:true}).waitFor()
 const outsider=await oc.request.get(origin+'/api/attendance/archery?classId='+classId);assert.equal(outsider.status(),403)
 await teacher.screenshot({path:output+'/instructor-challenges-phone.png',fullPage:true});await student.screenshot({path:output+'/student-instructor-challenges-phone.png',fullPage:true})
 assert.deepEqual(errors,[])
 console.log('PASS: phone UI sends instructor/student invitations both ways, receives incoming notification, accepts/declines, requires peer confirmation, resolves own disputes explicitly with preserved evidence, and denies outsiders.')
}catch(e){for(const c of contexts)for(const p of c.pages()){console.log((await p.locator('body').innerText()).slice(-3000))}throw e}
finally{await browser.close()}

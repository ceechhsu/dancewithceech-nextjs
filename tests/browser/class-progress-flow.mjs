import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { encode } from 'next-auth/jwt'
const require = createRequire(import.meta.url)
let chromium
try { ({chromium}=require('playwright')) } catch {
  ({chromium}=createRequire((process.env.BROWSER_NODE_MODULES || '/Users/ceechhsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules') + '/runtime.cjs')('playwright'))
}
const origin = 'http://localhost:3105', archery='00000000-0000-0000-0000-000000000001', weights='00000000-0000-0000-0000-000000000002', other='00000000-0000-0000-0000-000000000004'
const output=process.env.PROGRESS_SCREENSHOTS || '/tmp/class-progress-review'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const contexts=[]
async function login(email) {
  const context=await browser.newContext({viewport:{width:375,height:667}});contexts.push(context)
  if(email) {
    const token=await encode({secret:'local-class-progress-fixture',salt:'authjs.session-token',token:{email,name:email==='teacher@example.com'?'Ceech':'Alex Sample',googleSub:'sub-'+email,googleEmailVerified:true,googleProfileReady:true}})
    await context.addCookies([{name:'authjs.session-token',value:token,url:origin,httpOnly:true,sameSite:'Lax'}])
  }
  return context
}
async function api(context,path,body,status=200) {
  const response=body ? await context.request.post(origin+'/api/attendance/'+path,{headers:{origin},data:body}) : await context.request.get(origin+'/api/attendance/'+path)
  const data=await response.json();assert.equal(response.status(),status,JSON.stringify(data));return data
}
const errors=[]
try {
  const teacher=await login('teacher@example.com'), student=await login('student@example.com'), second=await login('second@example.com'), dancer=await login('dance@example.com'), outsider=await login('outsider@example.com'), anonymous=await login(null)
  const page=await teacher.newPage();page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin+'/attendance/instructor')
  await page.getByRole('heading',{name:'Your classes',exact:true}).waitFor({timeout:15000})
  for (const name of ['Archery','Weight training','Hip hop dance']) await page.getByRole('link',{name:'Open '+name,exact:true}).waitFor()
  assert.equal(await page.getByRole('link',{name:'Open Other instructor’s class',exact:true}).count(),0)
  await page.getByRole('link',{name:'Open Archery',exact:true}).click()
  await page.getByRole('heading',{name:'Archery',exact:true}).waitFor()
  await page.getByRole('region',{name:'Archery roster, scroll horizontally'}).getByText('Alex',{exact:true}).waitFor()
  await page.getByRole('region',{name:'Dated attendance records'}).getByText('Present',{exact:true}).waitFor()
  await page.screenshot({path:output+'/teacher-class-mobile.png',fullPage:true})
  const sp=await student.newPage();sp.on('pageerror',e=>errors.push(e.message))
  await sp.goto(origin+'/dashboard')
  await sp.getByRole('link',{name:'Archery progress →',exact:true}).waitFor()
  await sp.getByRole('link',{name:'Archery progress →',exact:true}).click()
  await sp.getByRole('link',{name:'Earlier practice notes',exact:true}).click()
  await sp.getByLabel('Round or practice').fill('Weekly round · 10 m')
  await sp.getByLabel('Score or result').fill('72 / 100')
  await sp.getByLabel('Notes (optional)').fill('Steadier release this week.')
  await sp.getByRole('button',{name:'Save entry',exact:true}).click()
  await sp.getByRole('status').filter({hasText:'Entry saved.'}).waitFor()
  await sp.getByRole('heading',{name:'Weekly round · 10 m',exact:true}).waitFor()
  assert.equal((await api(second,'progress?classId='+archery)).entries.length,0)
  assert.equal((await api(student,'progress?classId='+archery)).entries.length,1)
  const archeryView=await api(student,'archery?classId='+archery)
  assert.ok(archeryView.roster.every(p=>Object.keys(p).sort().join(',')==='id,name'))
  await api(student,'archery',{action:'round_save',classId:archery,id:crypto.randomUUID(),date:archeryView.today,distance:30,unit:'m',scores:[10,10,9,8,7]})
  assert.equal((await api(student,'archery?classId='+archery)).rounds[0].total,44)
  assert.equal((await api(second,'archery?classId='+archery)).rounds.length,0)
  await api(student,'archery',{action:'round_save',classId:archery,id:crypto.randomUUID(),date:archeryView.today,distance:15,unit:'yd',scores:[10,10,0],marks:['X','10','M']})
  const dayView=await api(student,'archery?classId='+archery+'&date='+archeryView.today)
  assert.equal(dayView.dayRounds.length,2)
  assert.deepEqual(dayView.dayRounds[1].score_marks,['X','10','M'])
  assert.equal(dayView.dayRounds[1].total,20)
  assert.equal((await api(second,'archery?classId='+archery+'&date='+archeryView.today)).dayRounds.length,0)
  assert.equal((await api(teacher,'archery?classId='+archery+'&date='+archeryView.today)).dayRounds[1].student_name,'Alex Sample')
  await page.goto(origin+'/attendance/archery/'+archery)
  await page.getByRole('button',{name:'Today',exact:true}).click();await page.getByRole('button',{name:'Individual scoring',exact:true}).click()
  await page.getByRole('heading',{name:'Record a round',exact:true}).waitFor()
  await page.getByLabel('Distance',{exact:true}).fill('25');await page.getByLabel('Arrows this round',{exact:true}).fill('2')
  for(const [i,mark] of ['X','M'].entries()){
    await page.getByRole('button',{name:new RegExp('^Arrow '+(i+1)+':')}).click()
    const score=page.getByRole('dialog',{name:'Choose your score',exact:true});await score.getByRole('slider').press(mark==='X'?'End':'Home');await score.getByRole('button',{name:'Use '+mark,exact:true}).click()
  }
  await page.getByLabel('Notes (optional)',{exact:true}).fill('Instructor own practice')
  await page.getByRole('button',{name:'Save round',exact:true}).click();await page.getByRole('region',{name:'Individual round history',exact:true}).getByText('Instructor own practice',{exact:true}).waitFor()
  const teacherDay=await api(teacher,'archery?classId='+archery+'&date='+archeryView.today)
  assert.equal(teacherDay.personalDayRounds.length,1);assert.equal(teacherDay.personalDayRounds[0].total,10);assert.equal(teacherDay.dayRounds.length,2)
  assert.equal(teacherDay.roster.length,2,'teacher practice does not add a fake student')
  const studentAfter=await api(student,'archery?classId='+archery+'&date='+archeryView.today)
  assert.equal(studentAfter.personalDayRounds.length,0);assert.equal(studentAfter.dayRounds.length,2)
  const secondPerson=archeryView.roster.find(p=>p.id!==archeryView.me)
  await sp.goto(origin+'/attendance/archery/'+archery)
  await sp.getByRole('button',{name:'Today',exact:true}).click();await sp.getByRole('button',{name:'Challenge a classmate',exact:true}).click()
  await sp.getByRole('button',{name:'Classmate Choose a classmate',exact:true}).click()
  const picker=sp.getByRole('dialog',{name:'Choose a classmate',exact:true})
  assert.equal(await picker.getByRole('option').count(),archeryView.challengeRoster.length,'picker reads enrolled students and the class instructor')
  await picker.getByRole('option',{name:'Instructor',exact:true}).waitFor()
  await picker.getByRole('option',{name:'Jordan Example',exact:true}).click();await picker.getByRole('button',{name:'Choose Jordan Example',exact:true}).click()
  await sp.getByLabel('Game',{exact:true}).fill('Tic tac toe');await sp.getByRole('button',{name:'Send challenge',exact:true}).click()
  await sp.getByText('Waiting for Jordan Example to respond.',{exact:true}).waitFor()
  const invitation=(await api(student,'archery?classId='+archery)).challenges[0]
  await api(second,'archery',{action:'challenge_respond',classId:archery,id:invitation.id,accept:true})
  await api(student,'archery',{action:'challenge_result',classId:archery,id:invitation.id,winnerId:archeryView.me})
  await api(student,'archery',{action:'challenge_confirm',classId:archery,id:invitation.id,accept:true},400)
  await api(second,'archery',{action:'challenge_confirm',classId:archery,id:invitation.id,accept:true})
  const disputedChallenge=(await api(student,'archery',{action:'challenge_create',classId:archery,id:crypto.randomUUID(),opponentId:secondPerson.id,game:'Disputed HTTP game'})).challenge
  await api(second,'archery',{action:'challenge_respond',classId:archery,id:disputedChallenge.id,accept:true})
  await api(student,'archery',{action:'challenge_result',classId:archery,id:disputedChallenge.id,winnerId:archeryView.me,notes:'Original student report'})
  await api(second,'archery',{action:'challenge_confirm',classId:archery,id:disputedChallenge.id,accept:false})
  const secondEnrollment=(await api(second,'archery?classId='+archery)).me
  const challengeDispute=(await api(teacher,'archery?classId='+archery)).disputes.find(d=>d.result_id===disputedChallenge.id)
  for(const actor of [student,second]){
    const row=(await api(actor,'archery?classId='+archery)).challenges.find(c=>c.id===disputedChallenge.id)
    assert.equal(row.dispute.status,'pending');assert.equal(row.proposed_winner,archeryView.me)
    await api(actor,'archery',{action:'challenge_result',classId:archery,id:row.id,winnerId:secondEnrollment},400)
    await api(actor,'archery',{action:'dispute_resolve',classId:archery,id:challengeDispute.id,winnerId:secondEnrollment},403)
  }
  await api(teacher,'archery',{action:'dispute_resolve',classId:archery,id:challengeDispute.id,winnerId:secondEnrollment,notes:'Instructor reviewed HTTP challenge'})
  assert.equal((await api(student,'archery?classId='+archery)).challenges.find(c=>c.id===disputedChallenge.id).dispute.status,'resolved')
  const draw={action:'tournament_open',classId:archery,id:crypto.randomUUID(),title:'HTTP test draw',game:'Winner only',date:archeryView.today,instructions:'Best of three'}
  await api(student,'archery',draw,403)
  const tournament=(await api(teacher,'archery',draw)).tournament
  await api(student,'archery',{action:'tournament_join',classId:archery,id:tournament.id,enrollmentId:secondPerson.id})
  assert.deepEqual((await api(teacher,'archery?classId='+archery)).tournaments[0].participants,[archeryView.me])
  await api(second,'archery',{action:'tournament_join',classId:archery,id:tournament.id})
  await api(student,'archery',{action:'tournament_close',classId:archery,id:tournament.id},403)
  await api(teacher,'archery',{action:'tournament_close',classId:archery,id:tournament.id})
  const match=(await api(teacher,'archery?classId='+archery)).matches.find(m=>m.tournament_id===tournament.id)
  await api(student,'archery',{action:'match_result',classId:archery,id:match.id,winnerId:match.a})
  assert.equal((await api(teacher,'archery?classId='+archery)).matches.find(m=>m.id===match.id).winner_id,null)
  await api(student,'archery',{action:'match_confirm',classId:archery,id:match.id,accept:true},400)
  await api(second,'archery',{action:'match_confirm',classId:archery,id:match.id,accept:false})
  const matchDispute=(await api(teacher,'archery?classId='+archery)).disputes.find(d=>d.result_id===match.id)
  await api(student,'archery',{action:'match_confirm',classId:archery,id:match.id,accept:true},400)
  await api(teacher,'archery',{action:'dispute_resolve',classId:archery,id:matchDispute.id,winnerId:match.a,notes:'Instructor reviewed HTTP match'})
  assert.equal((await api(teacher,'archery?classId='+archery)).tournaments[0].winner_id,match.a)
  // Real signed-in HTTP path for an instructor's second-chance comeback.
  const cup=(await api(teacher,'archery',{...draw,id:crypto.randomUUID(),title:'Instructor double-elimination cup',format:'double',signupMinutes:null})).tournament
  assert.equal(cup.registration_ends_at,null)
  for(const actor of [teacher,student,second])await api(actor,'archery',{action:'tournament_join',classId:archery,id:cup.id,enrollmentId:secondPerson.id,instructor:true})
  const cupList=await api(teacher,'archery?classId='+archery),teacherId=cupList.tournamentMe
  assert.ok(teacherId);assert.equal(cupList.me,null);assert.equal(cupList.roster.length,2)
  const secondId=(await api(second,'archery?classId='+archery)).me
  const accounts=new Map([[teacherId,teacher],[archeryView.me,student],[secondId,second]])
  await api(teacher,'archery',{action:'tournament_close',classId:archery,id:cup.id})
  let games=0,teacherLost=false,rematch=false
  while(true){
    const view=await api(teacher,'archery?classId='+archery),event=view.tournaments.find(t=>t.id===cup.id)
    if(event.status==='completed'){assert.equal(event.winner_id,teacherId);break}
    const ready=view.matches.find(m=>m.tournament_id===cup.id&&!m.resolved&&m.a&&m.b)
    assert.ok(ready);let winner=ready.a
    if([ready.a,ready.b].includes(teacherId)){
      winner=ready.bracket==='upper'?(ready.a===teacherId?ready.b:ready.a):teacherId
      if(ready.bracket==='upper')teacherLost=true
    }
    if(ready.bracket==='final')winner=ready.b
    if(ready.bracket==='reset')rematch=true
    const report=accounts.get(ready.a),confirm=accounts.get(ready.b)
    await api(report,'archery',{action:'match_result',classId:archery,id:ready.id,winnerId:winner})
    assert.equal((await api(teacher,'archery?classId='+archery)).matches.find(m=>m.id===ready.id).winner_id,null)
    await api(report,'archery',{action:'match_confirm',classId:archery,id:ready.id,accept:true},400)
    await api(confirm,'archery',{action:'match_confirm',classId:archery,id:ready.id,accept:true})
    games++;assert.ok(games<=5)
  }
  assert.ok(teacherLost&&rematch);assert.equal(games,5)
  const peers=await api(student,'archery?classId='+archery)
  assert.equal(JSON.stringify(peers.tournaments).includes('sub-teacher@example.com'),false)
  assert.equal(peers.roster.length,2)
  await api(outsider,'archery?classId='+archery,undefined,403)
  await api(anonymous,'archery?classId='+archery,undefined,401)
  for(const [label,width,height] of [['mobile',375,667],['tablet',768,1024],['desktop',1920,1080]]) {
    await sp.setViewportSize({width,height});await sp.screenshot({path:output+'/student-archery-'+label+'.png',fullPage:true})
    assert.ok(await sp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow')
  }
  await sp.goto(origin+'/attendance/progress/'+weights)
  await sp.getByLabel('Exercise or workout').fill('Push-ups and jump rope')
  await sp.getByLabel('Performance or result').fill('Push-ups: 20, 18, 15. Jump rope: 3 × 60 seconds.')
  await sp.getByRole('button',{name:'Save entry',exact:true}).click()
  await sp.getByRole('heading',{name:'Push-ups and jump rope',exact:true}).waitFor()
  await sp.setViewportSize({width:375,height:667});await sp.screenshot({path:output+'/student-weights-mobile.png',fullPage:true})
  const dp=await dancer.newPage();await dp.goto(origin+'/dashboard');await dp.getByRole('link',{name:'View attendance →'}).waitFor()
  assert.equal(await dp.getByRole('link',{name:/Archery progress|Weight training progress/}).count(),0)
  assert.equal(await dp.getByRole('link',{name:'My Progress',exact:true}).count(),1,'dance navigation remains available')
  await api(dancer,'progress?classId='+archery,undefined,403)
  await api(outsider,'progress?classId='+archery,undefined,403)
  await api(anonymous,'progress?classId='+archery,undefined,401)
  await api(student,'progress?action=workspace&classId='+archery,undefined,403)
  await api(teacher,'progress?action=workspace&classId='+other,undefined,403)
  const attack=await student.request.post(origin+'/api/attendance/progress',{headers:{origin:'https://wrong.example'},data:{action:'save',classId:archery}});assert.equal(attack.status(),403)
  await api(student,'progress',{action:'configure',classId:archery,tool:'none'},403)
  await page.goto(origin+'/attendance/instructor/classes/'+archery)
  await page.getByLabel('Student progress tool').selectOption('none')
  await page.getByRole('button',{name:'Save progress tool',exact:true}).click()
  await page.getByText('Progress tool saved.',{exact:true}).waitFor()
  await api(student,'progress?classId='+archery,undefined,400)
  await page.getByLabel('Student progress tool').selectOption('archery')
  await page.getByRole('button',{name:'Save progress tool',exact:true}).click()
  await page.getByRole('link',{name:'Review student progress'}).waitFor()
  await page.getByRole('link',{name:'Review student progress'}).click()
  await page.getByRole('link',{name:'Earlier practice notes',exact:true}).click()
  await page.getByText('Steadier release this week.',{exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Save entry',exact:true}).count(),0)
  await page.goto(origin+'/attendance/instructor?classId='+archery+'#take-attendance')
  await page.getByRole('button',{name:'Take attendance · 10 minutes'}).click()
  await page.locator('svg:has(title)').waitFor()
  const opened=await api(teacher,'meetings?classId='+archery)
  await api(teacher,'meetings',{action:'close',meetingId:opened.meeting.id})
  await page.reload();await page.getByRole('heading',{name:'Your classes',exact:true}).waitFor()
  for(const [label,width,height] of [['mobile',375,667],['tablet',768,1024],['desktop',1920,1080]]) {
    await page.setViewportSize({width,height});await page.locator('#teacher-classes').screenshot({path:output+'/teacher-dashboard-'+label+'.png'})
  }
  assert.deepEqual(errors,[])
  console.log('PASS: real local HTTP + PostgreSQL; teacher dashboard/roster/dated attendance, enrollment-filtered entry points, both journals, own-student isolation, instructor ownership, anonymous and origin denial, configuration, dance navigation and QR roll flow. Screenshots: '+output)
} catch (error) {
  for (const context of contexts) for (const page of context.pages()) {
    console.log('Failure page', page.url(), (await page.locator('body').innerText()).slice(0,2400))
    await page.screenshot({path:output+'/failure-'+contexts.indexOf(context)+'.png',fullPage:true})
  }
  throw error
} finally { await browser.close() }

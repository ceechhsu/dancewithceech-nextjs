import {createRequire} from 'node:module'
import {mkdir,readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const require=createRequire('/Users/ceechhsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs')
const {chromium}=require('playwright')
const output=process.env.ARCHERY_SCREENSHOTS||'/tmp/archery-tournament-formats'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[]
page.on('pageerror',error=>errors.push(error.message))
const entry=process.env.ARCHERY_PREVIEW_LINK_FILE?(await readFile(process.env.ARCHERY_PREVIEW_LINK_FILE,'utf8')).trim():'http://localhost:3106/attendance/archery-preview'
try{
 await page.goto(entry)
 await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor({timeout:60000})
 const roles=await page.getByLabel('Preview as',{exact:true}).locator('option').evaluateAll(options=>Object.fromEntries(options.map(o=>[o.textContent,o.value])))
 const choose=async(view)=>{
  await page.getByLabel('Preview as',{exact:true}).selectOption(view)
  await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor()
  await page.getByRole('button',{name:'Today',exact:true}).click()

 }
 const save=async(button)=>{await button.click();await page.getByRole('status').filter({hasText:'Saved.'}).waitFor();assert.equal((await page.getByRole('alert').allTextContents()).join('').trim(),'')}
 const host=async(title,format,manual)=>{
  await choose('teacher');await page.getByRole('button',{name:'Host a tournament',exact:true}).click()
  await page.getByLabel('Tournament name',{exact:true}).fill(title)
  await page.getByLabel('Game',{exact:true}).fill('Tic tac toe')
  await page.getByLabel('How to play (optional)',{exact:true}).fill('Best of three. Report the match winner.')
  await page.getByLabel('Tournament format',{exact:true}).selectOption(format)
  await page.getByLabel('Signup closes',{exact:true}).selectOption(manual?'manual':'timer')
  if(!manual)await page.getByLabel('Signup timer (minutes)',{exact:true}).fill('1')
  await save(page.getByRole('button',{name:manual?'Open registration':'Open 1-minute registration',exact:true}))
  return page.getByRole('article',{name:title,exact:true})
 }
 const event=await host('Phone double-elimination tournament','double',true)
 await event.getByText('Signup stays open until the instructor closes it.',{exact:true}).waitFor()
 await save(event.getByRole('button',{name:'Enter tournament',exact:true}))
 await save(event.getByRole('button',{name:'Leave tournament',exact:true}))
 await save(event.getByRole('button',{name:'Enter tournament',exact:true}))
 for(let i=1;i<=6;i++){
  await choose(String(i));assert.equal(await page.getByRole('button',{name:'Host a tournament',exact:true}).count(),0)
  await save(event.getByRole('button',{name:'Enter tournament',exact:true}))
 }
 await choose('teacher')
 await event.getByText('Registration open · 7 joined',{exact:true}).waitFor()
 await page.screenshot({path:output+'/signup-phone.png',fullPage:true})
 await save(event.getByRole('button',{name:'Close registration & draw',exact:true}))
 await event.getByText('In play · 7 players · 1 bye',{exact:true}).waitFor()
 assert.equal(await event.getByRole('button',{name:'Enter tournament',exact:true}).count(),0)
 await choose('12');assert.equal(await event.getByRole('region',{name:'Your tournament status',exact:true}).count(),0)
 await choose('teacher')
 const personal=event.getByRole('region',{name:'Your tournament status',exact:true})
 let games=0,peerStudent=false,teacherLost=false,resetSeen=false
 while(!await event.getByText(/^Champion:/).count()){
  assert.ok(games<14,'double elimination must end by 13 games for seven players')
  let form,own=false,lane
  if(await personal.getByRole('button',{name:'Report match winner',exact:true}).count()){
   own=true;form=personal.locator('form');const text=await personal.innerText()
   lane=text.includes('Championship rematch')?'reset':text.includes('Championship')?'final':text.includes('Second chance')?'lower':'upper'
  }else{
   const tabs=event.getByRole('navigation',{name:'Phone double-elimination tournament rounds',exact:true}).getByRole('button')
   for(let i=0;i<await tabs.count();i++){
    await tabs.nth(i).click()
    const candidate=event.locator('[data-match-id]:visible form').first()
    if(await candidate.count()){form=candidate;lane=await form.locator('xpath=..').getAttribute('data-bracket');break}
   }
  }
  assert.ok(form,'a ready match must be available')
  const choices=await form.locator('select option').allTextContents()
  let winner=choices[1]
  if(own){winner=lane==='upper'?choices.find(x=>x&&x!=='Choose winner'&&x!=='Instructor'):lane==='final'?choices[2]:'Instructor'}
  else if(lane==='final')winner=choices[2]
  if(own){
   const opponent=choices.find(x=>x&&x!=='Choose winner'&&x!=='Instructor')
   await form.locator('select').selectOption({label:winner})
   await save(form.getByRole('button',{name:'Report match winner',exact:true}))
   await personal.getByText('Waiting for your opponent to confirm.',{exact:true}).waitFor()
   await choose(roles[opponent]);await save(event.getByRole('button',{name:'Confirm match result',exact:true}))
   await choose('teacher')
   if(lane==='upper'){teacherLost=true;assert.match(await personal.innerText(),/1 loss/i)}
  }else if(!peerStudent){
   const opponent=choices[2]
   await choose(roles[winner]);const studentPersonal=event.getByRole('region',{name:'Your tournament status',exact:true})
   await studentPersonal.getByLabel('Match winner',{exact:true}).selectOption({label:winner})
   await save(studentPersonal.getByRole('button',{name:'Report match winner',exact:true}))
   await choose(roles[opponent]);await save(event.getByRole('button',{name:'Dispute result',exact:true}))
   await studentPersonal.getByText('Result disputed. Please find your instructor together so they can decide the winner.',{exact:true}).waitFor()
   await choose('teacher');await page.getByRole('button',{name:'Resolve disputes',exact:true}).click()
   const queue=page.getByRole('region',{name:'Instructor disputes',exact:true})
   await queue.getByLabel('Winner selected by instructor',{exact:true}).selectOption({label:winner})
   await save(queue.getByRole('button',{name:'Resolve dispute',exact:true}))
   await choose('teacher');peerStudent=true
  }else{
   await form.locator('select').selectOption({label:winner});await save(form.getByRole('button',{name:'Advance winner',exact:true}))
  }
  games++
  if(lane==='final'){
   await event.getByText(/Championship rematch: both finalists now have one loss/).waitFor()
   resetSeen=true
   await page.screenshot({path:output+'/championship-rematch-phone.png',fullPage:true})
  }
 }
 assert.ok(teacherLost&&peerStudent&&resetSeen);assert.equal(games,13)
 await event.getByText('Champion: Instructor — that’s you!',{exact:true}).waitFor()
 for(const [label,width,height] of [['phone',390,844],['small-phone',320,740],['tablet',768,1024],['desktop',1440,1000]]){
  await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' must not overflow')
  await page.screenshot({path:output+'/completed-'+label+'.png',fullPage:true})
 }
 await page.setViewportSize({width:390,height:844})
 // A genuine one-minute timer tests expiry through the complete browser wrapper,
 // without a privileged test hook or simulated client clock.
 const timed=await host('Phone timed single-elimination tournament','single',false)
 for(const view of ['1','2']){await choose(view);await save(timed.getByRole('button',{name:'Enter tournament',exact:true}))}
 await timed.getByRole('region',{name:'Phone timed single-elimination tournament bracket',exact:true}).waitFor({timeout:75000})
 assert.equal(await timed.getByRole('button',{name:'Enter tournament',exact:true}).count(),0)
 await choose('teacher')
 const final=timed.locator('form').first();const winner=(await final.locator('select option').allTextContents())[1]
 await final.locator('select').selectOption({label:winner});await save(final.getByRole('button',{name:'Advance winner',exact:true}))
 await timed.getByText(/^Champion:/).waitFor()
 await page.reload();await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor({timeout:60000});await choose('teacher')
 await event.getByText('Champion: Instructor — that’s you!',{exact:true}).waitFor();await timed.getByText(/^Champion:/).waitFor()
 assert.deepEqual(errors,[])
 console.log('PASS: phone manual signup, instructor join/leave, seven-person draw/bye, peer report/dispute/confirm, second-chance comeback, championship reset, two champions on one date, one-minute automatic close/draw, reload and responsive layouts. Screenshots: '+output)
}catch(error){console.log((await page.locator('body').innerText()).slice(-10000));console.log(errors);await page.screenshot({path:output+'/failure.png',fullPage:true});throw error}finally{await browser.close()}

import {createRequire} from 'node:module'
import {mkdir,readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const {chromium}=createRequire('/Users/ceechhsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs')('playwright')
const output=process.env.ARCHERY_SCREENSHOTS||'/tmp/archery-disputes';await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
const entry=process.env.ARCHERY_PREVIEW_LINK_FILE?(await readFile(process.env.ARCHERY_PREVIEW_LINK_FILE,'utf8')).trim():'http://localhost:3106/attendance/archery-preview'
const message='Result disputed. Please find your instructor together so they can decide the winner.'
try{
 await page.goto(entry);await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor({timeout:60000})
 const roles=await page.getByLabel('Preview as',{exact:true}).locator('option').evaluateAll(options=>Object.fromEntries(options.map(o=>[o.textContent,o.value])))
 const today=()=>page.getByRole('button',{name:'Today',exact:true}).click()
 const view=async(role,day=true)=>{await page.getByLabel('Preview as',{exact:true}).selectOption(role);await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor();if(day)await today()}
 const challenges=async()=>{await page.getByRole('button',{name:'Challenge a classmate',exact:true}).click()}
 const saved=async(button)=>{await button.click();await page.getByRole('status').filter({hasText:'Saved.'}).waitFor();assert.equal((await page.getByRole('alert').allTextContents()).join('').trim(),'')}
 await today();await challenges()
 await page.getByRole('button',{name:'Classmate Choose a classmate',exact:true}).click()
 const picker=page.getByRole('dialog',{name:'Choose a classmate',exact:true})
 await picker.getByRole('option',{name:'Jordan Example',exact:true}).click();await picker.getByRole('button',{name:'Choose Jordan Example',exact:true}).click()
 await page.getByLabel('Game',{exact:true}).fill('Ten rings');await saved(page.getByRole('button',{name:'Send challenge',exact:true}))
 await view('2');await challenges();await saved(page.getByRole('button',{name:'Accept challenge',exact:true}))
 await view('1');await challenges();await page.getByLabel('Winner',{exact:true}).selectOption({label:'Alex Sample'})
 await page.getByLabel('Score or result notes (optional)',{exact:true}).fill('Alex reported 2–1')
 await saved(page.getByRole('button',{name:'Report result',exact:true}))
 await view('2');await challenges();await saved(page.getByRole('button',{name:'Dispute result',exact:true}))
 for(const role of ['1','2']){
  await view(role);await challenges();await page.getByText(message,{exact:true}).waitFor()
  for(const name of ['Confirm result','Dispute result','Report result','Cancel challenge'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0,'disputed challenge pauses '+name)
 }
 await page.screenshot({path:output+'/challenge-paused-phone.png',fullPage:true})
 await view('teacher',false);await page.getByText('1 disputed result needs your decision.',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Resolve disputes',exact:true}).click()
 const queue=page.getByRole('region',{name:'Instructor disputes',exact:true})
 await queue.getByText('Alex reported 2–1',{exact:true}).waitFor()
 await queue.getByLabel('Winner selected by instructor',{exact:true}).selectOption({label:'Jordan Example'})
 await queue.getByLabel('Decision notes (optional)',{exact:true}).fill('Reviewed the target with both players')
 await page.screenshot({path:output+'/instructor-decision-phone.png',fullPage:true})
 await saved(queue.getByRole('button',{name:'Resolve dispute',exact:true}))
 await queue.getByText('No disputes waiting for your decision.',{exact:true}).waitFor()
 for(const role of ['1','2']){
  await view(role);await challenges();await page.getByText('Resolved by instructor',{exact:true}).waitFor()
  await page.getByText('Winner: Jordan Example',{exact:true}).waitFor()
  await page.getByText('Reviewed the target with both players',{exact:true}).first().waitFor()
  await page.getByText('Dispute record',{exact:true}).click();await page.getByText('Originally reported winner: Alex Sample',{exact:true}).waitFor()
 }
 // Three entrants ensure the disputed first matchup must feed a later match.
 await view('teacher');await page.getByRole('button',{name:'Host a tournament',exact:true}).click()
 await page.getByLabel('Tournament name',{exact:true}).fill('Instructor decision tournament')
 await page.getByLabel('Game',{exact:true}).fill('Tic tac toe');await page.getByLabel('Signup closes',{exact:true}).selectOption('manual')
 await saved(page.getByRole('button',{name:'Open registration',exact:true}))
 const event=page.getByRole('article',{name:'Instructor decision tournament',exact:true})
 for(const role of ['1','2','3']){await view(role);await saved(event.getByRole('button',{name:'Enter tournament',exact:true}))}
 await view('teacher');await saved(event.getByRole('button',{name:'Close registration & draw',exact:true}))
 const first=event.locator('form').first();const choices=await first.locator('select option').allTextContents(),reporter=choices[1],opponent=choices[2]
 await view(roles[reporter]);let personal=event.getByRole('region',{name:'Your tournament status',exact:true})
 await personal.getByLabel('Match winner',{exact:true}).selectOption({label:reporter});await saved(personal.getByRole('button',{name:'Report match winner',exact:true}))
 await view(roles[opponent]);await saved(event.getByRole('button',{name:'Dispute result',exact:true}))
 for(const name of [reporter,opponent]){
  await view(roles[name]);personal=event.getByRole('region',{name:'Your tournament status',exact:true})
  await personal.getByText(message,{exact:true}).waitFor()
  for(const label of ['Confirm match result','Report match winner','Dispute result'])assert.equal(await personal.getByRole('button',{name:label,exact:true}).count(),0)
  assert.match(await personal.innerText(),/0 losses/i,'dispute is not a recorded loss')
 }
 await page.screenshot({path:output+'/tournament-paused-phone.png',fullPage:true})
 await view('teacher',false);await page.getByRole('button',{name:'Resolve disputes',exact:true}).click()
 await queue.getByText('Instructor decision tournament',{exact:true}).waitFor()
 await queue.getByLabel('Winner selected by instructor',{exact:true}).selectOption({label:opponent})
 await queue.getByLabel('Decision notes (optional)',{exact:true}).fill('Instructor awarded this match')
 await saved(queue.getByRole('button',{name:'Resolve dispute',exact:true}))
 await view(roles[opponent]);personal=event.getByRole('region',{name:'Your tournament status',exact:true})
 await event.getByRole('region',{name:'Your dispute decision',exact:true}).getByText('Resolved by instructor',{exact:true}).waitFor({timeout:2000})
 await personal.getByLabel('Match winner',{exact:true}).waitFor()
 await event.getByRole('button',{name:'Semifinals',exact:true}).click()
 await event.getByRole('region',{name:'Instructor decision tournament bracket',exact:true}).getByText('Resolved by instructor',{exact:true}).waitFor()
 await view(roles[reporter]);await personal.getByText('Your tournament run is complete. Follow the remaining matches below.',{exact:true}).waitFor()
 await event.getByRole('region',{name:'Your dispute decision',exact:true}).getByText('Resolved by instructor',{exact:true}).waitFor({timeout:2000})
 await view('teacher');const final=event.locator('form').first()
 const finalists=await final.locator('select option').allTextContents();await final.locator('select').selectOption({label:finalists[1]});await saved(final.getByRole('button',{name:'Advance winner',exact:true}))
 await event.getByText(/^Champion:/).waitFor()
 await page.reload();await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor({timeout:60000})
 await today();await challenges();await page.getByText('Resolved by instructor',{exact:true}).first().waitFor()
 for(const [label,width,height] of [['phone',390,844],['small-phone',320,740],['tablet',768,1024],['desktop',1440,1000]]){
  await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.screenshot({path:output+'/decision-history-'+label+'.png',fullPage:true})
 }
 assert.deepEqual(errors,[])
 console.log('PASS: both players see instructor message and paused controls for challenge/tournament, instructor queue preserves reported evidence and decides alternate winner, bracket advances only after decision, elimination/champion/history/reload and responsive layouts.')
}catch(error){console.log((await page.locator('body').innerText()).slice(-12000));console.log(errors);await page.screenshot({path:output+'/failure.png',fullPage:true});throw error}finally{await browser.close()}

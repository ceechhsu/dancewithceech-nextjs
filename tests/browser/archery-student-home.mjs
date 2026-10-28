import {createRequire} from 'node:module'
import {mkdir,readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const {chromium}=createRequire('/Users/ceechhsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs')('playwright')
const output=process.env.ARCHERY_SCREENSHOTS||'/tmp/archery-student-home'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
const entry=process.env.ARCHERY_PREVIEW_LINK_FILE?(await readFile(process.env.ARCHERY_PREVIEW_LINK_FILE,'utf8')).trim():(process.env.ARCHERY_PREVIEW_ORIGIN||'http://localhost:3106')+'/attendance/archery-preview'
try{
 await page.goto(entry);await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor({timeout:60000})
 if(process.env.ARCHERY_PREVIEW_LINK_FILE){
  for(const path of ['/api/attendance/classes','/api/attendance/archery','/api/auth/session'])assert.equal((await page.request.get(new URL(path,entry).href)).status(),404,'phone demo keeps real account/class APIs disabled')
 }
 const today=await page.locator('[aria-current="date"]').getAttribute('data-date')
 const day=()=>page.getByRole('button',{name:'Today',exact:true}).click()
 const view=async(role)=>{await page.getByLabel('Preview as',{exact:true}).selectOption(role);await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor();await day()}
 const saved=async(button)=>{await button.click();await page.getByRole('status').filter({hasText:'Saved.'}).waitFor()}
 await day()
 assert.equal(await page.getByRole('button',{name:'Tournament',exact:true}).count(),0,'students have no permanent Tournament button')
 assert.equal(await page.getByRole('region',{name:'Class tournaments',exact:true}).count(),0,'no tournament section when none exists')
 assert.equal(await page.getByText(/No tournament/).count(),0,'no empty tournament message')
 await page.getByRole('button',{name:'Challenge a classmate',exact:true}).waitFor()
 await page.screenshot({path:output+'/student-empty-day-phone.png',fullPage:true})
 await page.getByRole('button',{name:'Challenge a classmate',exact:true}).click()
 await page.getByRole('region',{name:'Class challenges',exact:true}).waitFor()
 await page.getByRole('button',{name:'Classmate Choose a classmate',exact:true}).click()
 const picker=page.getByRole('dialog',{name:'Choose a classmate',exact:true})
 await picker.getByRole('option',{name:'Jordan Example',exact:true}).click();await picker.getByRole('button',{name:'Choose Jordan Example',exact:true}).click()
 await page.getByLabel('Game',{exact:true}).fill('Ten rings')
 await saved(page.getByRole('button',{name:'Send challenge',exact:true}))
 await page.getByText('Waiting for Jordan Example to respond.',{exact:true}).waitFor()
 await page.getByLabel('Preview as',{exact:true}).selectOption('2')
 await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor()
 await page.getByText('You have 1 new challenge.',{exact:true}).waitFor()
 await page.getByRole('button',{name:'View challenges',exact:true}).click()
 await page.getByRole('button',{name:'Challenge a classmate',exact:true}).waitFor()
 await saved(page.getByRole('button',{name:'Accept challenge',exact:true}))
 await view('teacher')
 await page.getByRole('button',{name:'Review class challenges',exact:true}).waitFor()
 await page.getByRole('button',{name:'Host a tournament',exact:true}).click()
 await page.getByLabel('Tournament name',{exact:true}).fill('Visible on the calendar day')
 await page.getByLabel('Game',{exact:true}).fill('Tic tac toe')
 await page.getByLabel('Signup closes',{exact:true}).selectOption('manual')
 await saved(page.getByRole('button',{name:'Open registration',exact:true}))
 const event=page.getByRole('article',{name:'Visible on the calendar day',exact:true})
 await event.waitFor()
 for(const role of ['1','2']){
  await view(role)
  await event.getByRole('button',{name:'Enter tournament',exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Tournament',exact:true}).count(),0)
  assert.equal(await page.getByRole('button',{name:'Host a tournament',exact:true}).count(),0)
  await saved(event.getByRole('button',{name:'Enter tournament',exact:true}))
  await event.getByRole('button',{name:'Leave tournament',exact:true}).waitFor()
 }
 await page.screenshot({path:output+'/student-signup-phone.png',fullPage:true})
 await view('teacher');await saved(event.getByRole('button',{name:'Close registration & draw',exact:true}))
 await view('1')
 await event.getByRole('region',{name:'Your tournament status',exact:true}).getByText('You vs Jordan Example',{exact:true}).waitFor()
 assert.equal(await event.getByRole('button',{name:'Enter tournament',exact:true}).count(),0)
 const personal=event.getByRole('region',{name:'Your tournament status',exact:true})
 await personal.getByLabel('Match winner',{exact:true}).selectOption({label:'Alex Sample'})
 await saved(personal.getByRole('button',{name:'Report match winner',exact:true}))
 await view('2');await saved(event.getByRole('button',{name:'Confirm match result',exact:true}))
 await event.getByText('Champion: Alex Sample',{exact:true}).waitFor()
 await day();await event.getByText('Champion: Alex Sample',{exact:true}).waitFor()
 for(const [label,width,height] of [['phone',390,844],['small-phone',320,740],['tablet',768,1024],['desktop',1440,1000]]){
  await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.screenshot({path:output+'/student-result-'+label+'.png',fullPage:true})
 }
 const before=new Date(today+'T12:00:00Z');before.setUTCDate(before.getUTCDate()-1)
 const previous=page.locator(`[data-date="${before.toISOString().slice(0,10)}"]`)
 if(!await previous.count())await page.getByRole('button',{name:'Previous month',exact:true}).click()
 await previous.click()
 assert.equal(await event.count(),0,'only the selected date shows its tournaments')
 assert.equal(await page.getByRole('region',{name:'Class tournaments',exact:true}).count(),0)
 await page.getByRole('button',{name:'Challenge a classmate',exact:true}).click();await page.getByRole('region',{name:'Class challenges',exact:true}).waitFor()
 await page.reload();await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor({timeout:60000})
 await view('1');await event.getByText('Champion: Alex Sample — that’s you!',{exact:true}).waitFor()
 assert.deepEqual(errors,[])
 console.log('PASS: no student Tournament button/empty section, direct challenge button and name wheel, instructor host/review controls, tournament card/entry visible on its date, closed signup, automatic opponent/result and persisted champion across responsive layouts.')
}catch(error){console.log((await page.locator('body').innerText()).slice(0,8000));console.log(errors);await page.screenshot({path:output+'/failure.png',fullPage:true});throw error}finally{await browser.close()}

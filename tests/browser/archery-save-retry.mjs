import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {encode} from 'next-auth/jwt'
const {chromium}=createRequire('/Users/ceechhsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs')('playwright')
const origin='http://localhost:3105',classId='00000000-0000-0000-0000-000000000001'
const output='/tmp/archery-retry-review';await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage()
const email='teacher@example.com'
await context.addCookies([{name:'authjs.session-token',value:await encode({secret:'local-class-progress-fixture',salt:'authjs.session-token',token:{email,name:'Instructor',googleSub:'sub-'+email,googleEmailVerified:true,googleProfileReady:true}}),url:origin,httpOnly:true,sameSite:'Lax'}])
const snapshot=async()=>{const r=await context.request.get(origin+'/api/attendance/archery?classId='+classId);assert.equal(r.status(),200);return r.json()}
let failRefresh=false,failResponse=false,dropGet=false,posts=[]
await page.route('**/api/attendance/archery*',async route=>{
 const request=route.request()
 if(request.method()==='POST'){
  posts.push(request.postDataJSON())
  const response=await route.fetch()
  if(failResponse){failResponse=false;return route.abort('failed')}
  if(failRefresh){failRefresh=false;dropGet=true}
  return route.fulfill({response})
 }
 if(dropGet){dropGet=false;return route.abort('failed')}
 return route.continue()
})
try{
 const initial=await snapshot()
 await page.goto(origin+'/attendance/archery/'+classId)
 const practice=async()=>{await page.getByRole('button',{name:'Today',exact:true}).click();await page.getByRole('button',{name:'Individual scoring',exact:true}).click()}
 const enter=async()=>{
  await page.getByLabel('Distance',{exact:true}).fill('30');await page.getByLabel('Arrows this round',{exact:true}).fill('1')
  await page.getByRole('button',{name:/^Arrow 1:/}).click();const wheel=page.getByRole('dialog',{name:'Choose your score',exact:true})
  await wheel.getByRole('slider').press('End');await wheel.getByRole('button',{name:'Use X',exact:true}).click()
 }
 await practice();await enter();await page.getByLabel('Notes (optional)',{exact:true}).fill('Accepted before refresh failure')
 failRefresh=true;await page.getByRole('button',{name:'Save round',exact:true}).click()
 await page.getByRole('alert').filter({hasText:/saved.*refresh/i}).waitFor({timeout:3000})
 assert.equal(await page.getByRole('button',{name:'Save round',exact:true}).isDisabled(),true,'accepted write resets entry even when refresh fails')
 assert.equal((await snapshot()).personalRounds.length,initial.personalRounds.length+1)
 await page.getByRole('region',{name:'Individual round history',exact:true}).getByText('Accepted before refresh failure',{exact:true}).waitFor({timeout:10000})
 assert.equal(posts.filter(x=>x.action==='round_save').length,1,'automatic refresh never repeats the write')
 await enter();await page.getByLabel('Notes (optional)',{exact:true}).fill('Accepted before response loss')
 failResponse=true;await page.getByRole('button',{name:'Save round',exact:true}).click()
 await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'Save round',exact:true}).click()
 await page.getByRole('region',{name:'Individual round history',exact:true}).getByText('Accepted before response loss',{exact:true}).waitFor()
 const attempts=posts.filter(x=>x.notes==='Accepted before response loss')
 assert.equal(attempts.length,2);assert.equal(attempts[0].id,attempts[1].id,'unknown mutation outcome retries reuse the request ID')
 assert.equal((await snapshot()).personalRounds.length,initial.personalRounds.length+2)
 await page.getByRole('button',{name:'Today',exact:true}).click();await page.getByRole('button',{name:'Host a tournament',exact:true}).click()
 const title='Accepted tournament before refresh failure'
 await page.getByLabel('Tournament name',{exact:true}).fill(title);await page.getByLabel('Game',{exact:true}).fill('Winner only')
 await page.getByLabel('Signup closes',{exact:true}).selectOption('manual')
 failRefresh=true;await page.getByRole('button',{name:'Open registration',exact:true}).click()
 await page.getByRole('alert').filter({hasText:/saved.*refresh/i}).waitFor({timeout:3000})
 await page.getByRole('article',{name:title,exact:true}).waitFor({timeout:10000})
 assert.equal((await snapshot()).tournaments.filter(t=>t.title===title).length,1)
 assert.equal(posts.filter(x=>x.action==='tournament_open').length,1)
 console.log('PASS: accepted round/tournament survives failed read refresh without duplicate write; lost write responses retry the same ID; score entry and host form acknowledge accepted saves.')
}catch(error){console.log((await page.locator('body').innerText()).slice(-7000));await page.screenshot({path:output+'/failure.png',fullPage:true});throw error}finally{await browser.close()}

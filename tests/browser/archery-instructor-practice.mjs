import {createRequire} from 'node:module'
import {readFile,mkdir} from 'node:fs/promises'
import assert from 'node:assert/strict'
const {chromium}=createRequire('/Users/ceechhsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs')('playwright')
const output=process.env.ARCHERY_SCREENSHOTS||'/tmp/archery-instructor-practice';await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const context=await browser.newContext({viewport:{width:375,height:812}}),page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
try{
 const entry=process.env.ARCHERY_PREVIEW_LINK_FILE?(await readFile(process.env.ARCHERY_PREVIEW_LINK_FILE,'utf8')).trim():(process.env.ARCHERY_PREVIEW_ORIGIN||'http://localhost:3106')+'/attendance/archery-preview'
 await page.goto(entry);await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor({timeout:60000})
 async function as(view){await page.getByLabel('Preview as',{exact:true}).selectOption(view);await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor();await page.getByRole('button',{name:'Today',exact:true}).click()}
 async function score(i,mark){await page.getByRole('button',{name:new RegExp('^Arrow '+i+':')}).click();const modal=page.getByRole('dialog',{name:'Choose your score',exact:true}),wheel=modal.getByRole('slider');await wheel.press(mark==='M'?'Home':'End');if(mark!=='M'&&mark!=='X')for(let j=10;j>=Number(mark);j--)await wheel.press('ArrowLeft');await modal.getByRole('button',{name:'Use '+mark,exact:true}).click()}
 await as('teacher');await page.getByRole('button',{name:'Individual scoring',exact:true}).click()
 await page.getByRole('heading',{name:'Record a round',exact:true}).waitFor({timeout:3000})
 assert.equal(await page.getByRole('group',{name:'Arrow scores',exact:true}).getByRole('button').count(),5)
 await page.getByLabel('Distance',{exact:true}).fill('30')
 for(const [i,mark]of['X','10','9','M','7'].entries())await score(i+1,mark)
 await page.getByLabel('Notes (optional)',{exact:true}).fill('Instructor personal practice')
 await page.getByRole('button',{name:'Save round',exact:true}).click()
 const history=page.getByRole('region',{name:'Individual round history',exact:true})
 await history.getByText('Instructor personal practice',{exact:true}).waitFor()
 assert.match(await history.innerText(),/36/)
 await page.getByRole('button',{name:'Today',exact:true}).click()
 const own=page.getByRole('region',{name:'Your practice summary',exact:true}),students=page.getByRole('region',{name:'Student practice summary',exact:true})
 await own.getByText('X',{exact:true}).waitFor();assert.match(await own.innerText(),/36/)
 assert.equal(await students.getByText('X',{exact:true}).count(),0)
 await page.screenshot({path:output+'/instructor-summary-mobile.png',fullPage:true})
 await as('1')
 await page.getByRole('region',{name:'Daily practice summary',exact:true}).getByText('No rounds recorded for this day.',{exact:true}).waitFor()
 assert.equal(await page.getByText('Instructor personal practice',{exact:true}).count(),0)
 await page.getByRole('button',{name:'Individual scoring',exact:true}).click()
 await page.getByLabel('Distance',{exact:true}).fill('15');await page.getByLabel('Arrows this round',{exact:true}).fill('1');await score(1,'5');await page.getByLabel('Notes (optional)',{exact:true}).fill('Student practice remains separate');await page.getByRole('button',{name:'Save round',exact:true}).click()
 await history.getByText('Student practice remains separate',{exact:true}).waitFor()
 await as('teacher');await own.getByText('X',{exact:true}).waitFor();await students.getByText('Alex Sample',{exact:true}).waitFor()
 assert.equal(await own.getByText('5',{exact:true}).count(),0)
 await page.getByRole('button',{name:'Individual scoring',exact:true}).click()
 await page.getByLabel('Distance',{exact:true}).fill('20');await page.getByLabel('Unit',{exact:true}).selectOption('yd');await page.getByLabel('Arrows this round',{exact:true}).fill('1');await score(1,'M');await page.getByRole('button',{name:'Save round',exact:true}).click()
 await history.getByText('20 yd · 1 arrow',{exact:true}).waitFor()
 const review=page.getByRole('region',{name:'Student practice history',exact:true});await review.getByText('Student practice remains separate',{exact:true}).waitFor()
 assert.equal(await review.getByText('Instructor personal practice',{exact:true}).count(),0)
 for(const [label,width,height]of[['mobile',375,812],['tablet',768,1024],['desktop',1440,1000]]){await page.setViewportSize({width,height});await page.screenshot({path:output+'/instructor-scorecard-'+label+'.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
 await page.reload();await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor({timeout:60000});await as('teacher')
 await own.getByRole('rowheader',{name:'2',exact:true}).waitFor();await students.getByText('Alex Sample',{exact:true}).waitFor()
 assert.equal(await page.locator('[aria-current="date"]').getAttribute('aria-label').then(s=>s.includes('3 practice rounds')),true)
 assert.deepEqual(errors,[])
 console.log('PASS: instructor practices directly with 5-arrow default and X/M scores, custom count/yards, personal calendar/history and persistence, student privacy/review separation and responsive layout.')
}catch(error){console.log('Failure page:',(await page.locator('body').innerText()).slice(0,6000));console.log('Runtime errors:',errors);await page.screenshot({path:output+'/failure.png',fullPage:true});throw error}finally{await browser.close()}

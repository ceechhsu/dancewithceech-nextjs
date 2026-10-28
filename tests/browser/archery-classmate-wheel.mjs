import {createRequire} from 'node:module'
import {readFile,mkdir} from 'node:fs/promises'
import assert from 'node:assert/strict'
const {chromium}=createRequire('/Users/ceechhsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs')('playwright')
const output=process.env.ARCHERY_SCREENSHOTS||'/tmp/archery-classmate-wheel';await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
try{
 const entry=process.env.ARCHERY_PREVIEW_LINK_FILE?(await readFile(process.env.ARCHERY_PREVIEW_LINK_FILE,'utf8')).trim():(process.env.ARCHERY_PREVIEW_ORIGIN||'http://localhost:3106')+'/attendance/archery-preview'
 await page.goto(entry);await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor({timeout:60000})
 await page.getByRole('button',{name:'Today',exact:true}).click();await page.getByRole('button',{name:'Challenge a classmate',exact:true}).click()
 await page.getByRole('button',{name:'Classmate Choose a classmate',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Choose a classmate',exact:true}),wheel=dialog.getByRole('listbox',{name:'Archery class roster',exact:true})
 await dialog.waitFor({timeout:3000})
 const box=await dialog.boundingBox();assert.ok(box.height<600&&box.width<=375&&box.y>=0,'picker stays compact on a small phone')
 assert.equal(await wheel.getByRole('option').count(),12,'all classmates are listed, including own labeled entry')
 assert.equal(await wheel.getByRole('option',{name:'Alex Sample (you)',exact:true}).getAttribute('aria-disabled'),'true')
 await page.screenshot({path:output+'/classmate-wheel-mobile.png'})
 for(const [label,width,height] of [['tablet',768,1024],['desktop',1440,1000]]){
  await page.setViewportSize({width,height});const box=await dialog.boundingBox();assert.ok(box.width<=380&&box.height<600,'picker remains bounded at '+label)
  await page.screenshot({path:output+'/classmate-wheel-'+label+'.png'})
 }
 await page.setViewportSize({width:375,height:667})
 // Scroll the native vertical wheel using touch, then confirm a deliberate choice.
 const bounds=await wheel.boundingBox(),session=await context.newCDPSession(page),x=bounds.x+bounds.width/2
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:bounds.y+bounds.height-35}]})
 for(let y=bounds.y+bounds.height-55;y>=bounds.y+40;y-=20)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]})
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 await page.waitForFunction(()=>document.querySelector('[role=listbox]').scrollTop>48)
 await wheel.press('End');await dialog.getByRole('button',{name:'Choose Taylor Sample',exact:true}).waitFor()
 await wheel.press('Home');assert.equal(await wheel.getByRole('option',{name:'Alex Sample (you)',exact:true}).getAttribute('aria-selected'),'false','keyboard skips own name')
 await wheel.getByRole('option',{name:'Jamie Demo',exact:true}).click();await wheel.press('PageUp');await dialog.getByRole('button',{name:'Choose Avery Example',exact:true}).waitFor()
 await wheel.getByRole('option',{name:'Jordan Example',exact:true}).click()
 await dialog.getByRole('button',{name:'Choose Jordan Example',exact:true}).click()
 await page.getByRole('button',{name:'Classmate Jordan Example',exact:true}).waitFor()
 await page.getByRole('button',{name:'Classmate Jordan Example',exact:true}).click()
 await wheel.press('End');await wheel.press('Escape')
 await page.getByRole('button',{name:'Classmate Jordan Example',exact:true}).waitFor()
 await page.waitForFunction(()=>document.activeElement?.textContent.includes('Jordan Example'))
 await page.getByLabel('Game',{exact:true}).fill('Tic tac toe')
 await page.getByRole('button',{name:'Send challenge',exact:true}).click()
 await page.getByText('Waiting for Jordan Example to respond.',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Classmate Choose a classmate',exact:true}).waitFor()
 // A successful invitation clears the previous choice; all names remain reachable.
 await page.getByRole('button',{name:'Classmate Choose a classmate',exact:true}).click()
 await wheel.press('End');await dialog.getByRole('button',{name:'Choose Taylor Sample',exact:true}).click()
 await page.getByRole('button',{name:'Classmate Taylor Sample',exact:true}).waitFor()
 assert.deepEqual(errors,[])
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow')
 console.log('PASS: compact phone name wheel, all 12 class names, self challenge disabled, touch scroll, keyboard navigation, deliberate confirmation, cancellation/focus, invite and reset.')
}catch(error){console.log('Failure page:',(await page.locator('body').innerText()).slice(0,5000));console.log('Runtime errors:',errors);await page.screenshot({path:output+'/failure.png',fullPage:true});throw error}finally{await browser.close()}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url=process.env.HALLOWEEN_PREVIEW_URL || 'http://127.0.0.1:3101/?preview=halloween-music';
const output=process.env.HALLOWEEN_TEST_OUTPUT || join(tmpdir(),'halloween-music-preview');
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});
const errors=[];
async function open({mobile=false,motion='no-preference',date}={}) {
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile,reducedMotion:motion});
 await context.route(/google-analytics|googletagmanager|facebook\.net|facebook\.com\/tr/,r=>r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 if(date){const time=new Date(date);await page.clock.install({time});await page.clock.pauseAt(time);}
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Hide decorations',exact:true}).waitFor();
 await page.locator('audio[data-halloween-sound]').evaluate(el=>{window.musicEvents=[];for(const name of ['playing','pause','ended'])el.addEventListener(name,()=>window.musicEvents.push(name));});
 return page;
}
const playing=(page,place)=>page.waitForFunction(place=>document.querySelector(`[data-halloween-scene="${place}"]`)?.getAttribute('data-music-playing')==='true',place);
const stopped=page=>page.waitForFunction(()=>{const el=document.querySelector('audio[data-halloween-sound]');return el.paused&&el.currentTime===0&&document.querySelectorAll('[data-music-playing]').length===0;});
try {
 const page=await open();const hero=page.locator('[data-halloween-scene="hero"]');
 assert.equal(await page.locator('audio[data-halloween-sound]').evaluate(el=>el.paused),true);
 await hero.click();
 await page.waitForFunction(()=>window.musicEvents.includes('playing'));
 assert.ok(await page.locator('audio[data-halloween-sound]').evaluate(el=>el.duration>10&&el.duration<12),'use the entire eleven-second music clip');
 await playing(page,'hero');
 assert.ok(await hero.locator('[data-music-playing]').evaluate(el=>getComputedStyle(el).animationName.includes('music-dance')));
 await page.waitForFunction(()=>document.querySelector('audio[data-halloween-sound]').currentTime>2);
 assert.equal(await hero.getAttribute('data-music-playing'),'true','dancing lasts beyond the short greeting');
 await page.screenshot({path:join(output,'desktop-playing.png')});
 await hero.click();await stopped(page);
 await hero.click();await playing(page,'hero');
 const story=page.locator('[data-halloween-scene="story"]');await story.click();await playing(page,'story');
 assert.equal(await hero.getAttribute('data-music-playing'),null);
 assert.equal(await page.locator('audio[data-halloween-sound]').count(),1);
 await page.locator('audio[data-halloween-sound]').evaluate(el=>{el.currentTime=el.duration-.1;});
 await page.waitForFunction(()=>window.musicEvents.includes('ended'));await stopped(page);
 await hero.focus();await page.keyboard.press('Space');await playing(page,'hero');
 await page.keyboard.press('Enter');await stopped(page);
 await hero.click();await playing(page,'hero');
 await page.getByRole('button',{name:'Hide decorations',exact:true}).click();await stopped(page);
 assert.equal(await page.locator('[data-halloween-scene]').count(),0);
 await page.getByRole('button',{name:'Show decorations',exact:true}).click();await stopped(page);
 console.log('PASS whole clip, ongoing synchronized dance, second-click stop, scene handoff, natural end, keyboard, hide/show');

 const mobile=await open({mobile:true});const mobileHero=mobile.locator('[data-halloween-scene="hero"]');
 await mobileHero.tap();await playing(mobile,'hero');
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await mobile.screenshot({path:join(output,'mobile-playing.png')});
 await mobileHero.tap();await stopped(mobile);
 console.log('PASS touch start/stop and mobile layout');

 const reduced=await open({motion:'reduce'});await reduced.locator('[data-halloween-scene="hero"]').click();await playing(reduced,'hero');
 assert.equal(await reduced.evaluate(()=>document.getAnimations().filter(a=>a.animationName?.includes('music-dance')).length),0);
 await reduced.getByRole('button',{name:'Hide decorations',exact:true}).click();await stopped(reduced);
 console.log('PASS reduced motion allows user-requested music without dancing');

 const expiry=await open({date:'2026-11-01T06:59:59Z'});await expiry.locator('[data-halloween-scene="hero"]').click();await playing(expiry,'hero');
 await expiry.clock.fastForward(1000);await expiry.locator('[data-halloween="active"]').waitFor({state:'detached'});await stopped(expiry);
 assert.equal(await expiry.locator('[data-halloween-scene]').count(),0);
 console.log('PASS midnight Pacific stops the long music and removes its dancing controls');
 assert.deepEqual(errors,[]);console.log('PASS no browser page errors');
} finally {await browser.close();}

// Requires the disposable class-progress fixture and Next app on localhost:3105.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { encode } from 'next-auth/jwt'
let chromium
try { ({chromium}=createRequire(import.meta.url)('playwright')) } catch {
  ({chromium}=createRequire((process.env.BROWSER_NODE_MODULES || '/Users/ceechhsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/runtime.cjs')('playwright'))
}
const origin=process.env.ARCHERY_ACCESS_ORIGIN || 'http://localhost:3105'
const id='00000000-0000-0000-0000-000000000001', other='00000000-0000-0000-0000-000000000004', weights='00000000-0000-0000-0000-000000000002'
const browser=await chromium.launch({headless:true,channel:'chrome'})
const errors=[]
async function context(email) {
  const c=await browser.newContext({viewport:{width:1440,height:900}})
  // The disposable attendance fixture has no account-profile database. Keep that
  // unrelated optional request local; UserMenu falls back to Google identity.
  await c.route('**/api/account/profile',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Profile fixture unavailable"}'}))
  if(email) {
    const token=await encode({secret:'local-class-progress-fixture',salt:'authjs.session-token',token:{email,name:'Example Account',googleSub:'sub-'+email,googleEmailVerified:true,googleProfileReady:true}})
    await c.addCookies([{name:'authjs.session-token',value:token,url:origin,httpOnly:true,sameSite:'Lax'}])
  }
  return c
}
async function menu(page,yes,header=false) {
  const desktop=page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Archery',exact:true})
  if(!header) {
    if(yes) await desktop.waitFor({state:'visible'})
    else assert.equal(await desktop.count(),0)
    await page.setViewportSize({width:375,height:667})
  }
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const mobile=page.locator('#mobile-navigation').getByRole('link',{name:'Archery',exact:true})
  if(yes) { await mobile.waitFor();assert.equal(await mobile.getAttribute('href'),'/attendance/archery/'+id) }
  else assert.equal(await mobile.count(),0)
  await page.getByRole('button',{name:'Close menu',exact:true}).click()
}
try {
  for(const [email,allowed] of [[null,false],['teacher@example.com',true],['student@example.com',true],['dance@example.com',false],['outsider@example.com',false]]) {
    const c=await context(email),page=await c.newPage();page.on('pageerror',e=>errors.push(e.message))
    const access=await c.request.get(origin+'/api/attendance/archery-access')
    assert.equal(access.status(),email?200:401)
    assert.match(access.headers()['cache-control'],/no-store/)
    if(email) {
      const data=await access.json()
      assert.deepEqual(Object.keys(data).sort(),['account','classes'])
      assert.equal(data.account,email)
      assert.equal(data.classes.length,allowed?1:0)
      for(const item of data.classes)assert.deepEqual(Object.keys(item).sort(),['id','name'])
    }
    await page.goto(origin+'/about');await page.waitForLoadState('networkidle');await menu(page,allowed)
    await page.goto(origin+'/attendance/archery/'+id);await page.waitForLoadState('networkidle')
    if(allowed)await page.getByRole('region',{name:'Archery calendar',exact:true}).waitFor()
    else {
      assert.equal(await page.getByRole('region',{name:'Archery calendar',exact:true}).count(),0)
      assert.equal(await page.getByRole('heading',{name:'Record a round',exact:true}).count(),0)
      await page.getByRole('heading',{name:email?'Archery access required':'Sign in with Google',exact:true}).waitFor()
    }
    await menu(page,allowed,true)
    if(email) for(const forbidden of [other,weights]) {
      await page.goto(origin+'/attendance/archery/'+forbidden)
      await page.getByRole('heading',{name:'Archery access required',exact:true}).waitFor()
      assert.equal(await page.getByRole('region',{name:'Archery calendar',exact:true}).count(),0)
    }
    await c.close()
  }
  // Fail closed when the access endpoint fails even though Google sign-in succeeds.
  const c=await context('student@example.com'), page=await c.newPage()
  await page.route('**/api/attendance/archery-access',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"offline"}'}))
  await page.goto(origin+'/about');await page.waitForLoadState('networkidle');await menu(page,false)
  await c.close()
  // A request that began before sign-out must never restore its old menu link.
  const stale=await context('student@example.com'), p=await stale.newPage()
  let release, requestedResolve
  const requested=new Promise(resolve=>{requestedResolve=resolve})
  const held=new Promise(resolve=>{release=resolve})
  await p.route('**/api/attendance/archery-access',async route=>{
    requestedResolve();await held
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({account:'student@example.com',classes:[{id,name:'Archery'}]})}).catch(()=>{})
  })
  await p.goto(origin+'/about');await requested;await stale.clearCookies()
  await p.evaluate(()=>{const channel=new BroadcastChannel('next-auth');channel.postMessage({event:'session',data:{trigger:'signout'}});channel.close()})
  release();await p.waitForLoadState('networkidle')
  assert.equal(await p.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Archery',exact:true}).count(),0)
  await stale.close()
  assert.deepEqual(errors,[])
  console.log('PASS: minimal authenticated membership endpoint; desktop, phone and attendance-header menus; direct route denial; owner/student access; unrelated classes, errors and late logout responses stay closed.')
} finally { await browser.close() }

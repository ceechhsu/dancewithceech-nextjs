// Local production HTTP -> real SDK -> synthetic profile storage, never production data.
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import { encode } from 'next-auth/jwt'
import sharp from 'sharp'
const origin='http://127.0.0.1:3151',database='http://127.0.0.1:3152'
const rows=new Map(),calls=[]
let unavailable=false
const db=http.createServer(async(req,res)=>{
 const url=new URL(req.url,database);calls.push({method:req.method,path:url.pathname,account:url.searchParams.get('account')})
 res.setHeader('content-type','application/json')
 assert.ok(url.pathname.endsWith('/trainer_profiles'),'Profile page must not depend on rewards or attendance')
 if(unavailable){res.statusCode=503;res.end('{"message":"private backend diagnostic"}');return}
 if(req.method==='GET'){res.end(JSON.stringify(rows.get(url.searchParams.get('account')?.replace(/^eq\./,''))??null));return}
 assert.equal(req.method,'POST');let text='';for await(const chunk of req)text+=chunk
 const value=JSON.parse(text);assert.ok(['google:profile-a','google:profile-b'].includes(value.account));rows.set(value.account,value)
 res.statusCode=201;res.end('null')
})
await new Promise((resolve,reject)=>{db.once('error',reject);db.listen(3152,'127.0.0.1',resolve)})
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3151'],{stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_ENV:'production',AUTH_SECRET:'profile-fixture-secret',TRAINER_SUPABASE_URL:database,TRAINER_SUPABASE_SECRET_KEY:'local-fixture-placeholder',RESEND_API_KEY:'re_local_fixture',NEXT_PUBLIC_SUPABASE_URL:database,NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-fixture',SUPABASE_SERVICE_ROLE_KEY:'local-fixture'}})
let logs='';server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s)
async function token(sub='profile-a',verified=true){return 'authjs.session-token='+await encode({secret:'profile-fixture-secret',salt:'authjs.session-token',token:{email:sub+'@example.invalid',name:'Fixture Dancer',picture:'https://lh3.googleusercontent.com/fixture',googleSub:sub,googleEmailVerified:verified,googleGivenName:'Fixture',googleFamilyName:'Dancer'},maxAge:600})}
try{
 let ready=false;for(let i=0;i<40;i++){try{await fetch(origin+'/profile');ready=true;break}catch{await delay(250)}}assert.ok(ready,logs)
 const a={cookie:await token()},b={cookie:await token('profile-b')}
 const get=async(headers=a)=>fetch(origin+'/api/account/profile',{headers})
 const post=async(data,headers=a,extra={})=>fetch(origin+'/api/account/profile',{method:'POST',headers:{...headers,origin:'http://localhost:3151','content-type':'application/json','x-profile-owner':'google:profile-a',...extra},body:JSON.stringify(data)})
 const before=calls.length
 for(const headers of [{},{cookie:await token('profile-a',false)}]){
  assert.equal((await get(headers)).status,401)
  const html=await(await fetch(origin+'/profile',{headers})).text();assert.ok(html.includes('Your profile starts here'));assert.ok(!html.includes('profile-a@example.invalid'))
  assert.equal((await fetch(origin+'/api/account/profile/photo',{headers})).status,401)
 }
 assert.equal(calls.length,before,'Denied sessions must not read storage')
 const defaults=await get();assert.equal(defaults.status,200);assert.match(defaults.headers.get('cache-control'),/private, no-store/)
 const initial=await defaults.json();assert.equal(initial.first_name,'Fixture');assert.equal(initial.last_name,'Dancer');assert.equal(initial.photo_url,'https://lh3.googleusercontent.com/fixture');assert.equal(rows.size,0,'GET must not create a profile')
 const edited={first_name:'Edited',last_name:'Dancer',display_name:'On the beat',photo_mode:'google'}
 assert.equal((await post(edited)).status,200)
 assert.equal((await(await get()).json()).display_name,'On the beat')
 const other=await(await get(b)).json();assert.equal(other.display_name,'Fixture Dancer');assert.equal(other.email,'profile-b@example.invalid')
 assert.equal(rows.size,1)
 const writesBefore=calls.filter(c=>c.method==='POST').length
 assert.equal((await post(edited,a,{origin:'https://foreign.invalid'})).status,403)
 assert.equal((await post(edited,b)).status,409)
 assert.equal((await get({...b,'x-profile-owner':'google:profile-a'})).status,409)
 assert.equal((await fetch(origin+'/api/account/profile?account=google:profile-b',{headers:a})).status,400)
 assert.equal((await post({...edited,account:'google:profile-b',email:'spoof@example.invalid'})).status,422)
 assert.equal(calls.filter(c=>c.method==='POST').length,writesBefore)
 const jpeg=await sharp({create:{width:20,height:16,channels:3,background:'#b08a40'}}).withMetadata().jpeg().toBuffer()
 assert.equal((await post({...edited,photo_mode:'custom',photo_data:'data:image/jpeg;base64,'+jpeg.toString('base64')})).status,200)
 const uploaded=await(await get()).json();assert.ok(uploaded.photo_url.startsWith('/api/account/profile/photo?v='));assert.equal(uploaded.photo,undefined)
 const photo=await fetch(origin+uploaded.photo_url,{headers:a});assert.equal(photo.status,200);assert.match(photo.headers.get('cache-control'),/private, no-store/)
 const meta=await sharp(Buffer.from(await photo.arrayBuffer())).metadata();assert.equal(meta.width,384);assert.equal(meta.height,384);assert.equal(meta.exif,undefined)
 assert.equal((await fetch(origin+uploaded.photo_url,{headers:b})).status,404,'Other account cannot read first account photo')
 assert.equal((await post({...edited,photo_mode:'custom',photo_data:'data:image/jpeg;base64,AAAA'})).status,422)
 assert.equal((await post({...edited,photo_mode:'none'})).status,200);assert.equal((await(await get()).json()).photo_url,'')
 assert.equal((await fetch(origin+uploaded.photo_url,{headers:a})).status,404)
 assert.equal((await post(edited)).status,200);assert.equal((await(await get()).json()).photo_url,initial.photo_url)
 const page=await fetch(origin+'/profile',{headers:a}),html=await page.text()
 assert.match(page.headers.get('cache-control'),/private, no-store/);assert.match(page.headers.get('content-security-policy'),/https:\/\/\*\.googleusercontent\.com/)
 assert.ok(html.includes('On the beat'));assert.ok(html.includes('Nickname'));assert.ok(!html.includes('profile-b@example.invalid'))
 unavailable=true
 const failure=await get();assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('private backend diagnostic'))
 const unavailableHtml=await(await fetch(origin+'/profile',{headers:a})).text();assert.ok(unavailableHtml.includes('Profile temporarily unavailable'));assert.ok(!unavailableHtml.includes('On the beat'))
 unavailable=false
 assert.equal((await fetch(origin+'/api/account/profile',{method:'DELETE',headers:a})).status,405)
 assert.equal((await fetch(origin+'/api/account/profile/photo',{method:'POST',headers:a})).status,405)
 console.log(JSON.stringify({syntheticStorageOnly:true,googleDefaults:true,readWithoutWrite:true,savedNamesPersist:true,twoAccountIsolation:true,sessionSwitchRejected:true,originAndSelectorsRejected:true,photoReencodedAndMetadataRemoved:true,photoRemovalAndGoogleRestore:true,privatePageAndPhoto:true,unavailableWithoutPrivateDiagnostic:true,unrelatedServicesRead:0},null,2))
}finally{
 if(server.exitCode===null){server.kill('SIGTERM');await once(server,'exit').catch(()=>{})}await new Promise(resolve=>db.close(resolve))
}

import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { handleAccountProfile, type TrainerIdentity } from '../src/lib/trainer/api'
const who: TrainerIdentity={account:'google:profile-fixture',email:'profile@example.invalid',name:'Ada Dancer',firstName:'Ada',lastName:'Dancer',photo:'https://lh3.googleusercontent.com/example',owner:false}
const origin='https://dancewithceech.com'
function request(data?:unknown,headers:Record<string,string>={},query='') {
 return new Request(origin+'/api/account/profile'+query,data===undefined?{headers}:{method:'POST',headers:{origin,'content-type':'application/json','x-profile-owner':who.account,...headers},body:JSON.stringify(data)})
}
test('account profile uses Google defaults, persists editable names/photo only, and has no rewards dependency',async()=>{
 const envKeys=['TRAINER_SUPABASE_URL','TRAINER_SUPABASE_SECRET_KEY','VERCEL_ENV']
 const env=Object.fromEntries(envKeys.map(k=>[k,process.env[k]])),originalFetch=global.fetch
 const calls:{url:URL;method:string;body:Record<string,unknown>|null}[]=[]
 let row:Record<string,unknown>|null=null
 try {
  process.env.TRAINER_SUPABASE_URL='https://fixture.supabase.co';process.env.TRAINER_SUPABASE_SECRET_KEY='fixture';process.env.VERCEL_ENV='production'
  global.fetch=async(input,init)=>{
   const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url),method=init?.method??'GET'
   const body=init?.body?JSON.parse(String(init.body)):null;calls.push({url,method,body})
   assert.match(url.pathname,/\/trainer_(preview_)?profiles$/,'Profiles must not depend on rewards or other services')
   if(method==='POST'){row=body;return new Response(null,{status:201})}
   assert.equal(url.searchParams.get('account'),'eq.'+who.account)
   return Response.json(row)
  }
  assert.equal((await handleAccountProfile(request(),null)).status,401);assert.equal(calls.length,0)
  const defaults=await(await handleAccountProfile(request(),who)).json()
  assert.equal(defaults.account,who.account);assert.equal(defaults.first_name,who.firstName);assert.equal(defaults.last_name,who.lastName);assert.equal(defaults.display_name,who.name);assert.equal(defaults.photo_mode,'google');assert.equal(defaults.photo_url,who.photo);assert.equal(defaults.email,who.email);assert.ok(!('rewards' in defaults))
  const names={first_name:'New First',last_name:'New Last',display_name:'Rhythm Friend',photo_mode:'google'}
  assert.equal((await handleAccountProfile(request(names),who)).status,200)
  const saved=await(await handleAccountProfile(request(),who)).json()
  assert.equal(saved.first_name,'New First');assert.equal(saved.display_name,'Rhythm Friend');assert.equal(saved.email,who.email)
  assert.equal(row!.account,who.account);assert.equal(row!.email,undefined)
  const before=calls.length
  assert.equal((await handleAccountProfile(request(names,{origin:'https://foreign.invalid'}),who)).status,403)
  assert.equal((await handleAccountProfile(request(names,{'x-profile-owner':'google:other'}),who)).status,409)
  assert.equal((await handleAccountProfile(request(undefined,{'x-profile-owner':'google:other'}),who)).status,409)
  assert.equal((await handleAccountProfile(request(undefined,{},'?account=google:other'),who)).status,400)
  assert.equal((await handleAccountProfile(request(names,{'content-type':'text/plain'}),who)).status,415)
  assert.equal(calls.length,before,'Rejected identity/origin/selectors must not reach storage')
  const writes=calls.filter(c=>c.method==='POST').length
  assert.equal((await handleAccountProfile(request({...names,email:'forged@example.invalid',owner:true}),who)).status,422)
  assert.equal(calls.filter(c=>c.method==='POST').length,writes)
  const photo=(await sharp({create:{width:12,height:8,channels:3,background:'#a78032'}}).withMetadata().jpeg().toBuffer()).toString('base64')
  const uploaded=await handleAccountProfile(request({...names,photo_mode:'custom',photo_data:'data:image/jpeg;base64,'+photo}),who)
  assert.equal(uploaded.status,200)
  const uploadedView=await uploaded.json();assert.match(uploadedView.photo_url,/^\/api\/account\/profile\/photo\?v=/)
  assert.equal(uploadedView.photo,undefined)
  const image=await handleAccountProfile(new Request(origin+uploadedView.photo_url),who,true)
  assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg')
  const metadata=await sharp(Buffer.from(await image.arrayBuffer())).metadata()
  assert.equal(metadata.width,384);assert.equal(metadata.height,384);assert.equal(metadata.exif,undefined)
  assert.equal((await handleAccountProfile(request({...names,photo_mode:'custom',photo_data:'data:image/jpeg;base64,AAAA'}),who)).status,422)
  assert.equal((await handleAccountProfile(request({...names,photo_mode:'none'}),who)).status,200)
  assert.equal((await(await handleAccountProfile(request(),who)).json()).photo_url,'')
  assert.equal((await handleAccountProfile(new Request(origin+'/api/account/profile/photo'),who,true)).status,404)
  assert.equal((await handleAccountProfile(request(names),who)).status,200)
  process.env.VERCEL_ENV='preview'
  const previewStart=calls.length
  assert.equal((await handleAccountProfile(request(),who)).status,200)
  assert.ok(calls.slice(previewStart).every(c=>c.url.pathname.endsWith('/trainer_preview_profiles')))
 }finally{global.fetch=originalFetch;for(const [k,v]of Object.entries(env)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
})

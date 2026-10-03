import test from 'node:test'
import assert from 'node:assert/strict'
import { handleTrainerApi, type TrainerIdentity } from '../src/lib/trainer/api'
import { SCORING } from '../src/lib/trainer/validation'
import catalog from '../src/content/trainer-lessons.json'
const who: TrainerIdentity = { account:'google:real-subject', email:'verified@example.com', name:'Dancer One', firstName:'Dancer', lastName:'One', photo:'https://lh3.googleusercontent.com/photo', owner:false }
const origin = 'https://dancewithceech.com'
function request(path: string, data?: unknown) { return new Request(origin + '/practice' + path, data === undefined ? {} : { method:'POST', headers:{origin, 'content-type':'application/json'}, body:JSON.stringify(data) }) }

test('HTTP handlers use authenticated identity, protect profiles, compute scores, and return safe configuration errors', async () => {
  const envKeys = ['TRAINER_SUPABASE_URL','TRAINER_SUPABASE_SECRET_KEY','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','TRAINER_SYNC_SIGNING_KEY']
  const savedEnv = Object.fromEntries(envKeys.map(k=>[k,process.env[k]])), originalFetch = global.fetch
  const calls: { url:URL; body:Record<string,unknown> | null }[] = []
  try {
    for (const k of envKeys) delete process.env[k]
    assert.equal((await handleTrainerApi(request('/api/profile'),'/api/profile',null)).status,401)
    assert.equal((await handleTrainerApi(request('/api/challenges'),'/api/challenges',null)).status,401)
    assert.equal((await handleTrainerApi(request('/api/profile'),'/api/profile',who)).status,503)
    process.env.TRAINER_SUPABASE_URL='https://trainer-test.supabase.co'
    process.env.TRAINER_SUPABASE_SECRET_KEY='test-server-key'
    process.env.TRAINER_SYNC_SIGNING_KEY='a'.repeat(64)
    global.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      const body = init?.body ? JSON.parse(String(init.body)) : null
      calls.push({url,body})
      if (url.pathname.endsWith('/trainer_profiles')) return Response.json(null)
      if (url.pathname.endsWith('/rpc/trainer_rewards')) return Response.json({points:0,rewards:[]})
      if (url.pathname.endsWith('/trainer_scores')) return Response.json([])
      if (url.pathname.endsWith('/trainer_challenges')) {
        const l=catalog.lessons.find(x=>x.id==='marching')!
        return Response.json({id:'a'.repeat(32),sender:'google:private-sender',name:'Public name',take:'private-take',lesson:l.id,version:l.version,reference_hash:l.reference_hash,scoring:SCORING,score:80,measured:16,created:Date.now()/1000,expires:Date.now()/1000+3600})
      }
      throw new Error('Unexpected request: '+url.pathname)
    }
    const profile=await (await handleTrainerApi(request('/api/profile'),'/api/profile',who)).json()
    assert.equal(profile.email,who.email); assert.equal(profile.points,0); assert.equal(profile.display_name,who.name)
    assert.ok(calls.find(c=>c.url.pathname.endsWith('/trainer_profiles'))?.url.searchParams.get('account')==='eq.google:real-subject')
    assert.deepEqual(calls.find(c=>c.url.pathname.endsWith('/rpc/trainer_rewards'))?.body,{actor:who.account})
    const count=calls.length
    assert.equal((await handleTrainerApi(request('/api/profile',{display_name:'Other',email:'hacker@example.com',points:999}),'/api/profile',who)).status,422)
    assert.equal(calls.length,count+1,'Only the existing profile is read; no forged update is sent')
    assert.equal((await handleTrainerApi(new Request(origin+'/practice/api/profile',{method:'POST',headers:{origin:'https://evil.example'},body:'{}'}),'/api/profile',who)).status,403)
    const score = await (await handleTrainerApi(request('/api/scores',{take:'local-00000000-0000-0000-0000-000000000001',lesson:'marching',deltas:Array(16).fill(150),score:999,account:'google:victim'}),'/api/scores',who)).json()
    assert.deepEqual(score,{saved:true,score:25})
    const saved=calls.find(c=>c.url.pathname.endsWith('/trainer_scores'))!.body!
    assert.equal(saved.account,who.account); assert.equal(saved.score,25)
    const challenge=await (await handleTrainerApi(request('/api/challenges/'+'a'.repeat(32)),'/api/challenges/'+'a'.repeat(32),null)).json()
    assert.equal(challenge.name,'Public name'); assert.equal(challenge.sender,undefined); assert.equal(challenge.take,undefined); assert.deepEqual(challenge.results,[])
    const sync={action:'save',comparison:'local-00000000-0000-0000-0000-000000000001',offset:0.5}
    assert.equal((await handleTrainerApi(request('/api/manual-sync',sync),'/api/manual-sync',who)).status,403)
    const signature=await (await handleTrainerApi(request('/api/manual-sync',sync),'/api/manual-sync',{...who,owner:true})).json()
    assert.equal(signature.verified,true)
    assert.equal((await (await handleTrainerApi(request('/api/manual-sync',{...sync,action:'verify',signature:signature.signature}),'/api/manual-sync',null)).json()).verified,true)
    assert.equal((await (await handleTrainerApi(request('/api/manual-sync',{...sync,action:'verify',signature:'é'.repeat(64)}),'/api/manual-sync',null)).json()).verified,false)
  } finally {
    global.fetch=originalFetch
    for (const [k,v] of Object.entries(savedEnv)) { if(v===undefined) delete process.env[k]; else process.env[k]=v }
  }
})

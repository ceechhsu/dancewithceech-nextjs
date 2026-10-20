import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveDirectoryConfig } from '../src/lib/owner-dashboard/config'
import { createSignInErasureHandler } from '../src/lib/owner-dashboard/erasure'
import { readDirectory } from '../src/lib/owner-dashboard/directory'
const user = { googleSub: '123', googleEmailVerified: true, email: 'person@example.invalid' }
test('directory uses existing secret-key configuration but rejects incomplete override pairs', () => {
 assert.deepEqual(resolveDirectoryConfig({NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEY:'secret'}), {url:'https://example.invalid',key:'secret'})
 assert.throws(()=>resolveDirectoryConfig({OWNER_DIRECTORY_SUPABASE_URL:'https://other.invalid',SUPABASE_SECRET_KEY:'secret'}))
})
test('erasure rejects guests, unverified sessions, foreign origins and selectors before storage access', async () => {
 let reads=0
 for(const [session, origin, query, status] of [[null,'https://site.invalid','',401],[{user:{...user,googleEmailVerified:false}},'https://site.invalid','',401],[{user},'https://other.invalid','',403],[{user},'https://site.invalid','?user=other',400]] as const) {
  const handler=createSignInErasureHandler({getSession:async()=>session,erase:async()=>{reads++}})
  const res=await handler(new Request('https://site.invalid/api/account/signin-record'+query,{method:'DELETE',headers:{origin}}))
  assert.equal(res.status,status)
 }
 assert.equal(reads,0)
})
test('erasure uses only verified session subject and returns no private data', async () => {
 const ids:string[]=[]
 const handler=createSignInErasureHandler({getSession:async()=>({user}),erase:async id=>{ids.push(id)}})
 const res=await handler(new Request('https://site.invalid/api/account/signin-record',{method:'DELETE',headers:{origin:'https://site.invalid'}}))
 assert.equal(res.status,200);assert.deepEqual(ids,['google:123']);assert.deepEqual(await res.json(),{deleted:true})
 assert.match(res.headers.get('cache-control')!,/private, no-store/)
})
test('directory pagination includes sign-in-only users beyond the server row cap', async () => {
 const rows=Array.from({length:2101},(_,i)=>({user_id:'google:'+i,email:'person'+i+'@example.invalid',first_sign_in_at:'2026-10-20T00:00:00Z',last_sign_in_at:'2026-10-20T00:00:00Z'}))
 const result=await readDirectory(async offset=>({rows:rows.slice(offset,offset+750),count:rows.length}))
 assert.equal(result.length,2101);assert.equal(result.at(-1)?.user_id,'google:2100')
})

test('empty streamed DELETE bodies are accepted while any body content is rejected',async()=>{
 let erased=0
 const handler=createSignInErasureHandler({getSession:async()=>({user}),erase:async()=>{erased++}})
 for(const [body,status] of [['',200],['{}',400]] as const) {
  const response=await handler(new Request('https://site.invalid/api/account/signin-record',{method:'DELETE',headers:{origin:'https://site.invalid'},body}))
  assert.equal(response.status,status)
 }
 assert.equal(erased,1)
})

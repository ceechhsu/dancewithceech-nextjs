// Local HTTP auth QA. This fixed test signing value is never used on the live site.
import assert from 'node:assert/strict'
import { encode } from 'next-auth/jwt'
const base=process.env.OWNER_QA_ORIGIN || 'http://127.0.0.1:3150'
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base),'Only run against loopback')
const secret='owner-dashboard-local-test-only'
async function cookie(user) {
  const token=await encode({secret,salt:'authjs.session-token',token:{...user,name:'Local QA'},maxAge:600})
  return `authjs.session-token=${token}`
}
const owner={email:'dancewithceech@gmail.com',googleSub:'local-owner-fixture',googleEmailVerified:true}
const cases=[['guest',null,401],['ordinary',{...owner,email:'ordinary@example.invalid'},403],['unverified',{...owner,googleEmailVerified:false},403],['owner',owner,200]]
const results=[]
for(const [name,user,expected] of cases) {
  const response=await fetch(`${base}/api/admin/overview`,{headers:user?{cookie:await cookie(user)}:{}})
  const body=await response.json()
  assert.equal(response.status,expected,name)
  assert.match(response.headers.get('cache-control'),/no-store/)
  if(expected!==200) assert.deepEqual(Object.keys(body),['error'])
  else {assert.equal(body.demo,false);assert.equal(body.accounts.length,0);assert.equal(body.coverage.length,3);assert.ok(body.coverage.every(x=>x.state==='unavailable'))}
  const html=await (await fetch(`${base}/admin`,{headers:user?{cookie:await cookie(user)}:{}})).text()
  assert.ok(!html.includes('alex@example.invalid'))
  if(expected!==200) { assert.ok(!html.includes('Observed accounts')); assert.ok(!html.includes('google:local-owner-fixture')) }
  results.push({case:name,status:response.status,noStore:true,noIdentityLeak:expected!==200?true:'owner fixture, no connected data'})
}
const spoof=await fetch(`${base}/api/admin/overview?email=dancewithceech%40gmail.com&isAdmin=true`,{headers:{'x-user-email':'dancewithceech@gmail.com','x-owner':'true'}})
assert.equal(spoof.status,401)
const forged=await fetch(`${base}/api/admin/overview`,{headers:{cookie:'authjs.session-token=forged'}})
assert.equal(forged.status,401)
const head=await fetch(`${base}/admin`,{method:'HEAD'})
assert.equal(head.headers.get('referrer-policy'),'no-referrer')
assert.match(head.headers.get('content-security-policy'),/connect-src 'self'/)
assert.match(head.headers.get('x-robots-tag'),/noindex/)
const post=await fetch(`${base}/api/admin/overview`,{method:'POST'})
assert.equal(post.status,405)
console.log(JSON.stringify({origin:base,results,spoofedHeaders:spoof.status,forgedCookie:forged.status,unsupportedMutation:post.status,privateHeaders:true},null,2))

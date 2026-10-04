import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {handleTrainerApi, type TrainerIdentity} from '../src/lib/trainer/api'
const origin='https://trainer-preview.example'
const owner:TrainerIdentity={account:'google:owner-sub',email:'dancewithceech@gmail.com',name:'Ceech',firstName:'Ceech',lastName:'Hsu',photo:'',owner:true}
const request=(data:unknown={length:100,sha256:'a'.repeat(64)},from=origin)=>new Request(origin+'/practice/api/debug-transfer',{method:'POST',headers:{origin:from,'content-type':'application/json'},body:JSON.stringify(data)})
test('debug transfer grants only the verified owner a bounded, file-bound Mac upload',async()=>{
 const before=process.env.TRAINER_DEBUG_TRANSFER_KEY
 process.env.TRAINER_DEBUG_TRANSFER_KEY='b'.repeat(64)
 try{
  for(const who of [null,{...owner,owner:false}])assert.equal((await handleTrainerApi(request(),'/api/debug-transfer',who)).status,403)
  assert.equal((await handleTrainerApi(request(undefined,'https://evil.example'),'/api/debug-transfer',owner)).status,403)
  for(const data of [{length:0,sha256:'a'.repeat(64)},{length:90*1024*1024+65541,sha256:'a'.repeat(64)},{length:100,sha256:'no'},{length:100,sha256:'a'.repeat(64),email:'other@example.com'}])assert.equal((await handleTrainerApi(request(data),'/api/debug-transfer',owner)).status,422)
  const response=await handleTrainerApi(request(),'/api/debug-transfer',owner);assert.equal(response.status,200)
  const grant=await response.json();assert.equal(grant.url,'https://test.dancewithceech.com/api/owner-debug-transfer')
  const [encoded,signature]=grant.token.split('.');assert.equal(signature,createHmac('sha256',Buffer.from('b'.repeat(64),'hex')).update(encoded).digest('base64url'))
  const claims=JSON.parse(Buffer.from(encoded,'base64url').toString());assert.equal(claims.email,owner.email);assert.equal(claims.sub,owner.account);assert.equal(claims.origin,origin);assert.equal(claims.aud,grant.url);assert.equal(claims.length,100);assert.equal(claims.sha256,'a'.repeat(64));assert.equal(claims.exp-claims.iat,300);assert.match(claims.id,/^[a-f0-9]{32}$/)
  delete process.env.TRAINER_DEBUG_TRANSFER_KEY
  assert.equal((await handleTrainerApi(request(),'/api/debug-transfer',owner)).status,503)
 }finally{if(before===undefined)delete process.env.TRAINER_DEBUG_TRANSFER_KEY;else process.env.TRAINER_DEBUG_TRANSFER_KEY=before}
})

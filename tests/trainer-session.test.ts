import test from 'node:test'
import assert from 'node:assert/strict'
import { trainerIdentity, trainerReturnPath } from '../src/lib/trainer/session'
test('trainer identity requires verified Google identity and grants owner only by configured email', () => {
 const user={googleSub:'123',googleEmailVerified:true,email:'owner@example.com',name:'Owner',image:'https://lh3.googleusercontent.com/a'}
 assert.equal(trainerIdentity({user},'owner@example.com')?.owner,true)
 assert.equal(trainerIdentity({user},'')?.owner,false)
 assert.equal(trainerIdentity({user:{...user,googleEmailVerified:false}},'owner@example.com'),null)
 assert.equal(trainerIdentity({user:{email:user.email}},'owner@example.com'),null)
 assert.equal(trainerIdentity({user:{...user,email:'other@example.com'}},'owner@example.com')?.owner,false)
})
test('sign-in return preserves a challenge but cannot escape practice or loop authentication', () => {
 assert.equal(trainerReturnPath('/practice/challenge.html?id=abc'),'/practice/challenge.html?id=abc')
 assert.equal(trainerReturnPath('/practice/#lesson=2step'),'/practice/#lesson=2step')
 for(const value of ['https://evil.test','//evil.test','/practice/../admin','/practice/%2e%2e/admin','/practice/auth/google','/practice/api/profile','/practice/\\evil','/profile']) assert.equal(trainerReturnPath(value),'/practice/')
})

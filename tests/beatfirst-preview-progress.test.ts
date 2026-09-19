import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAttempts, summarizeAttempts, scoreAttempt, identityFromSession } from '../src/components/beatfirst-preview/progress'
const sample = { id: '11111111-1111-4111-8111-111111111111', levelId: 1, completedAt: new Date().toISOString(), taps: [] }
test('validates bounded ordered taps and trusted level catalog', () => {
  assert.equal(validateAttempts([sample]).length, 1)
  for (const patch of [{ id:'bad' }, {levelId:7}, {taps:[{atMs:NaN,lane:0}]}, {taps:[{atMs:1,lane:1}]}, {taps:[{atMs:20,lane:0},{atMs:10,lane:0}]}, {taps:Array(251).fill({atMs:0,lane:0})}, {completedAt:'bad'}]) assert.throws(() => validateAttempts([{...sample,...patch}]))
  assert.throws(() => validateAttempts(Array(26).fill(sample)))
})
test('score is replayed, client score and owner are discarded', () => {
  const [parsed] = validateAttempts([{...sample,score:100,userId:'other'}])
  assert.equal(scoreAttempt(parsed).score,0)
  assert.equal('userId' in parsed,false)
  assert.equal('score' in parsed,false)
})
test('summary retains bests and only unlocks earned levels', () => {
  const result = summarizeAttempts([1,2,3].map(levelId=>({...sample,levelId,score:80,hits:12,total:15,bestStreak:12})))
  assert.deepEqual(result.unlockedLevelIds,[1,2,3,4])
  assert.equal(result.attemptCount,3)
})
test('Google verified subject is required; email is not an ownership key', () => {
  assert.equal(identityFromSession({user:{email:'test@example.test'}}),null)
  assert.equal(identityFromSession({user:{googleSub:'123',googleEmailVerified:false}}),null)
  assert.equal(identityFromSession({user:{googleSub:'123',googleEmailVerified:true}}),'google:123')
})

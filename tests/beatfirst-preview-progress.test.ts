import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAttempts, summarizeAttempts, scoreAttempt, identityFromSession } from '../src/components/beatfirst-preview/progress'
import { LEVELS } from '../src/components/beatfirst-preview/levels'
const sample = { id: '11111111-1111-4111-8111-111111111111', levelId: 1, completedAt: new Date().toISOString(), taps: [] }
test('validates bounded ordered taps and trusted level catalog', () => {
  assert.equal(validateAttempts([sample]).length, 1)
  for (const patch of [{ id:'bad' }, {levelId:19}, {taps:[{atMs:NaN,lane:0}]}, {taps:[{atMs:1,lane:1}]}, {taps:[{atMs:20,lane:0},{atMs:10,lane:0}]}, {taps:Array(251).fill({atMs:0,lane:0})}, {completedAt:'bad'}]) assert.throws(() => validateAttempts([{...sample,...patch}]))
  assert.throws(() => validateAttempts(Array(26).fill(sample)))
})
test('score is replayed, client score and owner are discarded', () => {
  const [parsed] = validateAttempts([{...sample,score:100,userId:'other'}])
  assert.equal(scoreAttempt(parsed).score,0)
  assert.equal('userId' in parsed,false)
  assert.equal('score' in parsed,false)
})
test('tap validation accepts all eighteen levels and enforces their exact duration and lane bounds', () => {
  assert.equal(LEVELS.length, 18)
  for (const level of LEVELS) {
    const round = { ...sample, levelId: level.id, taps: level.notes }
    assert.equal(validateAttempts([round])[0].levelId, level.id)
    assert.equal(scoreAttempt(validateAttempts([round])[0]).score, 100)
    assert.equal(validateAttempts([{ ...round, taps: [{ atMs: level.durationMs - 1, lane: level.lanes - 1 }] }]).length, 1)
    assert.throws(() => validateAttempts([{ ...round, taps: [{ atMs: level.durationMs, lane: 0 }] }]))
    assert.throws(() => validateAttempts([{ ...round, taps: [{ atMs: 0, lane: level.lanes }] }]))
  }
  assert.throws(() => validateAttempts([{ ...sample, levelId: 6, taps: [{ atMs: 0, lane: 1 }] }]))
  assert.equal(validateAttempts([{ ...sample, levelId: 9, taps: [{ atMs: 0, lane: 1 }] }]).length, 1)
  assert.equal(validateAttempts([{ ...sample, levelId: 18, taps: [{ atMs: 29_999, lane: 1 }] }]).length, 1)
  assert.throws(() => validateAttempts([{ ...sample, levelId: 19 }]))
})
test('summary starts with levels 1 through 6 and retains earned unlocks after lower attempts', () => {
  assert.deepEqual(summarizeAttempts([]).unlockedLevelIds, [1, 2, 3, 4, 5, 6])
  const result = summarizeAttempts([
    ...Array.from({ length: 12 }, (_, i) => i + 6).map(levelId => ({ ...sample, levelId, score: 80, hits: 12, total: 15, bestStreak: 12 })),
    ...Array.from({ length: 12 }, (_, i) => i + 6).map(levelId => ({ ...sample, levelId, score: 0, hits: 0, total: 15, bestStreak: 0 })),
  ])
  assert.deepEqual(result.bestScores, Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 6, 80])))
  assert.deepEqual(result.unlockedLevelIds, Array.from({ length: 18 }, (_, i) => i + 1))
  assert.equal(result.attemptCount, 24)
})
test('Google verified subject is required; email is not an ownership key', () => {
  assert.equal(identityFromSession({user:{email:'test@example.test'}}),null)
  assert.equal(identityFromSession({user:{googleSub:'123',googleEmailVerified:false}}),null)
  assert.equal(identityFromSession({user:{googleSub:'123',googleEmailVerified:true}}),'google:123')
})

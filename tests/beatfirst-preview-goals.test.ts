import assert from 'node:assert/strict'
import test from 'node:test'
import { dailyPractice, masteryStars, nextMasteryLevel, nextStarTarget } from '../src/components/beatfirst-preview/practice-goals'
import type { AttemptResult } from '../src/components/beatfirst-preview/progress'

const result = (id: string, completed: Date): AttemptResult => ({ id, completedAt: completed.toISOString(), levelId: 9, score: 0, hits: 0, total: 23, bestStreak: 0 })

test('personal best stars and next targets honor 80, 90, and 95 exactly', () => {
  const scores = [undefined, 0, 79, 80, 89, 90, 94, 95, 100]
  assert.deepEqual(scores.map(masteryStars), [0, 0, 0, 1, 1, 2, 2, 3, 3])
  assert.deepEqual(scores.map(nextStarTarget), [80, 80, 80, 90, 90, 95, 95, null, null])
})

test('daily practice counts completed local-calendar rounds, including low scores, once per ID', () => {
  const today = new Date(2026, 8, 19, 12)
  const first = result('one', new Date(2026, 8, 19, 0, 1))
  const rounds = [first, first, result('two', new Date(2026, 8, 19, 10)), result('old', new Date(2026, 8, 18, 23, 59)), result('future', new Date(2026, 8, 19, 13))]
  assert.deepEqual(dailyPractice(rounds, today), { completed: 2, target: 3, done: false })
  assert.deepEqual(dailyPractice([...rounds, result('three', today), result('four', today)], today), { completed: 3, target: 3, done: true })
})

test('daily goal changes at local midnight without modifying saved attempts', () => {
  const rows = [result('one', new Date(2026, 8, 19, 23, 58)), result('two', new Date(2026, 8, 19, 23, 59))]
  assert.equal(dailyPractice(rows, new Date(2026, 8, 19, 23, 59, 30)).completed, 2)
  assert.equal(dailyPractice(rows, new Date(2026, 8, 20, 0, 0)).completed, 0)
  assert.equal(rows.length, 2)
})

test('replay suggestion chooses a played, unlocked level nearest its next star', () => {
  assert.equal(nextMasteryLevel({ 1: 100, 2: 81, 3: 94, 4: 79, 8: 94 }, [1, 2, 3, 4, 5, 6]), 4)
  assert.equal(nextMasteryLevel({ 1: 95, 2: 100 }, [1, 2, 3]), 3)
  assert.equal(nextMasteryLevel({}, [1, 2, 3, 4, 5, 6]), 6)
  assert.equal(nextMasteryLevel({ 1: 95, 2: 100 }, [1, 2]), 2)
  assert.equal(nextMasteryLevel(Object.fromEntries(Array.from({ length: 13 }, (_, i) => [i + 6, 95])), Array.from({ length: 18 }, (_, i) => i + 1)), 5)
})

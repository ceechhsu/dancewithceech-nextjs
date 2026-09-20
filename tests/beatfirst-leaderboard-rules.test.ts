import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeDisplayName, parseLeaderboardLevel } from '../src/components/beatfirst-preview/leaderboard-model'

test('public names normalize ordinary spaces and preserve allowed ASCII punctuation', async () => {
  assert.equal(normalizeDisplayName('  Ceech   Hsu_2.-  '), 'Ceech Hsu_2.-')
  for (const name of ['abc', 'A'.repeat(20), '123']) assert.equal(normalizeDisplayName(name), name)
})

test('public names reject email, HTML, controls, unsupported characters and invalid length', async () => {
  for (const name of [null, 42, {}, '', 'ab', 'A'.repeat(21), 'a@b.com', '<script>', 'hello\nthere', 'hi\tthere', 'hello\u0000', '你好呀', '  \nAbc', 'Abc\u00a0Def', 'Abc\n']) {
    assert.throws(() => normalizeDisplayName(name), /name|letters|characters/i)
  }
})

test('leaderboards accept only explicit canonical integer levels 1 through 18', async () => {
  for (let id = 1; id <= 18; id++) assert.equal(parseLeaderboardLevel(String(id)), id)
  for (const value of [null, '', '0', '19', '-1', '1.5', '1e0', '01', ' 1', '1 ', 'Infinity', 'NaN', '1\n']) assert.throws(() => parseLeaderboardLevel(value), /level/i)
})

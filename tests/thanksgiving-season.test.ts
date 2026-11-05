import test from 'node:test';
import assert from 'node:assert/strict';
import { isThanksgivingActive, nextThanksgivingCheck } from '../src/lib/thanksgiving-season';

test('November decorations include Thanksgiving and the end of November in Pacific time', () => {
  for (const date of ['2026-11-04T12:00:00-08:00', '2026-11-26T23:59:59-08:00', '2026-11-30T23:59:59.999-08:00']) {
    assert.equal(isThanksgivingActive(Date.parse(date)), true);
  }
});

test('December 1 midnight Pacific ends the season without an annual repeat', () => {
  assert.equal(isThanksgivingActive(Date.parse('2026-11-01T06:59:59.999Z')), false);
  assert.equal(isThanksgivingActive(Date.parse('2026-11-01T07:00:00Z')), true);
  assert.equal(isThanksgivingActive(Date.parse('2026-12-01T08:00:00Z')), false);
  assert.equal(isThanksgivingActive(Date.parse('2027-11-04T12:00:00-08:00')), false);
});

test('open tabs recheck at the deadline and timers remain within browser limits', () => {
  assert.equal(nextThanksgivingCheck(Date.parse('2026-12-01T07:59:59Z')), 1000);
  assert.equal(nextThanksgivingCheck(Date.parse('2026-12-01T08:00:00Z')), null);
  assert.equal(nextThanksgivingCheck(Date.parse('2026-11-04T12:00:00-08:00')), 86_400_000);
});

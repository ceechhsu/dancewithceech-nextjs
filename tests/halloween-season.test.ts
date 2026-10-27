import assert from 'node:assert/strict';
import test from 'node:test';
import { isHalloweenActive, nextHalloweenCheck } from '../src/lib/halloween-season';

test('starts at midnight October 26 in Los Angeles, regardless of visitor timezone', () => {
  assert.equal(isHalloweenActive(Date.parse('2026-10-26T06:59:59.999Z')), false);
  assert.equal(isHalloweenActive(Date.parse('2026-10-26T07:00:00.000Z')), true);
});

test('ends at midnight November 1 Pacific, before the DST change, with no annual recurrence', () => {
  assert.equal(isHalloweenActive(Date.parse('2026-11-01T06:59:59.999Z')), true);
  assert.equal(isHalloweenActive(Date.parse('2026-11-01T07:00:00.000Z')), false);
  assert.equal(isHalloweenActive(Date.parse('2027-10-28T12:00:00.000Z')), false);
});

test('an open tab schedules both boundaries exactly and rechecks long waits safely', () => {
  assert.equal(nextHalloweenCheck(Date.parse('2026-10-26T06:59:59.500Z')), 500);
  assert.equal(nextHalloweenCheck(Date.parse('2026-11-01T06:59:59.500Z')), 500);
  assert.equal(nextHalloweenCheck(Date.parse('2026-11-02T07:00:00.000Z')), null);
  assert.ok(nextHalloweenCheck(Date.parse('2026-01-01T00:00:00Z'))! <= 86_400_000);
});

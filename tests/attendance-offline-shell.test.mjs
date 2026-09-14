import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
test('offline worker exists and caches only generic shell', () => {
  assert.ok(existsSync('public/attendance/sw.js'), 'worker missing')
  const code = readFileSync('public/attendance/sw.js', 'utf8')
  assert.match(code, /cache\.addAll\(\[SHELL\]\)/)
  assert.doesNotMatch(code, /cache\.put/)
  assert.match(code, /request\.mode !== 'navigate'/)
})
test('offline shell is generic and offers guarded manual recording', () => {
  assert.ok(existsSync('public/attendance/offline.html'), 'shell missing')
  const code = readFileSync('public/attendance/offline.html', 'utf8')
  assert.match(code, /expectedRevision/)
  assert.match(code, /randomUUID/)
  assert.match(code, /textContent/)
  assert.doesNotMatch(code, /innerHTML/)
})
test('offline status syncs on initial online mount with stable callback', () => {
  const code = readFileSync('src/components/attendance/OfflineStatus.tsx', 'utf8')
  assert.match(code, /if \(navigator\.onLine\) reconnect\(\)/)
  assert.match(code, /onSyncedRef\.current\?\.\(\)/)
  assert.doesNotMatch(code, /\[owner, onSynced\]/)
})

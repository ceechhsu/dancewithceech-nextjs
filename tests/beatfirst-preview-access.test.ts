import assert from 'node:assert/strict'
import test from 'node:test'
import { protectBeatFirstPreview } from '../src/lib/beatfirst-preview-access'

const password = 'test-only-preview-passcode'
const header = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`
const request = (authorization?: string, path = '/beat-first/preview') => new Request(`https://example.test${path}`, { headers: authorization ? { authorization } : {} })

test('unrelated pages and local development are unaffected', () => {
  assert.equal(protectBeatFirstPreview(request(undefined, '/beat-first'), 'preview', password), null)
  assert.equal(protectBeatFirstPreview(request(), undefined, undefined), null)
})

test('deployed preview fails closed when its password is missing', () => {
  assert.equal(protectBeatFirstPreview(request(), 'preview', undefined)?.status, 503)
})

test('production does not expose the private preview', () => {
  assert.equal(protectBeatFirstPreview(request(header(`ceech:${password}`)), 'production', password)?.status, 404)
})

test('missing or incorrect credentials require authentication and cannot be cached', () => {
  for (const authorization of [undefined, header('ceech:wrong'), header(`other:${password}`), 'Basic invalid!', 'Bearer invalid']) {
    const response = protectBeatFirstPreview(request(authorization), 'preview', password)
    assert.equal(response?.status, 401)
    assert.match(response.headers.get('www-authenticate')!, /^Basic /)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
  }
})

test('correct credentials allow the page and its nested paths', () => {
  for (const path of ['/beat-first/preview', '/beat-first/preview/', '/beat-first/preview?internal=1']) {
    assert.equal(protectBeatFirstPreview(request(header(`ceech:${password}`), path), 'preview', password), null)
  }
})

test('the private preview root opens the game directly', () => {
  const response = protectBeatFirstPreview(request(undefined, '/'), 'preview', password)
  assert.equal(response?.status, 307)
  assert.equal(response.headers.get('location'), 'https://example.test/beat-first/preview')
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
})

test('normal homepage behavior is preserved outside the configured private preview', () => {
  assert.equal(protectBeatFirstPreview(request(undefined, '/'), 'production', password), null)
  assert.equal(protectBeatFirstPreview(request(undefined, '/'), undefined, password), null)
  assert.equal(protectBeatFirstPreview(request(undefined, '/'), 'preview', undefined), null)
})

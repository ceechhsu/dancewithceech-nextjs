import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pkce } from '../node_modules/@auth/core/lib/actions/callback/oauth/checks.js'
import { encode } from '../node_modules/@auth/core/jwt.js'
import { createHash } from 'node:crypto'

const name = '__Secure-authjs.pkce.code_verifier'
const options = {
  provider: { checks: ['pkce'] },
  cookies: { pkceCodeVerifier: { name, options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' } } },
  jwt: { secret: 'isolated-test-secret-never-used-on-the-website' },
  logger: { debug() {} },
}
for (const scenario of ['missing', 'expired', 'wrong-secret']) {
  test(`real Auth.js reproduces Monday's error for ${scenario} cookie`, async () => {
    const value = scenario === 'missing' ? undefined : await encode({
      secret: scenario === 'wrong-secret' ? 'different-isolated-test-secret' : options.jwt.secret,
      salt: name, token: { value: 'test-verifier' }, maxAge: scenario === 'expired' ? -3600 : 900,
    })
    await assert.rejects(() => pkce.use({ [name]: value }, [], options), error => {
      assert.match(error.message, /pkceCodeVerifier value could not be parsed/)
      return true
    })
  })
}
test('fresh cookie can be read after an interrupted attempt', async () => {
  const created = await pkce.create(options)
  const verifier = await pkce.use({ [name]: created.cookie.value }, [], options)
  assert.equal(createHash('sha256').update(verifier).digest('base64url'), created.value)
})

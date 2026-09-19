import {
  identityFromSession, scoreAttempt, summarizeAttempts, validateAttempts,
  type Attempt, type AttemptResult,
} from '../components/beatfirst-preview/progress'

export interface ProgressStore {
  list(userId: string): Promise<AttemptResult[]>
  insert(userId: string, results: AttemptResult[]): Promise<void>
}

const MAX_BODY_BYTES = 128 * 1024

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'private, no-store' } })
}

async function readAttempts(request: Request): Promise<Attempt[]> {
  const length = request.headers.get('content-length')
  if (length !== null && Number(length) > MAX_BODY_BYTES) throw new Error('Request too large.')
  if (!request.body) throw new Error('A JSON body is required.')

  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0
  let text = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_BODY_BYTES) throw new Error('Request too large.')
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {
    reader.releaseLock()
  }

  const body: unknown = JSON.parse(text)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid JSON body.')
  return validateAttempts((body as Record<string, unknown>).attempts)
}

export function createProgressHandlers(dependencies: {
  getSession: () => Promise<unknown>
  getStore: () => ProgressStore
  isEnabled?: () => boolean
}) {
  return {
    async GET(request: Request) {
      if (dependencies.isEnabled?.() === false) return json({ error: 'Not found.' }, 404)
      try {
        const userId = identityFromSession(await dependencies.getSession())
        if (!userId) return json({ error: 'Sign in with a verified Google account to save your progress.' }, 401)
        const expectedOwner = request.headers.get('x-beatfirst-owner')
        if (expectedOwner !== null && expectedOwner !== userId) return json({ error: 'Your account changed. Please retry saving.' }, 409)
        const results = await dependencies.getStore().list(userId)
        return json(summarizeAttempts(results))
      } catch {
        return json({ error: 'Saved progress is temporarily unavailable. Please try again.' }, 503)
      }
    },
    async POST(request: Request) {
      if (dependencies.isEnabled?.() === false) return json({ error: 'Not found.' }, 404)
      try {
        const userId = identityFromSession(await dependencies.getSession())
        if (!userId) return json({ error: 'Sign in with a verified Google account to save your progress.' }, 401)
        if (request.headers.get('x-beatfirst-owner') !== userId) return json({ error: 'Your account changed. Please retry saving.' }, 409)
        if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'This request must come from the same site.' }, 403)
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'Send completed rounds as JSON.' }, 400)

        let attempts: Attempt[]
        try {
          attempts = await readAttempts(request)
        } catch {
          return json({ error: 'Send 1–25 valid completed rounds in a JSON body under 128 KiB.' }, 400)
        }

        const store = dependencies.getStore()
        const existing = await store.list(userId)
        const existingIds = new Set(existing.map(result => result.id))
        const staged: AttemptResult[] = []
        let summary = summarizeAttempts(existing)
        for (const attempt of attempts) {
          // A retry acknowledges the original result, even if the submitted taps changed.
          if (existingIds.has(attempt.id)) continue
          if (!summary.unlockedLevelIds.includes(attempt.levelId)) return json({ error: 'Complete the earlier levels before saving this round.' }, 403)
          staged.push(scoreAttempt(attempt))
          summary = summarizeAttempts([...existing, ...staged])
        }

        // Ordinary locked batches write nothing. After preflight, reread each saved result:
        // a competing duplicate may already have saved different taps under the same ID.
        // A failure here may leave earlier rounds saved; retries safely acknowledge their IDs.
        let persisted = existing
        summary = summarizeAttempts(persisted)
        for (const result of staged) {
          if (persisted.some(row => row.id === result.id)) continue
          if (!summary.unlockedLevelIds.includes(result.levelId)) return json({ error: 'Your saved progress changed. Please refresh and try again.' }, 409)
          await store.insert(userId, [result])
          persisted = await store.list(userId)
          summary = summarizeAttempts(persisted)
        }
        return json({ ...summary, acceptedIds: attempts.map(attempt => attempt.id) })
      } catch {
        return json({ error: 'Your rounds could not be saved right now. Please try again.' }, 503)
      }
    },
  }
}

import { identityFromSession } from '../components/beatfirst-preview/progress'
import {
  normalizeDisplayName, parseLeaderboardLevel,
  type LeaderboardProfile, type LeaderboardData,
} from '../components/beatfirst-preview/leaderboard-model'

export type LeaderboardRow = { userId: string; displayName: string; score: number; rank: number }
export interface LeaderboardStore {
  top(levelId: number): Promise<LeaderboardRow[]>
  profile(userId: string): Promise<LeaderboardProfile | null>
  saveProfile(userId: string, profile: LeaderboardProfile): Promise<LeaderboardProfile>
}

export class LeaderboardNameConflict extends Error {
  constructor() { super('That public name is already taken. Choose another name.') }
}

const MAX_BODY_BYTES = 4096
const unavailable = 'The leaderboard is temporarily unavailable. Please try again.'
const accountChanged = 'Your account changed. Please try again.'

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'private, no-store' } })
}

async function readBody(request: Request): Promise<unknown> {
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
  return JSON.parse(text)
}

function publicProfile(profile: LeaderboardProfile): LeaderboardProfile {
  return { displayName: profile.displayName, listed: profile.listed }
}

export function createLeaderboardHandlers(dependencies: {
  getSession: () => Promise<unknown>
  getStore: () => LeaderboardStore
}) {
  return {
    async GET(request: Request) {
      let levelId: number
      try { levelId = parseLeaderboardLevel(new URL(request.url).searchParams.get('level')) }
      catch { return json({ error: 'Choose a level from 1 to 18.' }, 400) }
      try {
        const userId = identityFromSession(await dependencies.getSession())
        const expectedOwner = request.headers.get('x-beatfirst-owner')
        if (expectedOwner !== null && expectedOwner !== userId) return json({ error: accountChanged }, 409)
        const store = dependencies.getStore()
        const [rows, profile] = await Promise.all([store.top(levelId), userId ? store.profile(userId) : null])
        const data: LeaderboardData = {
          levelId,
          entries: rows.map(row => ({ rank: row.rank, displayName: row.displayName, score: row.score, isYou: userId !== null && row.userId === userId })),
          profile: profile ? publicProfile(profile) : null,
        }
        return json(data)
      } catch {
        return json({ error: unavailable }, 503)
      }
    },
    async POST(request: Request) {
      try {
        const userId = identityFromSession(await dependencies.getSession())
        if (!userId) return json({ error: 'Sign in with a verified Google account to join the leaderboard.' }, 401)
        if (request.headers.get('x-beatfirst-owner') !== userId) return json({ error: accountChanged }, 409)
        if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'This request must come from the same site.' }, 403)
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'Send your public profile as JSON.' }, 400)
        let body: unknown
        try { body = await readBody(request) }
        catch { return json({ error: 'Send a valid JSON profile in a body of 4096 bytes or less.' }, 400) }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Send a public name and listing preference.' }, 400)
        const fields = body as Record<string, unknown>
        if (Object.keys(fields).some(key => key !== 'displayName' && key !== 'listed') || typeof fields.listed !== 'boolean') {
          return json({ error: 'Send only a public name and a true or false listing preference.' }, 400)
        }
        let displayName: string
        try { displayName = normalizeDisplayName(fields.displayName) }
        catch (error) { return json({ error: (error as Error).message }, 400) }
        const saved = await dependencies.getStore().saveProfile(userId, { displayName, listed: fields.listed })
        return json({ profile: publicProfile(saved) })
      } catch (error) {
        if (error instanceof LeaderboardNameConflict) return json({ error: error.message }, 409)
        return json({ error: unavailable }, 503)
      }
    },
  }
}

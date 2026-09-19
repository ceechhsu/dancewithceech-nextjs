import { scoreAttempt, validateAttempts, type Attempt } from './progress'
export const STORAGE_KEY = 'beatfirst-preview-progress-v1'
export type LocalProgress = { version: 1; guest: Attempt[]; pending: Record<string, Attempt[]>; claim: boolean }
export const emptyLocal = (): LocalProgress => ({ version: 1, guest: [], pending: {}, claim: false })

function compactGuest(attempts: Attempt[]) {
  const best = new Map<number, Attempt>()
  for (const attempt of attempts) {
    const previous = best.get(attempt.levelId)
    if (!previous || scoreAttempt(attempt).score >= scoreAttempt(previous).score) best.set(attempt.levelId, attempt)
  }
  const retained = new Set([...attempts.slice(-20), ...best.values()].map(attempt => attempt.id))
  return attempts.filter(attempt => retained.has(attempt.id))
}
export function addAttempt(state: LocalProgress, attempt: Attempt, owner: string | null): LocalProgress {
  if (!owner) return { ...state, guest: compactGuest([...state.guest.filter(item => item.id !== attempt.id), attempt]) }
  const pending = state.pending[owner] ?? []
  if (pending.length >= 200) throw new Error('Your save queue is full. Reconnect and retry saving before playing more rounds.')
  return { ...state, pending: { ...state.pending, [owner]: [...pending.filter(item => item.id !== attempt.id), attempt] } }
}
export function claimGuest(state: LocalProgress, owner: string): LocalProgress {
  let next = { ...state, guest: [], claim: false }
  for (const attempt of state.guest) next = addAttempt(next, attempt, owner) as typeof next
  return next
}
export function acknowledge(state: LocalProgress, owner: string, ids: string[]): LocalProgress {
  return { ...state, pending: { ...state.pending, [owner]: (state.pending[owner] ?? []).filter(item => !ids.includes(item.id)) } }
}
export function parseLocal(raw: string | null): LocalProgress {
  if (!raw || raw.length > 4_000_000) return emptyLocal()
  try {
    const data = JSON.parse(raw)
    if (data?.version !== 1 || !Array.isArray(data.guest) || data.guest.length > 25 || !data.pending || Array.isArray(data.pending) || typeof data.pending !== 'object') return emptyLocal()
    const guest = data.guest.map((item: unknown) => validateAttempts([item])[0]).filter((item: Attempt) => item.levelId <= 3)
    const pending: Record<string, Attempt[]> = Object.create(null)
    for (const [owner, value] of Object.entries(data.pending)) {
      if (!owner.startsWith('google:') || owner.length > 262 || !Array.isArray(value) || value.length > 200) continue
      pending[owner] = value.map(item => validateAttempts([item])[0])
    }
    return { version: 1, guest, pending, claim: data.claim === true }
  } catch { return emptyLocal() }
}

/** Keep queued retries within both server limits, including full-precision tap times. */
export function nextSaveBatch(attempts: Attempt[]): Attempt[] {
  const batch: Attempt[] = []
  const encoder = new TextEncoder()
  for (const attempt of attempts.slice(0,25)) {
    if (encoder.encode(JSON.stringify({ attempts: [...batch, attempt] })).byteLength > 128 * 1024) break
    batch.push(attempt)
  }
  return batch
}

import { addAttempt, emptyLocal, parseLocal, STORAGE_KEY, type LocalProgress } from './local-progress'
import type { Attempt } from './progress'

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>
type Lock = (operation: () => boolean) => Promise<boolean>

/** Serialize operations against fresh storage; keep failed writes in this tab until retried. */
export function createProgressStorage(storage: StorageAccess, publish: (state: LocalProgress) => void, warn: (message: string) => void, lock: Lock = async operation => operation()) {
  let current = emptyLocal()
  let dirty: { attempt: Attempt; owner: string | null }[] = []
  let serial = Promise.resolve(true)
  const withUnsaved = (state: LocalProgress) => dirty.reduce((next, item) => addAttempt(next, item.attempt, item.owner), state)
  const show = (state: LocalProgress) => { current = state; publish(state) }
  const storageWarning = 'This browser cannot keep your rounds after you leave. Allow website storage to carry them through sign-in.'

  function refresh() {
    try { show(withUnsaved(parseLocal(storage.getItem(STORAGE_KEY)))) }
    catch { warn(storageWarning) }
  }
  function update(change: (state: LocalProgress) => LocalProgress, durable = false) {
    const run = () => lock(() => {
      let latest = current
      try { latest = parseLocal(storage.getItem(STORAGE_KEY)) } catch { /* Retain this tab's unsaved work. */ }
      const next = change(withUnsaved(latest))
      try { storage.setItem(STORAGE_KEY, JSON.stringify(next)) }
      catch { if (!durable) show(next); warn(storageWarning); return false }
      dirty = []
      show(next)
      warn('')
      return true
    })
    const result = serial.then(run, run)
    serial = result.catch(() => false)
    return result
  }
  async function record(attempt: Attempt, owner: string | null) {
    dirty.push({ attempt, owner })
    try { return await update(state => state) }
    catch (error) { dirty = dirty.filter(item => item.attempt.id !== attempt.id); throw error }
  }
  return { refresh, update, record }
}

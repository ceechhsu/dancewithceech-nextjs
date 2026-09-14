import type { AttendanceRecord, CorrectionOperation, MeetingResponse } from './types'

export interface QueuedCorrection extends CorrectionOperation { owner: string; state: 'pending' | 'conflict' | 'error'; message?: string; recordedAt: string; serverRecord?: Pick<AttendanceRecord, 'status' | 'revision'> }
export interface CachedMeeting { id: string; owner: string; className: string; savedAt: string; response: MeetingResponse }
interface SyncResult { operationId: string; saved?: boolean; code?: string; error?: string; record?: Pick<AttendanceRecord, 'status' | 'revision'> }
const DB = 'dwc-attendance-offline-v1'
const USAGE = 'attendance-offline-used'
function markUsage() {
  try { localStorage.setItem(USAGE, '1') }
  catch { throw new Error('Offline storage is unavailable. Changes were not saved offline; keep a separate manual record.') }
}
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => { request.result.createObjectStore('meetings', { keyPath: 'id' }); request.result.createObjectStore('queue', { keyPath: 'operationId' }) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function readAll<T>(store: string): Promise<T[]> {
  const db = await openDB()
  try { return await new Promise<T[]>((resolve, reject) => { const request = db.transaction(store).objectStore(store).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) }) }
  finally { db.close() }
}
async function write(store: string, action: (store: IDBObjectStore) => void) {
  const db = await openDB()
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); action(tx.objectStore(store)); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error) }) }
  finally { db.close() }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('attendance-offline-change'))
}
export async function cacheMeeting(owner: string, className: string, response: MeetingResponse) {
  if (!response.meeting) return
  if (response.meeting.instructor_email.toLowerCase() !== owner.toLowerCase()) throw new Error('Cannot cache another instructor’s roster.')
  markUsage()
  await write('meetings', store => store.put({ id: `${owner}:${response.meeting!.id}`, owner, className, savedAt: new Date().toISOString(), response }))
}
export async function loadCachedMeetings(owner: string) { return (await readAll<CachedMeeting>('meetings')).filter(item => item.owner === owner) }
export async function listQueued(owner: string) { return (await readAll<QueuedCorrection>('queue')).filter(item => item.owner === owner) }
export async function queueCorrection(owner: string, operation: CorrectionOperation) {
  markUsage()
  const pending = await listQueued(owner)
  if (pending.some(item => item.meetingId === operation.meetingId && item.enrollmentId === operation.enrollmentId)) throw new Error('Resolve or discard the existing pending change for this student first.')
  await write('queue', store => store.add({ ...operation, owner, state: 'pending', recordedAt: new Date().toISOString() }))
}
export async function discardOperation(owner: string, operationId: string) { if ((await listQueued(owner)).some(item => item.operationId === operationId)) await write('queue', store => store.delete(operationId)) }
export function applySyncResults(entries: QueuedCorrection[], results: SyncResult[]): QueuedCorrection[] {
  return entries.flatMap(entry => {
    const result = results.find(item => item.operationId === entry.operationId)
    if (!result) return [entry]
    if (result.saved === true) return []
    return [{ ...entry, state: result.code === 'conflict' ? 'conflict' as const : 'error' as const, message: result.error || 'Change not saved. Review before retrying.', ...(result.record ? { serverRecord: result.record } : {}) }]
  })
}
export function describeQueued(entry: QueuedCorrection, meetings: CachedMeeting[]) {
  const cached = meetings.find(item => item.owner === entry.owner && item.response.meeting?.id === entry.meetingId)
  return { student: cached?.response.roster.find(item => item.enrollment_id === entry.enrollmentId)?.name || `Student ${entry.enrollmentId}`, className: cached?.className || `Meeting ${entry.meetingId}`, meetingDate: cached?.response.meeting?.meeting_date || 'Date unavailable' }
}
export function syncCandidates(entries: QueuedCorrection[], pendingOnly: boolean) { return entries.filter(item => pendingOnly ? item.state === 'pending' : item.state !== 'conflict') }
export function syncBatches<T>(entries:T[]):T[][] {const batches:T[][]=[];for(let i=0;i<entries.length;i+=200)batches.push(entries.slice(i,i+200));return batches}
export async function syncQueued(owner: string, pendingOnly = false) {
  const entries = syncCandidates(await listQueued(owner), pendingOnly)
  if (!entries.length) return listQueued(owner)
  for(const batch of syncBatches(entries)) {
  const response = await fetch('/api/attendance/sync', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operations: batch.map(entry => ({ operationId: entry.operationId, meetingId: entry.meetingId, enrollmentId: entry.enrollmentId, status: entry.status, expectedRevision: entry.expectedRevision, note: entry.note, recordedAt: entry.recordedAt })) }) })
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign in again to sync. Your pending changes are still saved on this device.' : 'Sync failed. Your changes remain on this device.')
  const payload = await response.json()
  if (!Array.isArray(payload.results)) throw new Error('Unexpected sync response. Your changes remain on this device.')
  const retained = applySyncResults(batch, payload.results)
  await write('queue', store => { for (const entry of batch) { const updated = retained.find(item => item.operationId === entry.operationId); if (updated) store.put(updated); else store.delete(entry.operationId) } })
  }
  return listQueued(owner)
}
export async function clearOfflineData(owner: string) {
  let marked = false
  try { marked = localStorage.getItem(USAGE) === '1' } catch { /* Ordinary users may disable browser storage. */ }
  if (!marked) {
    // Also recognize caches written before the usage marker was introduced.
    if (typeof indexedDB === 'undefined' || !indexedDB.databases) return
    try { if (!(await indexedDB.databases()).some(db => db.name === DB)) return }
    catch { return }
  }
  if ((await listQueued(owner)).length) throw new Error('Sync or explicitly discard pending attendance changes before signing out.')
  const meetings = await loadCachedMeetings(owner)
  await write('meetings', store => meetings.forEach(item => store.delete(item.id)))
  if (!(await readAll<CachedMeeting>('meetings')).length && !(await readAll<QueuedCorrection>('queue')).length) {
    try { localStorage.removeItem(USAGE) } catch { /* A stale marker is safe; never bypass a known queue. */ }
  }
}
export async function registerOfflineShell() {
  if ('serviceWorker' in navigator) await navigator.serviceWorker.register('/attendance/sw.js', { scope: '/attendance/' })
}

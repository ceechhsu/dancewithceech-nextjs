'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { describeQueued, discardOperation, listQueued, loadCachedMeetings, registerOfflineShell, syncQueued, type CachedMeeting, type QueuedCorrection } from '@/lib/attendance/offline'
import styles from './Attendance.module.css'

export default function OfflineStatus({ owner, onSynced }: { owner: string; onSynced?: () => void }) {
  const [entries, setEntries] = useState<QueuedCorrection[]>([])
  const [meetings, setMeetings] = useState<CachedMeeting[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const syncing = useRef(false)
  const refreshGeneration = useRef(0)
  const onSyncedRef = useRef(onSynced)
  useEffect(() => { onSyncedRef.current = onSynced }, [onSynced])
  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current
    try { const [queued, cached] = await Promise.all([listQueued(owner), loadCachedMeetings(owner)]); if (generation === refreshGeneration.current) { setEntries(queued); setMeetings(cached) } }
    catch { setMessage('This browser cannot save offline attendance. Keep a separate manual record if the connection fails.') }
  }, [owner])
  useEffect(() => {
    void refresh()
    void registerOfflineShell().catch(() => setMessage('Offline page preparation failed. Keep this page open while disconnected.'))
    window.addEventListener('attendance-offline-change', refresh)
    return () => window.removeEventListener('attendance-offline-change', refresh)
  }, [refresh])
  const sync = useCallback(async (pendingOnly = false) => {
    if (syncing.current) return
    syncing.current = true; setBusy(true); setMessage('')
    try {
      if (pendingOnly && !(await listQueued(owner)).some(entry => entry.state === 'pending')) return
      const remaining = await syncQueued(owner, pendingOnly)
      ++refreshGeneration.current
      setEntries(remaining)
      setMessage(remaining.length ? 'Some changes need review below. They have not overwritten newer records.' : 'All pending changes were saved.')
      await refresh()
      onSyncedRef.current?.()
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to sync. Your changes remain on this device.') }
    finally { setBusy(false); syncing.current = false }
  }, [owner, refresh])
  useEffect(() => { const reconnect = () => { void sync(true) }; window.addEventListener('online', reconnect); if (navigator.onLine) reconnect(); return () => window.removeEventListener('online', reconnect) }, [sync])
  async function discard(entry: QueuedCorrection) {
    const identity = describeQueued(entry, meetings)
    if (!window.confirm(`Discard the unsynced change for ${identity.student}, ${identity.className}, ${identity.meetingDate}? The server record will not change.`)) return
    try { await discardOperation(owner, entry.operationId); await refresh() }
    catch { setMessage('Could not discard this change. Please try again.') }
  }
  return <section className={styles.card} aria-label="Offline attendance changes">
    <h2>Offline changes</h2>
    <p className={styles.muted}>Device cache belongs to {owner}. Load a class while online before using offline attendance. Pending changes sync when the connection returns. Review conflicts below. Sync or discard changes before signing out.</p>
    <p>{entries.length} pending {entries.length === 1 ? 'change' : 'changes'}</p>
    {entries.length > 0 && <button className={styles.button} disabled={busy} onClick={() => sync()}>{busy ? 'Syncing…' : 'Sync pending changes'}</button>}
    {message && <p role="status">{message}</p>}
    <ul className={styles.list}>{entries.map(entry => { const identity = describeQueued(entry, meetings); return <li key={entry.operationId}>
      <p><strong>{identity.student}</strong> · {identity.className} · {identity.meetingDate}</p>
      <p>Recorded on this device: {entry.recordedAt ? new Date(entry.recordedAt).toLocaleString() : 'Time unavailable'}</p>
      <p>Mark {entry.status} · {entry.state}{entry.note ? ` · ${entry.note}` : ''}</p>
      {entry.message && <p>{entry.message}</p>}
      {entry.serverRecord && <p>Current server record: {entry.serverRecord.status} · revision {entry.serverRecord.revision}. Your pending change: {entry.status} · based on revision {entry.expectedRevision}.</p>}
      {entry.state === 'conflict' && <p>Reload the class roster to inspect the current status. Discard this outdated change, then make a new correction if needed.</p>}
      <button className={`${styles.button} ${styles.secondary}`} style={{ minHeight: 44 }} disabled={busy} onClick={() => discard(entry)}>Discard this change</button>
    </li> })}</ul>
  </section>
}

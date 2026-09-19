'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSession, signIn, signOut } from 'next-auth/react'
import { identityFromSession, scoreAttempt, summarizeAttempts, type Attempt, type ProgressSummary } from './progress'
import { acknowledge, claimGuest, emptyLocal, nextSaveBatch, STORAGE_KEY, type LocalProgress } from './local-progress'

type Account = { id: string; name: string }
import { createProgressStorage } from './progress-storage'
import { progressRequest } from './progress-request'

export function useProgress() {
  const [local, setLocal] = useState<LocalProgress>(emptyLocal)
  const localRef = useRef(local)
  const [account, setAccount] = useState<Account | null>(null)
  const accountRef = useRef<Account | null>(null)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState<ProgressSummary>(() => summarizeAttempts([]))
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [storageWarning, setStorageWarning] = useState('')
  const busy = useRef(false)
  const rerun = useRef(false)
  const mounted = useRef(true)
  const syncRef = useRef<() => Promise<void>>(async () => {})

  const storageRef = useRef<ReturnType<typeof createProgressStorage> | null>(null)
  const updateLocal = useCallback(async (change: (state: LocalProgress) => LocalProgress, durable = false) => {
    if (!storageRef.current) return false
    return storageRef.current.update(change, durable)
  }, [])

  const sync = useCallback(async () => {
    if (busy.current) { rerun.current = true; return }
    busy.current = true
    setStatus('loading')
    try {
      let timeout: ReturnType<typeof setTimeout> | undefined
      const session = await Promise.race([
        getSession(),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Sign-in is taking longer than expected. You can practice freely and retry saving later.')), 8000) }),
      ]).finally(() => clearTimeout(timeout))
      if (!mounted.current) return
      const id = identityFromSession(session)
      const nextAccount = id ? { id, name: session?.user?.name?.split(' ')[0] || 'Dancer' } : null
      if (accountRef.current?.id !== id) setSaved(summarizeAttempts([]))
      accountRef.current = nextAccount
      setAccount(nextAccount)
      if (!id) { setStatus('idle'); return }
      if (localRef.current.claim && !await updateLocal(state => claimGuest(state, id), true)) throw new Error('Allow website storage, then retry to save your practice rounds securely.')
      setReady(true)
      const response = await progressRequest({ cache: 'no-store', headers: { 'X-BeatFirst-Owner': id } })
      if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in again to save your progress.' : 'Your saved progress could not load. Retry when you’re connected.')
      let summary = response.data as ProgressSummary
      while ((localRef.current.pending[id] ?? []).length > 0) {
        setStatus('saving')
        const attempts = nextSaveBatch(localRef.current.pending[id])
        const result = await progressRequest({ method: 'POST', headers: { 'Content-Type': 'application/json', 'X-BeatFirst-Owner': id }, body: JSON.stringify({ attempts }) })
        const data = result.data
        if (!result.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Your round is waiting to save. Please retry.')
        if (!Array.isArray(data.acceptedIds) || data.acceptedIds.length === 0) throw new Error('Your round is waiting to save. Please retry.')
        await updateLocal(state => acknowledge(state, id, data.acceptedIds))
        summary = data as ProgressSummary
      }
      if (!mounted.current) return
      setSaved(summary)
      setMessage('')
      setStatus('saved')
    } catch (error) {
      if (mounted.current) { setMessage(error instanceof Error ? error.message : 'Saving is unavailable. Your rounds are waiting on this device.'); setStatus('error') }
    } finally {
      busy.current = false
      if (mounted.current) {
        setReady(true)
        if (rerun.current) { rerun.current = false; void syncRef.current() }
      }
    }
  }, [updateLocal])

  useEffect(() => { syncRef.current = sync }, [sync])
  useEffect(() => {
    mounted.current = true
    try {
      storageRef.current = createProgressStorage({ getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) }, state => { localRef.current = state; setLocal(state) }, setStorageWarning,
        operation => navigator.locks ? navigator.locks.request(STORAGE_KEY, operation) : Promise.resolve(operation()))
      storageRef.current.refresh()
    } catch { setStorageWarning('Website storage is unavailable. Keep this page open until your rounds are saved.') }
    void sync()
    const refresh = () => { if (!document.hidden) { storageRef.current?.refresh(); void sync() } }
    const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) storageRef.current?.refresh() }
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('storage', storage)
    return () => { mounted.current = false; window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('storage', storage) }
  }, [sync])

  const record = useCallback(async (attempt: Attempt, owner: string | null) => {
    try {
      if (!storageRef.current) throw new Error('Website storage is unavailable. Allow it before completing more rounds.')
      await storageRef.current.record(attempt, owner)
      if (owner) void syncRef.current()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'This round could not be queued.'); setStatus('error') }
  }, [])

  const login = async () => {
    if (!await updateLocal(state => ({ ...state, claim: true }), true)) return
    setStatus('loading')
    try { await signIn('google', { redirectTo: '/beat-first/preview' }) }
    catch { setMessage('Sign-in could not start. Your rounds are still here. Please retry.'); setStatus('error') }
  }
  const logout = async () => {
    if ((localRef.current.pending[accountRef.current?.id ?? ''] ?? []).length) { setMessage('Save your waiting rounds before signing out.'); setStatus('error'); return }
    await signOut({ redirectTo: '/beat-first/preview' })
  }
  const guest = summarizeAttempts(local.guest.map(scoreAttempt))
  const summary = account ? saved : { ...guest, unlockedLevelIds: [1,2,3] }
  const pendingCount = account ? (local.pending[account.id]?.length ?? 0) : 0
  return { ready, account, summary, guest, record, login, logout, retry: sync, status, message, storageWarning, pendingCount }
}

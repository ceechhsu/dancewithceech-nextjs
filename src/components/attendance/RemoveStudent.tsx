'use client'
import { useEffect, useRef, useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import s from './Attendance.module.css'

export default function RemoveStudent({ classId, className, enrollmentId, email, onRemoved }: { classId: string; className: string; enrollmentId: string; email: string | null; onRemoved: () => void }) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (open) dialog.current?.showModal() }, [open])
  function close() { setOpen(false); setConfirmation(''); setError(''); trigger.current?.focus() }
  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (confirmation !== 'delete' || busy) return
    setBusy(true); setError('')
    try {
      await attendanceApi('enrollments', { action: 'remove_from_class', classId, enrollmentId, confirmation })
      close(); onRemoved()
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <>
    <button ref={trigger} type="button" className={`${s.button} ${s.secondary} ${s.removeIcon}`} aria-label={`Remove from this class: ${email || 'student'}`} title="Delete from this class" aria-haspopup="dialog" onClick={() => { setOpen(true); setConfirmation(''); setError('') }} disabled={busy}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>
    </button>
    {open && <dialog ref={dialog} className={s.removeDialog} aria-label="Delete student from this class" onCancel={event => { event.preventDefault(); if (!busy) close() }}><form aria-label="Confirm student removal" onSubmit={remove}>
      <strong>Delete {email || 'this student'} from {className}?</strong>
      <p>They will no longer be able to check in to this class. Their website account, attendance history, and other classes will remain unchanged.</p>
      <label className={s.field}>Type delete to confirm<input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy} /></label>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.row}><button className={s.button} disabled={busy || confirmation !== 'delete'}>{busy ? 'Removing…' : 'Confirm removal'}</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={close} disabled={busy}>Cancel</button></div>
    </form></dialog>}
  </>
}

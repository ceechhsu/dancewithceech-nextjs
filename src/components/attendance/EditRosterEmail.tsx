'use client'
import { useRef, useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import s from './Attendance.module.css'

export default function EditRosterEmail({ classId, enrollmentId, email, onSaved }: { classId: string; enrollmentId: string; email: string | null; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)

  function close() {
    setOpen(false)
    setError('')
    trigger.current?.focus()
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const value = new FormData(event.currentTarget).get('email')
    const nextEmail = String(value || '').trim().toLowerCase()
    if (!nextEmail && email && !window.confirm(`Remove ${email} from this class roster? The student will no longer be able to check in until an email is added.`)) {
      setBusy(false)
      return
    }
    try {
      await attendanceApi('enrollments', { action: 'update', classId, enrollmentId, email: nextEmail })
      close()
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return <>
    <button ref={trigger} type="button" className={`${s.button} ${s.secondary} ${s.rosterEditTrigger}`} aria-expanded={open} onClick={() => { setError(''); setOpen(value => !value) }} disabled={busy}>
      Edit email
    </button>
    {open && <form className={s.rosterEditForm} onSubmit={save} aria-label="Edit roster email">
      <label className={s.field}>Google sign-in email
        <input name="email" type="email" defaultValue={email || ''} maxLength={200} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Leave blank to remove" disabled={busy} />
      </label>
      <p className={s.muted}>Changing this email clears its linked Google account; the student must sign in with the new address.</p>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.row}><button className={s.button} disabled={busy}>{busy ? 'Saving…' : 'Save email'}</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={close} disabled={busy}>Cancel</button></div>
    </form>}
  </>
}

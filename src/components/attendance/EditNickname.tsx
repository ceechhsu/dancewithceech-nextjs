'use client'
import { useRef, useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import s from './Attendance.module.css'

export default function EditNickname({ classId, enrollmentId, nickname, email, onSaved }: { classId: string; enrollmentId: string; nickname: string | null; email: string | null; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  function close() { setOpen(false); setError(''); trigger.current?.focus() }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('nickname') || '')
    setBusy(true); setError('')
    try {
      await attendanceApi('enrollments', { action: 'nickname', classId, enrollmentId, nickname: value })
      close(); onSaved()
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <>
    <span>{nickname || '—'}</span>
    <button ref={trigger} type="button" className={`${s.button} ${s.secondary} ${s.rosterEditTrigger}`} aria-label={`Edit nickname for ${email || 'student'}`} aria-expanded={open} onClick={() => setOpen(!open)}>Edit nickname</button>
    {open && <form className={s.rosterEditForm} onSubmit={save} aria-label={`Nickname for ${email || 'student'}`}>
      <label className={s.field}>Nickname<input name="nickname" defaultValue={nickname || ''} maxLength={80} autoComplete="off" disabled={busy} /></label>
      <p className={s.muted}>For this class only. Google name and email stay unchanged. Leave blank to clear.</p>
      {error && <p role="alert" className={s.error}>{error}</p>}
      <div className={s.row}><button className={s.button} disabled={busy}>{busy ? 'Saving…' : 'Save nickname'}</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={close} disabled={busy}>Cancel</button></div>
    </form>}
  </>
}

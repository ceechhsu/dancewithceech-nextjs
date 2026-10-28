'use client'
import { useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import { progressLabels, type ProgressTool } from '@/lib/attendance/progress'
import s from './Attendance.module.css'

export default function ProgressToolSettings({ classId, tool = 'none', onSaved }: { classId: string; tool?: ProgressTool; onSaved?: (tool: ProgressTool) => void }) {
  const [value, setValue] = useState(tool)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      await attendanceApi('progress', { action: 'configure', classId, tool: value })
      setMessage('Progress tool saved.'); onSaved?.(value)
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <form onSubmit={save}>
    <label className={s.field}>Student progress tool
      <select value={value} onChange={event => { setValue(event.target.value as ProgressTool); setMessage('') }} disabled={busy}>
        {Object.entries(progressLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
    <p className={s.muted}>Only this class’s enrolled students can use its tool. Changing tools keeps earlier entries saved separately.</p>
    <button className={`${s.button} ${s.secondary}`} disabled={busy}>{busy ? 'Saving…' : 'Save progress tool'}</button>
    {error && <p role="alert" className={s.error}>{error}</p>}
    {message && <p role="status" className={s.success}>{message}</p>}
  </form>
}

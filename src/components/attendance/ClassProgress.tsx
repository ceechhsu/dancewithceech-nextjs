'use client'
import { useEffect, useRef, useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import { progressDate, progressLabels, type ProgressResponse } from '@/lib/attendance/progress'
import s from './Attendance.module.css'

export default function ClassProgress({ classId }: { classId: string }) {
  const [data, setData] = useState<ProgressResponse | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  // Preserve the exact attempted entry for a retry after an ambiguous network failure.
  const pending = useRef<Record<string, unknown> | null>(null)
  useEffect(() => {
    let cancelled = false
    attendanceApi<ProgressResponse>(`progress?classId=${encodeURIComponent(classId)}`)
      .then(value => { if (!cancelled) { setData(value); setError('') } })
      .catch(err => { if (!cancelled) { setData(null); setError(errorMessage(err)) } })
    return () => { cancelled = true }
  }, [classId, retry])
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    setBusy(true); setError(''); setMessage('')
    if (!pending.current) pending.current = { action: 'save', classId, entryId: crypto.randomUUID(), ...Object.fromEntries(new FormData(form)) }
    try {
      const saved = await attendanceApi<{ entry: ProgressResponse['entries'][number] }>('progress', pending.current)
      setData(current => current ? { ...current, entries: [saved.entry, ...current.entries.filter(e => e.id !== saved.entry.id)].sort((a,b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at)) } : current)
      pending.current = null; form.reset(); setMessage('Entry saved.')
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  if (!data) return <><a href="/dashboard">← Your dashboard</a>{error ? <><p role="alert" className={s.error}>{error}</p><button className={s.button} onClick={() => setRetry(v => v + 1)}>Retry progress</button></> : <p role="status">Loading class progress…</p>}</>
  const archery = data.class.progress_tool === 'archery'
  return <>
    <a href={data.instructor ? `/attendance/instructor/classes/${classId}` : '/dashboard'}>← {data.instructor ? 'Class roster & attendance' : 'Your dashboard'}</a>
    <p className={s.eyebrow}>{progressLabels[data.class.progress_tool || 'none']} · {data.class.term} {data.class.year}</p>
    <h1 className={s.title}>{data.class.name}</h1>
    {archery && <a className={s.button} href={`/attendance/archery/${classId}`}>Open scorecard &amp; class games</a>}
    <p className={s.muted}>{data.instructor ? 'Review your students’ practice entries. Each student sees only their own journal.' : archery ? 'Record a shooting score, then look back at your practice week by week.' : 'Keep your workouts, performance and practice notes together.'}</p>
    {!data.instructor && <form className={s.card} onSubmit={save} onChange={() => { if (!busy) { pending.current = null; setMessage('') } }}>
      <h2>{archery ? 'Record a practice' : 'Record a workout'}</h2>
      <p className={s.muted}>Use the format your instructor gives you. Include units or a score total when helpful.</p>
      <fieldset disabled={busy} className={s.progressFields}>
        <label className={s.field}>Date<input name="date" type="date" min={data.earliestDate} max={data.today} defaultValue={data.today} required /></label>
        <label className={s.field}>{archery ? 'Round or practice' : 'Exercise or workout'}<input name="activity" required maxLength={160} placeholder={archery ? 'e.g. Weekly round · 10 m' : 'e.g. Push-ups and jump rope'} /></label>
        <label className={s.field}>{archery ? 'Score or result' : 'Performance or result'}<textarea name="result" required maxLength={1000} rows={3} placeholder={archery ? 'e.g. 72 / 100 · use your class scoring format' : 'e.g. Push-ups: 20, 18, 15. Jump rope: 3 × 60 seconds.'} /></label>
        <label className={s.field}>Notes (optional)<textarea name="notes" maxLength={2000} rows={3} placeholder="What improved? What will you practice next?" /></label>
      </fieldset>
      <button className={s.button} disabled={busy}>{busy ? 'Saving…' : 'Save entry'}</button>
      {error && <p role="alert" className={s.error}>{error} Your entry is still here; try saving again.</p>}
      {message && <p role="status" className={s.success}>{message}</p>}
    </form>}
    <section aria-label="Progress history">
      <h2 className={s.progressHeading}>{data.instructor ? 'Student entries' : 'Your history'}</h2>
      <p className={s.muted}>Newest first · up to 500 recent entries · dates use {data.class.timezone.replaceAll('_', ' ')} time.</p>
      {!data.entries.length && <div className={s.card}><h3>{data.instructor ? 'No student entries yet' : 'Your first entry starts here'}</h3><p>{data.instructor ? 'Entries will appear when students record their practice.' : 'Add today’s practice above. Each entry stays private to you and your instructor.'}</p></div>}
      {data.entries.map(entry => <article className={`${s.card} ${s.progressEntry}`} key={entry.id}>
        <p className={s.eyebrow}><time dateTime={entry.entry_date}>{progressDate(entry.entry_date)}</time>{data.instructor ? ` · ${entry.student_name || 'Student'}` : ''}</p>
        <h3>{entry.activity}</h3>
        <p className={s.progressResult}>{entry.result}</p>
        {entry.notes && <p className={s.progressNotes}>{entry.notes}</p>}
      </article>)}
    </section>
  </>
}

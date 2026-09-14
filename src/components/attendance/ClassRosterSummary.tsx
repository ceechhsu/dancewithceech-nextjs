'use client'
import { useEffect, useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import s from './Attendance.module.css'
import StudentAvatar from './StudentAvatar'
type Summary = { classId: string; students: { id: string; name: string; first_name: string | null; last_name: string | null; photo_url: string | null; email: string | null; present: number; absent: number }[] }
export default function ClassRosterSummary({ classId, className, revision }: { classId: string; className: string; revision: unknown }) {
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [photoRetryKey, setPhotoRetryKey] = useState(0)
  useEffect(() => {
    let cancelled = false, inFlight = false
    setData(null); setError('')
    const refresh = async () => {
      if (cancelled || inFlight || document.visibilityState === 'hidden') return
      inFlight = true
      try {
        const value = await attendanceApi<Summary>(`summary?classId=${encodeURIComponent(classId)}`)
        if (!cancelled) { setData(value); setError(''); setPhotoRetryKey(v => v + 1) }
      } catch (err) { if (!cancelled) setError(errorMessage(err)) }
      finally { inFlight = false }
    }
    void refresh()
    const timer = setInterval(() => { void refresh() }, 15000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [classId, revision, retry])
  return <section className={s.card} aria-label="Class roster and attendance totals">
    <h2>{className} · Roster</h2>
    <p className={s.muted}>Semester totals · completed classes only. Open and cancelled sessions do not count.</p>
    {error ? <><p role="alert">{error}</p><button className={s.button} onClick={() => setRetry(v => v+1)}>Retry roster</button></> : !data ? <p role="status">Loading roster…</p> : !data.students.length ? <p>No active students yet. Add students in Manage classes.</p> :
      <><p className={s.rosterSwipe}>Swipe or scroll sideways to see all columns →</p>
      <div className={s.rosterScroll} tabIndex={0} role="region" aria-label={`${className} roster, scroll horizontally`}>
      <table className={s.rosterDetails}>
        <caption className="sr-only">{className} attendance totals</caption>
        <thead><tr><th scope="col">Photo</th><th scope="col">Last name</th><th scope="col">First name</th><th scope="col"><abbr title="Present">Pres.</abbr></th><th scope="col"><abbr title="Absent">Abs.</abbr></th><th scope="col">Email</th></tr></thead>
        <tbody>{data.students.map(student => <tr key={student.id}><td><StudentAvatar key={student.photo_url} photo={student.photo_url} retryKey={photoRetryKey} first={student.first_name} last={student.last_name} /></td><th scope="row">{student.last_name || <span className={s.muted}>Not provided</span>}</th><td>{student.first_name || <span className={s.muted}>Not provided</span>}</td><td>{student.present}</td><td>{student.absent}</td><td>{student.email || 'Not provided'}{!student.first_name && !student.last_name && student.name !== student.email && <small className={s.muted}><br />{student.name}</small>}</td></tr>)}</tbody>
      </table></div></>}
  </section>
}

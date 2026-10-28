'use client'
/* Full navigation isolates private pages from marketing scripts. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { useEffect, useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import type { AttendanceClass } from '@/lib/attendance/types'
import { progressLabels } from '@/lib/attendance/progress'
import s from './Attendance.module.css'

export default function InstructorDashboard({ owner }: { owner: string }) {
  const [classes, setClasses] = useState<AttendanceClass[] | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    attendanceApi<{ classes: AttendanceClass[] }>('classes').then(data => {
      if (!cancelled) { setClasses(data.classes.filter(c => c.instructor_email === owner)); setError('') }
    }).catch(err => { if (!cancelled) setError(errorMessage(err)) })
    return () => { cancelled = true }
  }, [owner, retry])
  return <section id="teacher-classes" className={s.dashboardSection}>
    <p className={s.eyebrow}>Instructor workspace</p>
    <h1 className={s.title}>Your classes</h1>
    <p className={s.muted}>Open a class to see its students and attendance. Take roll or share a check-in QR below.</p>
    <div className={s.row}><a href="/attendance/instructor/classes">Set up classes and manage rosters</a><a href="#take-attendance">Take attendance ↓</a></div>
    {error && <><p className={s.error} role="alert">{error}</p><button className={s.button} onClick={() => setRetry(v => v + 1)}>Retry classes</button></>}
    {!classes && !error && <p role="status">Loading your classes…</p>}
    {classes?.length === 0 && <p className={s.card}>No classes yet. Create your first class to add a roster and choose its student progress tool.</p>}
    <div className={s.grid}>{classes?.map(c => <article key={c.id} className={s.card}>
      <p className={s.eyebrow}>{c.term} {c.year}{c.archived ? ' · Archived' : ''}</p>
      <h2>{c.name}</h2>
      <p className={s.muted}>{c.college}{c.college ? ' · ' : ''}{progressLabels[c.progress_tool || 'none']}</p>
      <a className={s.button} aria-label={`Open ${c.name}`} href={`/attendance/instructor/classes/${c.id}`}>Students &amp; attendance →</a>
    </article>)}</div>
  </section>
}

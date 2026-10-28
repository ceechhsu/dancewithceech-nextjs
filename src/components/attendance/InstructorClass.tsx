'use client'
import { useEffect, useState } from 'react'
import { attendanceApi, errorMessage } from '@/lib/attendance/client'
import { progressDate, type ClassWorkspace } from '@/lib/attendance/progress'
import ClassRosterSummary from './ClassRosterSummary'
import ProgressToolSettings from './ProgressToolSettings'
import s from './Attendance.module.css'

export default function InstructorClass({ classId }: { classId: string }) {
  const [data, setData] = useState<ClassWorkspace | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [meetingId, setMeetingId] = useState('')
  useEffect(() => {
    let cancelled = false
    attendanceApi<ClassWorkspace>(`progress?action=workspace&classId=${encodeURIComponent(classId)}`)
      .then(value => { if (!cancelled) { setData(value); setError('') } })
      .catch(err => { if (!cancelled) { setData(null); setError(errorMessage(err)) } })
    return () => { cancelled = true }
  }, [classId, revision])
  if (error) return <><p role="alert" className={s.error}>{error}</p><a href="/attendance/instructor">Back to your classes</a><button className={s.button} onClick={() => setRevision(v => v + 1)}>Retry class</button></>
  if (!data) return <p role="status">Loading class roster and attendance…</p>
  const selectedMeeting = data.meetings.find(m => m.id === meetingId) || data.meetings[0]
  const records = data.records.filter(r => r.meeting_id === selectedMeeting?.id)
  return <>
    <a href="/attendance/instructor">← Your classes</a>
    <p className={s.eyebrow}>{data.class.college} · {data.class.term} {data.class.year}</p>
    <h1 className={s.title}>{data.class.name}</h1>
    {data.class.archived && <p className={s.muted}>Archived class · records are retained for your review.</p>}
    <nav className={s.row} aria-label="Class tools">
      {!data.class.archived && <a className={s.button} href={`/attendance/instructor?classId=${classId}#take-attendance`}>Take attendance / QR</a>}
      <a href={`/attendance/instructor/classes/${classId}/roster`}>Manage roster</a>
      {data.class.progress_tool && data.class.progress_tool !== 'none' && <a href={data.class.progress_tool === 'archery' ? `/attendance/archery/${classId}` : `/attendance/progress/${classId}`}>Review student progress</a>}
    </nav>
    <ClassRosterSummary classId={classId} className={data.class.name} revision={revision} onRosterChanged={() => setRevision(v => v + 1)} />
    <section className={s.card} aria-label="Dated attendance records">
      <h2>Attendance by date</h2>
      <p className={s.muted}>Most recent 100 roll calls. Semester totals above include all counted dates. Canceled roll calls are labeled and excluded from totals.</p>
      <button className={`${s.button} ${s.secondary}`} onClick={() => setRevision(v => v + 1)}>Refresh attendance</button>
      {!data.meetings.length ? <p>No roll calls recorded yet.</p> : <>
        <label className={s.field}>Class date
          <select value={selectedMeeting?.id} onChange={event => setMeetingId(event.target.value)}>
            {data.meetings.map(m => <option key={m.id} value={m.id}>{progressDate(m.meeting_date)} · {m.status}</option>)}
          </select>
        </label>
        <p>{selectedMeeting?.status === 'cancelled' ? 'Canceled — these records do not count toward attendance.' : selectedMeeting?.status === 'open' ? 'Attendance is open. Missing records are not final absences.' : 'Closed roll call'}</p>
        {records.length === 0 ? <p>No attendance records for this roll call.</p> : <div className={s.rosterScroll} tabIndex={0} role="region" aria-label="Student attendance on selected date">
          <table className={s.progressTable}>
            <caption className="sr-only">Attendance for {selectedMeeting && progressDate(selectedMeeting.meeting_date)}</caption>
            <thead><tr><th scope="col">Student</th><th scope="col">Attendance</th><th scope="col">Recorded by</th></tr></thead>
            <tbody>{records.map(r => <tr key={r.enrollment_id}><th scope="row">{r.name}</th><td>{r.status === 'present' ? 'Present' : 'Absent'}</td><td>{({ check_in: 'Student check-in', manual: 'Instructor', finalized: 'Roll closed', instructor_credit: 'Instructor credit' } as Record<string,string>)[r.source] || r.source}</td></tr>)}</tbody>
          </table>
        </div>}
      </>}
    </section>
    <section className={s.card}>
      <h2>Student progress</h2>
      <ProgressToolSettings key={classId} classId={classId} tool={data.class.progress_tool} onSaved={tool => setData(current => current ? { ...current, class: { ...current.class, progress_tool: tool } } : current)} />
    </section>
  </>
}

import s from '@/components/attendance/Attendance.module.css'

export default function SignedOut() {
  return <main className={s.shell}>
    <section className={s.card}>
      <h1>You’re signed out</h1>
      <p>To check in as another student, scan your instructor’s current QR code and enter that student’s roster email.</p>
      <p>Your saved attendance records have not been changed.</p>
      <a href="/attendance/instructor">Instructor sign in</a>
    </section>
  </main>
}

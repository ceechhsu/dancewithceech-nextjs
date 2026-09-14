'use client'
/* eslint-disable @next/next/no-html-link-for-pages */
import Image from 'next/image'
import MobileMenu from '../MobileMenu'
import { canSeeAttendance } from '@/lib/attendance/navigation'
import s from './Attendance.module.css'
import StudentAvatar from './StudentAvatar'

export type HeaderUser = { name?: string | null; image?: string | null; email?: string | null; googleEmailVerified?: boolean }
export default function InstructorHeader({ student = false, user }: { student?: boolean; user?: HeaderUser | null }) {
  return <header className={`${s.header} ${student ? s.studentHeader : ''}`}>
    <a href="/" className={s.homeLogo} aria-label="Dance With Ceech homepage">
      <Image src="/logo-mark.png" alt="Dance With Ceech" width={44} height={44} />
    </a>
    {student && <div className={s.welcome}>
      {user ? <><span>Welcome</span><StudentAvatar key={user.image} photo={user.image || null} first={user.name || null} last={null} /><span className={s.welcomeName}>{user.name || 'dancer'}</span></> : <span>Class Attendance</span>}
    </div>}
    <MobileMenu user={user} showAttendance={canSeeAttendance(user)} alwaysVisible />
  </header>
}

'use client'
import { useState } from 'react'
import Image from 'next/image'
import s from './Attendance.module.css'
export default function StudentAvatar({ photo, first, last, retryKey = 0 }: { photo: string | null; first: string | null; last: string | null; retryKey?: number }) {
  const [failedAttempt, setFailedAttempt] = useState<string | null>(null)
  const attempt = `${photo || ''}:${retryKey}`
  const failed = failedAttempt === attempt
  const initials = [first, last].filter(Boolean).map(v => v!.slice(0,1)).join('').toUpperCase() || '—'
  return <span className={s.studentAvatar} aria-label={photo && !failed ? undefined : 'No profile photo'}>
    {photo && !failed ? <Image src={photo} alt="" width={36} height={36} sizes="36px" referrerPolicy="no-referrer" onError={() => setFailedAttempt(attempt)} /> : initials}
  </span>
}

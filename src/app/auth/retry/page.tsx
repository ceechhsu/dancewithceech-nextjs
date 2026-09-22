import { cookies } from 'next/headers'
import Link from 'next/link'
import GoogleLogin from '@/components/attendance/GoogleLogin'
import { recoveryDestination } from '@/lib/auth-recovery'
import styles from '@/components/attendance/Attendance.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Try signing in again | Dance With Ceech', robots: { index: false, follow: false } }

export default async function RetrySignIn() {
  const jar = await cookies()
  const origin = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'https://dancewithceech.com'
  const destination = recoveryDestination(jar.get('__Secure-authjs.callback-url')?.value ?? jar.get('authjs.callback-url')?.value, origin)
  return <main className={styles.shell}>
    <Link href="/">Dance With Ceech</Link>
    <h1>Let’s try signing in again</h1>
    <p>Your sign-in could not be completed. Start a fresh Google sign-in below.</p>
    <p>If you switched browsers, open the class QR link in Safari or Chrome and finish signing in there.</p>
    <GoogleLogin returnTo={destination} />
    <p>If your attendance window has ended, ask your instructor to reopen it and scan the new QR code.</p>
  </main>
}

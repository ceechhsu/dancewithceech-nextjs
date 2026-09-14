'use client'

import { signOut } from 'next-auth/react'
import { useState } from 'react'

export default function AttendanceSignOut() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function handleSignOut() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/attendance/sign-out', { method: 'POST' })
      if (!response.ok) throw new Error('Unable to sign out. Please try again.')
      await signOut({ callbackUrl: '/attendance/signed-out' })
    } catch {
      setError('Unable to finish signing out. Please try again.')
      setBusy(false)
    }
  }
  return (
    <>
    <button
      type="button"
      disabled={busy}
      onClick={handleSignOut}
      style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 0 }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
    {error && <span role="alert">{error}</span>}
    </>
  )
}

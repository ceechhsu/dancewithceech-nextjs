'use client'
/* Full-document links isolate private account settings. */

import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function UserMenu({ name, email, image }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [custom, setCustom] = useState<{ email: string; name: string; image: string } | null>(null)
  const [failedPhoto, setFailedPhoto] = useState('')

  useEffect(() => {
    let active = true
    const key = email?.trim().toLowerCase()
    if (!key) return
    const refresh = async () => {
      try {
        const response = await fetch('/api/account/profile', { cache: 'no-store' })
        if (!response.ok) { if (active) setCustom(null); return }
        const profile = await response.json()
        if (active && profile.email?.trim().toLowerCase() === key) setCustom({ email: key, name: profile.display_name, image: profile.photo_url })
      } catch { /* Google identity remains available during a profile storage outage. */ }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    return () => { active = false; window.removeEventListener('focus', refresh) }
  }, [email])

  const savedProfile = custom?.email === email?.trim().toLowerCase() ? custom : null
  const visibleName = savedProfile?.name || name
  const visibleImage = savedProfile ? savedProfile.image : image

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = visibleName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
        aria-label="User menu"
      >
        {visibleImage && failedPhoto !== visibleImage ? visibleImage.startsWith('/api/account/profile/photo') ? (
          // The authenticated photo must receive the browser's session cookie directly.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visibleImage} alt={visibleName ?? 'Your profile photo'} width={32} height={32} referrerPolicy="no-referrer" onError={() => setFailedPhoto(visibleImage)} style={{ borderRadius: '50%', display: 'block', objectFit: 'cover' }} />
        ) : (
          <Image
            src={visibleImage}
            alt={visibleName ?? 'User'}
            title={visibleName ?? 'User profile photo'}
            width={32}
            height={32}
            style={{ borderRadius: '50%', display: 'block' }}
          />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: 180,
          backgroundColor: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          overflow: 'hidden',
          zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {visibleName && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #222', fontSize: 12, color: '#6b7280' }}>
              {visibleName}
            </div>
          )}
          <a href="/profile" onClick={() => setOpen(false)} className="block px-3.5 py-3 text-sm text-white hover:bg-white/5">My profile</a>
          {email?.trim().toLowerCase() === 'dancewithceech@gmail.com' && <a href="/admin" className="block px-3.5 py-3 text-sm text-white hover:bg-white/5">Owner dashboard</a>}
          <Link
            href="/beat-first#progress"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '10px 14px',
              fontSize: 14,
              color: '#f9f9f9',
              textDecoration: 'none',
              borderBottom: '1px solid #222',
            }}
            className="hover:bg-white/5 transition-colors"
          >
            My Progress
          </Link>
          <button
            onClick={async () => { try { if(email && typeof indexedDB !== 'undefined') { const {clearOfflineData}=await import('@/lib/attendance/offline'); await clearOfflineData(email.trim().toLowerCase()) } setOpen(false); await signOut() } catch(error) { alert(error instanceof Error?error.message:'Please sync attendance before signing out.') } }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              color: '#ef4444',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            className="hover:bg-white/5 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

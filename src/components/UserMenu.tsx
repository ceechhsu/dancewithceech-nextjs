'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function UserMenu({ name, image }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

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
        {image ? (
          <Image
            src={image}
            alt={name ?? 'User'}
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
          {name && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #222', fontSize: 12, color: '#6b7280' }}>
              {name}
            </div>
          )}
          <Link
            href="/beat-first?tab=progress"
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
            onClick={() => { setOpen(false); signOut() }}
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

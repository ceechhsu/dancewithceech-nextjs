'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function BeatFirstError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('BeatFirst error:', error)
  }, [error])

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="px-6 py-4" style={{ borderBottom: '1px solid #1f1f1f' }}>
        <Link href="/" style={{ fontWeight: 700, color: '#F9F9F9', textDecoration: 'none' }}>
          Dance With <span style={{ color: '#2563EB' }}>Ceech</span>
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#ef4444' }}>
          Something went wrong
        </div>
        <h1
          className="font-black uppercase leading-none mb-4"
          style={{
            fontFamily: "var(--font-barlow-condensed), 'Arial Narrow', Arial, sans-serif",
            fontSize: 'clamp(2.5rem, 7vw, 4rem)',
            letterSpacing: '0.02em',
          }}
        >
          BeatFirst Hit a Bad Note
        </h1>
        <p className="text-lg mb-8 max-w-md" style={{ color: 'var(--muted)' }}>
          The rhythm trainer ran into an issue. Try again or come back later.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="px-8 py-3 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-8 py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1a1a1a', color: 'var(--foreground)', border: '1px solid #333' }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  )
}

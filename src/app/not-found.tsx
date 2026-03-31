import Link from 'next/link'
import Nav from '@/components/Nav'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <Nav />
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent-primary)' }}>
          404
        </div>
        <h1
          className="font-black uppercase leading-none mb-4"
          style={{
            fontFamily: "var(--font-barlow-condensed), 'Arial Narrow', Arial, sans-serif",
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            letterSpacing: '0.02em',
          }}
        >
          Page Not Found
        </h1>
        <p className="text-lg mb-8 max-w-md" style={{ color: 'var(--muted)' }}>
          This step doesn&apos;t exist in the routine. Let&apos;s get you back on beat.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="px-8 py-3 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Go Home
          </Link>
          <Link
            href="/beat-first"
            className="px-8 py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1a1a1a', color: 'var(--foreground)', border: '1px solid #333' }}
          >
            Try BeatFirst
          </Link>
        </div>
      </div>
    </main>
  )
}

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t mt-20 py-12 px-6" style={{ borderColor: '#1f1f1f', backgroundColor: 'var(--background)' }}>
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
        <div>
          <Link href="/" prefetch={false} className="text-base font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Dance With Ceech
          </Link>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
            Hip-hop dance instruction in San Jose, CA.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Learn</p>
          <ul className="flex flex-col gap-2 text-sm" style={{ color: 'var(--muted)' }}>
            <li><Link href="/beat-first" prefetch={false} className="hover:text-white transition-colors">BeatFirst</Link></li>
            <li><Link href="/private-lessons" prefetch={false} className="hover:text-white transition-colors">Private Lessons</Link></li>
            <li><Link href="/private-lessons/san-jose" prefetch={false} className="hover:text-white transition-colors">San Jose Lessons</Link></li>
            <li><Link href="/private-lessons/bay-area" prefetch={false} className="hover:text-white transition-colors">Bay Area Lessons</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Styles</p>
          <ul className="flex flex-col gap-2 text-sm" style={{ color: 'var(--muted)' }}>
            <li><Link href="/hip-hop-dance-moves" prefetch={false} className="hover:text-white transition-colors">Hip-Hop</Link></li>
            <li><Link href="/locking-dance-moves" prefetch={false} className="hover:text-white transition-colors">Locking</Link></li>
            <li><Link href="/breaking-dance-moves" prefetch={false} className="hover:text-white transition-colors">Breaking</Link></li>
            <li><Link href="/funk-style-dance-moves" prefetch={false} className="hover:text-white transition-colors">Funk</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Company</p>
          <ul className="flex flex-col gap-2 text-sm" style={{ color: 'var(--muted)' }}>
            <li><Link href="/blog" prefetch={false} className="hover:text-white transition-colors">Blog</Link></li>
            <li><Link href="/about" prefetch={false} className="hover:text-white transition-colors">About</Link></li>
            <li><Link href="/contact" prefetch={false} className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-5xl mx-auto border-t pt-6 text-xs text-center" style={{ borderColor: '#1f1f1f', color: 'var(--muted)' }}>
        © {new Date().getFullYear()} Dance With Ceech. All rights reserved.
      </div>
    </footer>
  )
}

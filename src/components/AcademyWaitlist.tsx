'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BeamsBackground } from '@/components/ui/beams-background'

const MODULES = [
  { label: 'Module 1', title: 'Rhythm & Timing', desc: 'The foundation every dancer skips. Master the beat before you touch a move.', unlocked: true, cta: { text: 'Try BeatFirst — free preview of this module', href: '/beat-first' } },
  { label: 'Module 2', title: 'Basic Grooves', desc: 'The bounce, the rock, the two-step. Build your default movement vocabulary.', unlocked: false },
  { label: 'Module 3', title: 'Hip-Hop Fundamentals', desc: 'Running man, cabbage patch, prep. Core moves with real musical context.', unlocked: false },
  { label: 'Module 4', title: 'Footwork & Floor Patterns', desc: 'Where you go matters. Learn to move through space with intention.', unlocked: false },
  { label: 'Module 5', title: 'Locking Foundations', desc: 'Locks, points, wrist rolls, and the Leo walk. Funk discipline.', unlocked: false },
  { label: 'Module 6', title: 'Freestyle & Musicality', desc: 'Put it all together. Respond to music in real time. This is the goal.', unlocked: false },
]

export default function AcademyWaitlist() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/academy-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <BeamsBackground intensity="medium">
      {/* HERO */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-secondary)', marginBottom: '16px' }}>
            DanceWithCeech Academy
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px' }}>
            A real system.<br />Not a random playlist.
          </h1>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.7, color: 'var(--muted)', maxWidth: '560px', margin: '0 auto 40px' }}>
            25+ years of teaching distilled into a progressive curriculum — drill by drill, move by move.
            From your very first beat to freestyle on any dance floor.
          </p>

          {/* Waitlist form */}
          {status === 'success' ? (
            <div style={{
              background: '#0f2a1a',
              border: '1px solid #22c55e44',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '480px',
              margin: '0 auto',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: '#f9f9f9' }}>You&apos;re on the list.</div>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
                I&apos;ll email you directly when founding member enrollment opens. You&apos;ll be first.
              </p>
              <Link
                href="/beat-first"
                style={{
                  display: 'inline-block',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Start BeatFirst while you wait →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="First name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    fontSize: '15px',
                    color: '#f9f9f9',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    fontSize: '15px',
                    color: '#f9f9f9',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  width: '100%',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: status === 'loading' ? 0.7 : 1,
                }}
              >
                {status === 'loading' ? 'Saving your spot…' : 'Notify Me When It Opens'}
              </button>
              {status === 'error' && (
                <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
                  Something went wrong. Try again or email me directly.
                </p>
              )}
              <p style={{ fontSize: '12px', color: '#4b5563', marginTop: '12px' }}>
                No spam. Just one email when enrollment opens.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* FOUNDING MEMBER CALLOUT */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{
          maxWidth: '720px',
          margin: '0 auto',
          background: 'linear-gradient(135deg, #1e2a4a, #1a1a2e)',
          border: '1px solid #2563eb44',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px' }}>
            Founding Members
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '16px' }}>
            First 100 students get locked-in pricing — forever.
          </h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
            When the academy launches, founding members pay less than anyone who comes after them.
            That price never goes up for you. Join the waitlist now to qualify.
          </p>
        </div>
      </section>

      {/* CURRICULUM PREVIEW */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px' }}>What you&apos;ll learn</h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px' }}>A structured path from zero to freestyle. No random clips. No skipped steps.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {MODULES.map((mod, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: mod.unlocked ? '#111' : '#0d0d0d',
                  border: `1px solid ${mod.unlocked ? '#2563eb44' : '#1a1a1a'}`,
                  borderRadius: '10px',
                  opacity: mod.unlocked ? 1 : 0.6,
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: mod.unlocked ? 'var(--accent-primary)' : '#1f1f1f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  flexShrink: 0,
                }}>
                  {mod.unlocked ? '▶' : '🔒'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>{mod.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#f9f9f9' }}>{mod.title}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{mod.desc}</div>
                  {'cta' in mod && mod.cta && (
                    <Link href={mod.cta.href} style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                      {mod.cta.text} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#4b5563', marginTop: '20px' }}>
            More modules in development. The curriculum grows as the academy launches.
          </p>
        </div>
      </section>

      {/* DO THIS NOW SECTION */}
      <section style={{ padding: '0 24px 100px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Don&apos;t wait to start.</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '32px', lineHeight: 1.7 }}>
            The academy starts with rhythm — and you can begin that right now, for free.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            <Link
              href="/beat-first"
              style={{
                background: 'var(--accent-primary)',
                color: '#fff',
                borderRadius: '999px',
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Train your rhythm — free
            </Link>
            <a
              href="https://www.youtube.com/@dancewithceech"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'transparent',
                color: 'var(--muted)',
                border: '1px solid #333',
                borderRadius: '999px',
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Watch free lessons on YouTube
            </a>
          </div>
        </div>
      </section>
    </BeamsBackground>
  )
}

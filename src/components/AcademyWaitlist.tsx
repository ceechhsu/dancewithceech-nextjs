'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BeamsBackground } from '@/components/ui/beams-background'

const MODULES = [
  { label: 'Module 1', title: 'Rhythm & Timing', desc: 'The foundation every dancer skips. Master the beat before you touch a move.', unlocked: true, cta: { text: 'Try BeatFirst — free preview of this module', href: '/beat-first' } },
  { label: 'Module 2', title: 'Basic Grooves', desc: 'The bounce, the rock, the two-step. Build your default movement vocabulary.', unlocked: false },
  { label: 'Module 3', title: 'Hip-Hop Fundamentals', desc: 'Running man, cabbage patch, prep. Core moves with real musical context.', unlocked: false },
  { label: 'Module 4', title: 'Footwork & Floor Patterns', desc: 'Where you go matters. Learn to move through space with intention.', unlocked: false },
  { label: 'Module 5', title: 'Locking Foundations', desc: 'Locks, points, wrist rolls, and the Leo walk. Funk discipline.', unlocked: false },
  { label: 'Module 6', title: 'Freestyle & Musicality', desc: 'Put it all together. Respond to music in real time. This is the goal.', unlocked: false },
]

const PILLARS = [
  {
    icon: '▶',
    title: 'Structured Video Lessons',
    desc: '25+ years of teaching distilled into a step-by-step curriculum. No random clips. No skipped steps. Every drill builds on the last.',
  },
  {
    icon: '⬡',
    title: 'Private Community',
    desc: 'A judgment-free space where everyone starts from zero. Post your practice videos, get feedback, celebrate progress. No showing off — only support.',
  },
  {
    icon: '◎',
    title: 'Live Sessions with Ceech',
    desc: 'Monthly group sessions where Ceech teaches, answers questions, and gives real feedback. Stay longer, earn smaller group and 1-on-1 access.',
  },
]

const TIERS = [
  {
    name: 'Student',
    when: 'Month 1+',
    color: '#2563EB',
    benefits: ['Full video curriculum', 'Private community access', 'Monthly group live session with Ceech', 'Progress tracking'],
  },
  {
    name: 'Practitioner',
    when: '3 months + 5 practice videos posted',
    color: '#FDB515',
    benefits: ['Everything in Student', 'Small group session with Ceech (8–12 people)', 'Priority community recognition'],
  },
  {
    name: 'Veteran',
    when: '6 months + all modules complete',
    color: '#22c55e',
    benefits: ['Everything in Practitioner', 'Earned 1-on-1 time with Ceech', 'Founding Veteran status — forever'],
  },
]

export default function AcademyWaitlist() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [emailError, setEmailError] = useState('')
  const [spotsClaimed, setSpotsClaimed] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/academy-waitlist/count')
      .then(r => r.json())
      .then(d => setSpotsClaimed(d.count))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/academy-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const spotsLeft = spotsClaimed !== null ? 100 - spotsClaimed : null

  return (
    <BeamsBackground intensity="medium">

      {/* ── HERO ── */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-secondary)', marginBottom: '16px' }}>
              DanceWithCeech Academy
            </div>
            <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px', fontFamily: "var(--font-barlow-condensed), 'Arial Narrow', Arial, sans-serif", letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              From shy to confidently dancing in public.
            </h1>
            <p style={{ fontSize: '1.125rem', lineHeight: 1.7, color: 'var(--muted)', marginBottom: '16px' }}>
              A private, judgment-free program for working professionals who are too self-conscious to take a public class. Learn at home, at your own pace, until you&apos;re ready to own any dance floor.
            </p>
            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--muted)', marginBottom: '32px' }}>
              Built by Ceech — 25+ years of teaching. Designed for people starting from zero.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a
                href="#founding"
                style={{
                  display: 'inline-block',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Join as a Founding Member — $199
              </a>
              <a
                href="#curriculum"
                style={{
                  display: 'inline-block',
                  background: 'transparent',
                  color: 'var(--muted)',
                  border: '1px solid #333',
                  borderRadius: '999px',
                  padding: '16px 32px',
                  fontSize: '15px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                See what&apos;s included ↓
              </a>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Image
              src="/images/ceech/group-class.jpg"
              alt="Ceech teaching a group dance class"
              width={480}
              height={400}
              style={{ borderRadius: '16px', objectFit: 'cover', width: '100%', maxHeight: '420px' }}
            />
          </div>
        </div>
      </section>

      {/* ── WHO THIS IS FOR ── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: '16px',
            padding: '40px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '16px' }}>
              This is for you if
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                'You want to learn to dance but feel too embarrassed to take a class in public',
                'You\'re a working professional who wants to practice alone, at home, without being judged',
                'You\'ve avoided the dance floor at weddings, parties, and clubs — and you\'re tired of it',
                'You have zero rhythm and zero experience — and that\'s exactly where this starts',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>→</span>
                  <span style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── THE TRANSFORMATION ── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '16px' }}>
            The outcome
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '24px', lineHeight: 1.2 }}>
            You won&apos;t just think you look good.<br />You&apos;ll know it.
          </h2>
          <p style={{ fontSize: '1.125rem', color: 'var(--muted)', lineHeight: 1.8, marginBottom: '16px' }}>
            By the end of this program, you&apos;ll walk into a wedding, a corporate party, a house party, or a club — and dance. Not fake it. Dance. You&apos;ll know how to listen to the music, how to make your body move with it, and you&apos;ll have the real confidence that comes from actual skill.
          </p>
          <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: 1.7 }}>
            Other people will see it. That&apos;s the difference.
          </p>
        </div>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px' }}>
              What&apos;s included
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Everything you need. Nothing you don&apos;t.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {PILLARS.map((p, i) => (
              <div key={i} style={{
                background: '#111',
                border: '1px solid #1f1f1f',
                borderRadius: '12px',
                padding: '28px',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '16px' }}>{p.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '10px', color: '#f9f9f9' }}>{p.title}</div>
                <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.7 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CURRICULUM ── */}
      <section id="curriculum" style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px' }}>
              The curriculum
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px' }}>A structured path from zero to freestyle.</h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px' }}>No random clips. No skipped steps. Every module builds on the last.</p>
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
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 600 }}>
            Already a BeatFirst user? You&apos;ve started Module 1.
          </div>
        </div>
      </section>

      {/* ── TIER SYSTEM ── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px' }}>
              The longer you stay, the more you earn
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px' }}>Your membership grows with you.</h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px' }}>Stay active, post your practice, complete the curriculum — and earn more access to Ceech.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {TIERS.map((tier, i) => (
              <div key={i} style={{
                background: '#111',
                border: `1px solid ${tier.color}33`,
                borderRadius: '12px',
                padding: '28px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: tier.color, marginBottom: '8px' }}>
                  Tier {i + 1}
                </div>
                <div style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: '#f9f9f9' }}>{tier.name}</div>
                <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '20px' }}>Unlocked: {tier.when}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tier.benefits.map((b, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: tier.color, flexShrink: 0, marginTop: '2px', fontSize: '12px' }}>✓</span>
                      <span style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDING MEMBER PRICING ── */}
      <section id="founding" style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px' }}>
              Founding Members
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px' }}>First 100 students. Locked-in pricing. Forever.</h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
              Founding members pay less than anyone who comes after them — and that rate never goes up, no matter what we charge in the future.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
            {/* Founding */}
            <div style={{
              background: 'linear-gradient(135deg, #1e2a4a, #1a1a2e)',
              border: '2px solid #2563eb',
              borderRadius: '16px',
              padding: '32px',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--accent-primary)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '4px 14px',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
              }}>
                Founding Member
              </div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f9f9f9' }}>$199</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>first 3 months</div>
                <div style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '8px' }}>then $29/month — locked forever</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {['Full curriculum access', 'Private community', 'Monthly live sessions', 'Tier progression', '$29/mo rate locked forever', 'Founding member status'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#2563EB', flexShrink: 0, fontSize: '12px', marginTop: '2px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{f}</span>
                  </div>
                ))}
              </div>
              {spotsClaimed !== null && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{spotsClaimed} spots claimed</span>
                    <span style={{ color: 'var(--muted)' }}>{spotsLeft} left</span>
                  </div>
                  <div style={{ height: '5px', background: '#1f1f1f', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((spotsClaimed / 100) * 100, 100)}%`,
                      background: 'var(--accent-primary)',
                      borderRadius: '999px',
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              )}
              {status === 'success' ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>✓ You&apos;re on the list.</div>
                  <p style={{ fontSize: '13px', color: 'var(--muted)' }}>I&apos;ll email you when founding member enrollment opens.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError('') }}
                    style={{
                      background: '#0a0a0a',
                      border: `1px solid ${emailError ? '#ef4444' : '#2a2a2a'}`,
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '14px',
                      color: '#f9f9f9',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                  {emailError && <div style={{ color: '#ef4444', fontSize: '12px' }}>{emailError}</div>}
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    style={{
                      width: '100%',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '14px',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                      opacity: status === 'loading' ? 0.7 : 1,
                    }}
                  >
                    {status === 'loading' ? 'Saving your spot…' : 'Reserve My Founding Spot'}
                  </button>
                  {status === 'error' && (
                    <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center' }}>
                      Something went wrong. Try again or email me directly.
                    </p>
                  )}
                  <p style={{ fontSize: '11px', color: '#4b5563', textAlign: 'center' }}>
                    No spam. One email when enrollment opens.
                  </p>
                </form>
              )}
            </div>

            {/* Regular */}
            <div style={{
              background: '#0d0d0d',
              border: '1px solid #1f1f1f',
              borderRadius: '16px',
              padding: '32px',
              opacity: 0.7,
            }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Regular Price</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f9f9f9' }}>$297</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>first 3 months</div>
                <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600, marginTop: '8px' }}>then $37/month</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['Full curriculum access', 'Private community', 'Monthly live sessions', 'Tier progression'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#4b5563', flexShrink: 0, fontSize: '12px', marginTop: '2px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: '#4b5563' }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '24px', padding: '12px', background: '#111', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#4b5563' }}>Available after founding spots are filled</div>
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#4b5563' }}>
            Cancel anytime. No contracts. Your $29/month rate is yours forever once you&apos;re in.
          </p>
        </div>
      </section>

      {/* ── DO THIS NOW ── */}
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

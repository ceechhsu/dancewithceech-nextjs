'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn } from 'next-auth/react'
import { BEATS, INTERMEDIATE_MASTERY_REQUIRED } from '@/lib/beats'

// ─── Types ───────────────────────────────────────────────────────────────────

type Session = {
  id: string
  beat_id: string
  score_pct: number
  perfect: number
  good: number
  ok: number
  miss: number
  played_at: string
}

type Mastery = {
  beat_id: string
  mastered_at: string
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ sessions }: { sessions: Session[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const last20 = sessions.slice(-20)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 80, 32)

    if (last20.length === 0) return

    const barW = Math.floor(80 / last20.length) - 1
    last20.forEach((s, i) => {
      const h = Math.max(2, Math.round((s.score_pct / 100) * 28))
      const x = i * (barW + 1)
      const y = 32 - h

      if (s.score_pct >= 90) ctx.fillStyle = '#22c55e'
      else if (s.score_pct >= 60) ctx.fillStyle = '#eab308'
      else ctx.fillStyle = '#ef4444'

      ctx.fillRect(x, y, barW, h)
    })
  }, [last20])

  return <canvas ref={canvasRef} width={80} height={32} style={{ display: 'block' }} />
}

// ─── Score line graph ─────────────────────────────────────────────────────────

function ScoreGraph({ sessions }: { sessions: Session[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const W = 480
  const H = 140
  const PAD = { top: 12, right: 16, bottom: 40, left: 36 }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || sessions.length === 0) return

    ctx.clearRect(0, 0, W, H)

    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom

    // Dashed 90% line
    const y90 = PAD.top + innerH * (1 - 0.9)
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = '#22c55e44'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD.left, y90)
    ctx.lineTo(PAD.left + innerW, y90)
    ctx.stroke()
    ctx.setLineDash([])

    // Y axis label 90%
    ctx.fillStyle = '#22c55e88'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('90%', PAD.left - 4, y90 + 4)

    // Score line
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 2
    ctx.beginPath()
    sessions.forEach((s, i) => {
      const x = PAD.left + (sessions.length === 1 ? innerW / 2 : (i / (sessions.length - 1)) * innerW)
      const y = PAD.top + innerH * (1 - s.score_pct / 100)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Dots
    sessions.forEach((s, i) => {
      const x = PAD.left + (sessions.length === 1 ? innerW / 2 : (i / (sessions.length - 1)) * innerW)
      const y = PAD.top + innerH * (1 - s.score_pct / 100)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#60a5fa'
      ctx.fill()
    })

    // X-axis date labels (show first, last, and up to 3 in between)
    ctx.fillStyle = '#9ca3af'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    const labelIdxs = sessions.length <= 5
      ? sessions.map((_, i) => i)
      : [0, Math.floor(sessions.length / 3), Math.floor((2 * sessions.length) / 3), sessions.length - 1]

    for (const i of labelIdxs) {
      const s = sessions[i]
      const x = PAD.left + (sessions.length === 1 ? innerW / 2 : (i / (sessions.length - 1)) * innerW)
      const date = new Date(s.played_at)
      const label = `${date.getMonth() + 1}/${date.getDate()}`
      ctx.fillText(label, x, H - PAD.bottom + 14)
      ctx.fillText(`#${i + 1}`, x, H - PAD.bottom + 24)
    }
  }, [sessions])

  return <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', maxWidth: '100%' }} />
}

// ─── Stacked breakdown bars ───────────────────────────────────────────────────

function BreakdownBars({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) return null
  const BAR_H = 12
  const GAP = 3
  const W = 480

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={Math.max(W, sessions.length * 14)} height={sessions.length * (BAR_H + GAP) + 20} style={{ display: 'block', maxWidth: '100%' }}>
        {/* Legend */}
        {[['#22c55e', 'perfect'], ['#60a5fa', 'good'], ['#eab308', 'ok'], ['#ef4444', 'miss']].map(([color, label], li) => (
          <g key={label} transform={`translate(${li * 80}, 0)`}>
            <rect x={0} y={2} width={10} height={10} fill={color} rx={2} />
            <text x={14} y={11} fontSize={9} fill="#9ca3af">{label}</text>
          </g>
        ))}
        {sessions.map((s, i) => {
          const total = s.perfect + s.good + s.ok + s.miss
          if (total === 0) return null
          const y = 20 + i * (BAR_H + GAP)
          const segments = [
            { count: s.perfect, color: '#22c55e' },
            { count: s.good,    color: '#60a5fa' },
            { count: s.ok,      color: '#eab308' },
            { count: s.miss,    color: '#ef4444' },
          ]
          let x = 0
          return (
            <g key={s.id}>
              {segments.map(({ count, color }) => {
                const w = (count / total) * W
                const rect = <rect key={color} x={x} y={y} width={w} height={BAR_H} fill={color} />
                x += w
                return rect
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Beat Row ─────────────────────────────────────────────────────────────────

function BeatRow({
  beat,
  sessions,
  mastered,
}: {
  beat: typeof BEATS[0]
  sessions: Session[]
  mastered: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const sessionCount = sessions.length
  const bestScore = sessionCount > 0 ? Math.max(...sessions.map(s => s.score_pct)) : null
  const firstScore = sessionCount > 0 ? sessions[0].score_pct : null
  const improvement = bestScore !== null && firstScore !== null ? bestScore - firstScore : null

  let statusColor = '#6b7280'  // never played — gray
  let statusLabel = 'Not started'
  if (mastered) {
    statusColor = '#22c55e'
    statusLabel = 'Mastered ★'
  } else if (sessionCount > 0) {
    statusColor = '#eab308'
    statusLabel = 'In progress'
  }

  return (
    <div style={{ borderBottom: '1px solid #222', cursor: 'pointer' }}>
      {/* Collapsed row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 0',
        }}
      >
        {/* Beat name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#f9f9f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {beat.name}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{beat.difficulty}</div>
        </div>

        {/* Status badge */}
        <div style={{ fontSize: 11, color: statusColor, fontWeight: 600, whiteSpace: 'nowrap', width: 90, textAlign: 'right' }}>
          {statusLabel}
        </div>

        {/* Session count */}
        <div style={{ fontSize: 12, color: '#9ca3af', width: 60, textAlign: 'right' }}>
          {sessionCount > 0 ? `${sessionCount} session${sessionCount !== 1 ? 's' : ''}` : '—'}
        </div>

        {/* Best score */}
        <div style={{ fontSize: 12, color: '#9ca3af', width: 50, textAlign: 'right' }}>
          {bestScore !== null ? `${bestScore}%` : '—'}
        </div>

        {/* Sparkline */}
        <div style={{ width: 80, flexShrink: 0 }}>
          <Sparkline sessions={sessions} />
        </div>

        {/* Expand arrow */}
        <div style={{ color: '#6b7280', fontSize: 12, width: 16 }}>
          {sessionCount > 0 ? (expanded ? '▲' : '▼') : ''}
        </div>
      </div>

      {/* Expanded row */}
      {expanded && sessionCount > 0 && (
        <div style={{ padding: '0 0 16px 0' }}>
          {/* Stat pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[
              ['First Score', `${firstScore}%`],
              ['Best Score', `${bestScore}%`],
              ['Sessions', String(sessionCount)],
              ['Improvement', improvement !== null ? `+${improvement}%` : '—'],
              ['Mastery', '90% × 3 in a row'],
            ].map(([label, value]) => (
              <div key={label} style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
              }}>
                <span style={{ color: '#6b7280' }}>{label}: </span>
                <span style={{ color: '#f9f9f9', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Score % line graph */}
          <ScoreGraph sessions={sessions} />

          {/* Stacked breakdown bars */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>Tap breakdown per session</div>
            <BreakdownBars sessions={sessions} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ProgressTab ─────────────────────────────────────────────────────────────

export default function ProgressTab({ userEmail }: { userEmail: string | null | undefined }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [masteries, setMasteries] = useState<Mastery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userEmail) return
    fetch('/api/game/sessions')
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(data => {
        setSessions(data.sessions)
        setMasteries(data.masteries)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [userEmail])

  if (!userEmail) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
        <p style={{ marginBottom: 16 }}>Sign in to track your progress</p>
        <button
          onClick={() => signIn('google')}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ display: 'inline-block', width: 24, height: 24, border: '2px solid #333', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#ef4444' }}>
        Could not load your progress. Try refreshing.
      </div>
    )
  }

  const masterySet = new Set(masteries.map(m => m.beat_id))
  const sessionsByBeat: Record<string, Session[]> = {}
  for (const s of sessions) {
    if (!sessionsByBeat[s.beat_id]) sessionsByBeat[s.beat_id] = []
    sessionsByBeat[s.beat_id].push(s)
  }

  const masteredCount = masteries.length
  const inProgressCount = BEATS.filter(b => !masterySet.has(b.id) && (sessionsByBeat[b.id]?.length ?? 0) > 0).length
  const totalSessions = sessions.length

  // Academy CTA threshold
  const beginnerBeats = BEATS.filter(b => b.difficulty === 'beginner')
  const allBeginnersMastered = beginnerBeats.every(b => masterySet.has(b.id))
  const intermediateBeats = BEATS.filter(b => b.difficulty === 'intermediate')
  const intermediateMasteredCount = intermediateBeats.filter(b => masterySet.has(b.id)).length
  const showAcademyCTA = allBeginnersMastered && intermediateMasteredCount >= INTERMEDIATE_MASTERY_REQUIRED

  // Keep beats in the same order as the beat selection page (BEATS array order)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 24, padding: '16px 0', borderBottom: '1px solid #222', marginBottom: 16 }}>
        {[
          [`${masteredCount}`, 'Mastered'],
          [`${inProgressCount}`, 'In Progress'],
          [`${totalSessions}`, 'Total Sessions'],
        ].map(([value, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f9f9f9' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Academy CTA */}
      {showAcademyCTA && (
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #1a2a1a)',
          border: '1px solid #2563eb44',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 700, color: '#f9f9f9', fontSize: 14 }}>Your rhythm is real — you&apos;re ready for real lessons</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>You&apos;ve mastered the basics. Take it to the studio.</div>
          </div>
          <a
            href="/academy"
            style={{
              background: '#2563eb',
              color: '#fff',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            See Academy →
          </a>
        </div>
      )}

      {/* Beat rows */}
      <div>
        {BEATS.filter(b => b.difficulty !== 'advanced').map(beat => (
          <BeatRow
            key={beat.id}
            beat={beat}
            sessions={sessionsByBeat[beat.id] ?? []}
            mastered={masterySet.has(beat.id)}
          />
        ))}
      </div>
    </div>
  )
}

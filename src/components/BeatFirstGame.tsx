'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import * as Tone from 'tone'
import { type Beat, BEATS } from '@/lib/beats'
import ProgressTab from '@/components/ProgressTab'
import { useBeatFirstAudio } from '@/hooks/useBeatFirstAudio'
import { drawBeatWaveform, buildResultsDrawFn, clientToCanvasX, ratingColor } from '@/lib/beatfirst-canvas'
import {
  TOLERANCE, STEPS_PER_BAR, GAME_BARS, CANVAS_W, CANVAS_H, PLAYBACK_SCALE, WAVEFORM_CAPTURE_MS,
  type TapResult, type GamePhase,
} from '@/lib/beatfirst-constants'

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  user: { name?: string | null; email?: string | null; image?: string | null } | null
  unlockedCount?: number
}

// ─── Rhythm stat helpers ────────────────────────────────────────────────────

function feelLabel(meanMs: number): { label: string; color: string } {
  if (meanMs < -60) return { label: 'Rushing', color: '#ef4444' }
  if (meanMs < -20) return { label: 'On top', color: '#FDB515' }
  if (meanMs <= 20) return { label: 'Dead on', color: '#22c55e' }
  if (meanMs <= 80) return { label: 'In the pocket', color: '#22c55e' }
  return { label: 'Dragging', color: '#ef4444' }
}

function consistencyLabel(stdDev: number): { label: string; color: string } {
  if (stdDev <= 15) return { label: 'Locked in', color: '#22c55e' }
  if (stdDev <= 35) return { label: 'Solid', color: '#22c55e' }
  if (stdDev <= 60) return { label: 'Wobbly', color: '#FDB515' }
  return { label: 'Scattered', color: '#ef4444' }
}

type TierSpec = { label: string; active: boolean; color: string }

function feelTiers(meanMs: number): TierSpec[] {
  const active = meanMs < -60 ? 0 : meanMs < -20 ? 1 : meanMs <= 20 ? 2 : meanMs <= 80 ? 3 : 4
  return [
    { label: 'Rush',    active: active === 0, color: '#ef4444' },
    { label: 'On top',  active: active === 1, color: '#FDB515' },
    { label: 'Dead on', active: active === 2, color: '#22c55e' },
    { label: 'Pocket',  active: active === 3, color: '#22c55e' },
    { label: 'Drag',    active: active === 4, color: '#ef4444' },
  ]
}

function consistencyTiers(stdDev: number): TierSpec[] {
  const active = stdDev <= 15 ? 0 : stdDev <= 35 ? 1 : stdDev <= 60 ? 2 : 3
  return [
    { label: 'Locked',  active: active === 0, color: '#22c55e' },
    { label: 'Solid',   active: active === 1, color: '#22c55e' },
    { label: 'Wobbly',  active: active === 2, color: '#FDB515' },
    { label: 'Scatter', active: active === 3, color: '#ef4444' },
  ]
}

function feelPointerPct(meanMs: number): number {
  const bounds = [-120, -60, -20, 20, 80, 120]
  const idx = meanMs < -60 ? 0 : meanMs < -20 ? 1 : meanMs <= 20 ? 2 : meanMs <= 80 ? 3 : 4
  const lo = bounds[idx], hi = bounds[idx + 1]
  const within = Math.min(1, Math.max(0, (meanMs - lo) / (hi - lo)))
  return ((idx + within) / 5) * 100
}

function consistencyPointerPct(stdDev: number): number {
  const bounds = [0, 15, 35, 60, 90]
  const idx = stdDev <= 15 ? 0 : stdDev <= 35 ? 1 : stdDev <= 60 ? 2 : 3
  const lo = bounds[idx], hi = bounds[idx + 1]
  const within = Math.min(1, Math.max(0, (stdDev - lo) / (hi - lo)))
  return ((idx + within) / 4) * 100
}

function TierBar({ tiers, pointerPct }: { tiers: TierSpec[]; pointerPct: number }) {
  const clampedPct = Math.max(3, Math.min(97, pointerPct))
  return (
    <div className="mt-3">
      <div className="flex gap-[2px]">
        {tiers.map((t, i) => (
          <div
            key={i}
            className="flex-1 rounded text-center px-0.5 py-1"
            style={{
              backgroundColor: t.active ? t.color + '22' : '#0a0a0a',
              border: t.active ? `1px solid ${t.color}` : '1px solid #222',
            }}
          >
            <div
              className="text-[10px] font-semibold leading-tight"
              style={{ color: t.active ? t.color : 'var(--muted)' }}
            >
              {t.label}
            </div>
          </div>
        ))}
      </div>
      <div className="relative h-2 mt-1">
        <div
          className="absolute -translate-x-1/2 w-0 h-0"
          style={{
            left: `${clampedPct}%`,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: '6px solid var(--foreground)',
          }}
        />
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BeatFirstGame({ user, unlockedCount = 0 }: Props) {
  const [phase, setPhase] = useState<GamePhase>('select')
  const [selectedBeat, setSelectedBeat] = useState<Beat>(BEATS[0])
  const [countdown, setCountdown] = useState('')
  const [feedback, setFeedback] = useState('')
  const [results, setResults] = useState<TapResult[]>([])
  const [showSignIn, setShowSignIn] = useState(false)
  const [score, setScore] = useState({ hits: 0, total: 0, pct: 0 })
  const [rhythmStats, setRhythmStats] = useState<{ mean: number; stdDev: number } | null>(null)
  const [showMasteryBanner, setShowMasteryBanner] = useState(false)
  const [activeTab, setActiveTab] = useState<'play' | 'progress'>('play')
  const [isListening, setIsListening] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [playingProgress, setPlayingProgress] = useState(0)

  const playingDurationMs = selectedBeat.bars * STEPS_PER_BAR * (60000 / selectedBeat.bpm / 4)

  useEffect(() => {
    if (phase !== 'playing') {
      setPlayingProgress(0)
      return
    }
    setPlayingProgress(0)
    const t = setTimeout(() => setPlayingProgress(100), 20)
    return () => clearTimeout(t)
  }, [phase])

  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('tab') === 'progress') setActiveTab('progress')
  }, [searchParams])

  // Save ?ref=CODE to localStorage so it survives the OAuth redirect
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('beatfirst_ref', ref)
  }, [searchParams])

  // After sign-in, claim any pending referral code
  useEffect(() => {
    if (!user?.email) return
    const code = localStorage.getItem('beatfirst_ref')
    if (!code) return
    localStorage.removeItem('beatfirst_ref')
    fetch('/api/referral/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode: code }),
    }).catch(() => {})
  }, [user?.email])

  // Audio
  const {
    kickRef, snareRef, hihatRef, clapRef, clapFilterRef,
    bassRef, analyserRef, bassAnalyserRef, initAudio,
  } = useBeatFirstAudio()

  // Game state
  const animFrameRef   = useRef<number>(0)
  const startTimeRef   = useRef<number>(0)
  const userTapsRef    = useRef<number[]>([])
  const idealTimesRef  = useRef<number[]>([])
  const isPlayingRef   = useRef(false)
  const isPreviewRef   = useRef(false)

  // Waveform capture
  const waveformEnvelopeRef  = useRef<number[]>([])
  const waveformCaptureRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const peakOffsetMsRef      = useRef(0)

  // Timeline canvas (shared between playing + results phases)
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null)

  // Results zoom/pan
  const zoomRef       = useRef(1)
  const panMsRef      = useRef(0)
  const isDraggingRef = useRef(false)
  const dragStartRef  = useRef({ x: 0, panMs: 0 })
  const redrawResultsRef = useRef<(() => void) | null>(null)

  const difficultyBadge = (d: Beat['difficulty']) =>
    ({ beginner: '#22c55e', intermediate: '#FDB515', advanced: '#ef4444' })[d]

  // Pre-generate envelope for beats with bassline so waveform shows bassline pattern
  useEffect(() => {
    if (selectedBeat.bassline) {
      const stepMs = (60000 / selectedBeat.bpm) / 4
      const samples = Math.floor(stepMs / 10)
      waveformEnvelopeRef.current = Array.from({ length: samples }, (_, i) =>
        Math.exp(-i * 10 / 25)
      )
      peakOffsetMsRef.current = 0
    }
  }, [selectedBeat])

  // ── Playback timeline (rAF loop) ─────────────────────────────────────────

  const drawTimeline = useCallback(() => {
    const canvas = timelineCanvasRef.current
    if (!canvas || (!isPlayingRef.current && !isPreviewRef.current)) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const beat = selectedBeat
    const stepMs = (60000 / beat.bpm) / 4
    const elapsed = performance.now() - startTimeRef.current
    const scale = PLAYBACK_SCALE
    const centerY = H / 2
    const halfH = H / 2
    const playheadX = W / 2
    const viewStartMs = elapsed - playheadX / scale
    const viewEndMs = elapsed + (W - playheadX) / scale
    const envelope = waveformEnvelopeRef.current
    const maxAmp = Math.max(...envelope, 0.01)
    const peakOffsetMs = peakOffsetMsRef.current

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = '#1e1e1e'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(W, centerY); ctx.stroke()

    // Bar markers
    const beatMs = (60000 / beat.bpm)
    const barMs = beatMs * 4
    const firstBar = Math.floor(viewStartMs / barMs)
    const lastBar = Math.ceil(viewEndMs / barMs)
    const isPreview = isPreviewRef.current
    for (let b = firstBar; b <= lastBar; b++) {
      const x = (b * barMs - viewStartMs) * scale
      if (isPreview) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
        if (x >= 0 && x <= W) {
          const label = `Bar ${b + 1}`
          ctx.font = 'bold 10px monospace'
          const tw = ctx.measureText(label).width
          ctx.fillStyle = 'rgba(255,255,255,0.15)'
          ctx.beginPath()
          ctx.roundRect(x + 4, 4, tw + 8, 16, 3)
          ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          ctx.textAlign = 'left'
          ctx.fillText(label, x + 8, 16)
        }
      } else {
        ctx.strokeStyle = '#1a1a1a'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
        ctx.setLineDash([])
        if (x >= 0 && x <= W) {
          ctx.fillStyle = '#333'
          ctx.font = '9px monospace'
          ctx.textAlign = 'left'
          ctx.fillText(`Bar ${b + 1}`, x + 3, 10)
        }
      }
    }

    // Draw beat waveforms in view
    const totalSteps = isPreviewRef.current
      ? Math.ceil((viewEndMs + stepMs) / stepMs) + 1
      : GAME_BARS * STEPS_PER_BAR

    if (beat.bassline) {
      for (let i = 0; i < totalSteps; i++) {
        const s = i % STEPS_PER_BAR
        if (beat.bassline[s] === null) continue
        const beatOriginMs = i * stepMs
        if (beatOriginMs < viewStartMs || beatOriginMs > viewEndMs) continue
        const x = (beatOriginMs - viewStartMs) * scale
        const spikeH = halfH * 0.85
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(x, centerY - spikeH); ctx.lineTo(x, centerY + spikeH); ctx.stroke()
        ctx.fillStyle = 'rgba(253,181,21,0.5)'
        ctx.beginPath()
        ctx.moveTo(x, centerY - spikeH)
        ctx.lineTo(x + stepMs * scale * 0.5, centerY)
        ctx.lineTo(x, centerY)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(x, centerY + spikeH)
        ctx.lineTo(x + stepMs * scale * 0.5, centerY)
        ctx.lineTo(x, centerY)
        ctx.closePath()
        ctx.fill()
      }
    } else {
      for (let i = 0; i < totalSteps; i++) {
        const s = i % STEPS_PER_BAR
        if (!beat.taps[s]) continue
        const beatOriginMs = i * stepMs
        if (beatOriginMs + WAVEFORM_CAPTURE_MS < viewStartMs || beatOriginMs > viewEndMs) continue
        const beatOriginX = (beatOriginMs - viewStartMs) * scale
        drawBeatWaveform(ctx, beatOriginX, centerY, halfH, scale, envelope, maxAmp, peakOffsetMs, 1, stepMs)
      }
    }

    // User taps so far
    userTapsRef.current.forEach(tapMs => {
      const x = (tapMs - viewStartMs) * scale
      if (x < 0 || x > W) return
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(x, centerY + 4); ctx.lineTo(x, H - 4); ctx.stroke()
    })

    // Playhead
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(playheadX, 0); ctx.lineTo(playheadX, H); ctx.stroke()

    animFrameRef.current = requestAnimationFrame(drawTimeline)
  }, [selectedBeat])

  // ── Results useEffect: draw + wire zoom/pan ───────────────────────────────

  useEffect(() => {
    if (phase !== 'results') return
    const canvas = timelineCanvasRef.current
    if (!canvas) return

    const beat = selectedBeat
    const stepMs = (60000 / beat.bpm) / 4
    const totalMs = beat.bars * STEPS_PER_BAR * stepMs

    zoomRef.current = 1
    panMsRef.current = 0

    const draw = buildResultsDrawFn(
      canvas, beat, results,
      waveformEnvelopeRef.current, peakOffsetMsRef.current,
      zoomRef, panMsRef,
    )
    redrawResultsRef.current = draw
    draw()

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const fitScale = CANVAS_W / totalMs
      const mouseMs = panMsRef.current + clientToCanvasX(canvas, e.clientX) / (fitScale * zoomRef.current)
      const delta = e.deltaY > 0 ? 0.85 : 1.18
      zoomRef.current = Math.max(1, Math.min(30, zoomRef.current * delta))
      const newScale = fitScale * zoomRef.current
      panMsRef.current = mouseMs - clientToCanvasX(canvas, e.clientX) / newScale
      const maxPan = totalMs - CANVAS_W / newScale
      panMsRef.current = Math.max(0, Math.min(maxPan, panMsRef.current))
      draw()
    }

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      dragStartRef.current = { x: e.clientX, panMs: panMsRef.current }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const fitScale = CANVAS_W / totalMs
      const dxMs = (dragStartRef.current.x - e.clientX) / (fitScale * zoomRef.current)
        * (CANVAS_W / canvas.getBoundingClientRect().width)
      const newScale = fitScale * zoomRef.current
      const maxPan = totalMs - CANVAS_W / newScale
      panMsRef.current = Math.max(0, Math.min(maxPan, dragStartRef.current.panMs + dxMs))
      draw()
    }
    const onMouseUp = () => { isDraggingRef.current = false }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [phase, results, selectedBeat])

  // ── Enter preview ─────────────────────────────────────────────────────────

  const startPreview = useCallback(() => {
    userTapsRef.current = []
    isPlayingRef.current = false
    isPreviewRef.current = false
    waveformEnvelopeRef.current = []
    peakOffsetMsRef.current = 0
    setShowMasteryBanner(false)
    setShowSignIn(false)
    setIsListening(false)
    setPhase('preview')
  }, [])

  // ── Listen to beat pattern ────────────────────────────────────────────────

  const listenBeat = useCallback(async () => {
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    cancelAnimationFrame(animFrameRef.current)
    if (waveformCaptureRef.current) clearInterval(waveformCaptureRef.current)

    await initAudio()
    waveformEnvelopeRef.current = []
    peakOffsetMsRef.current = 0
    isPreviewRef.current = true

    const beat = selectedBeat
    setIsListening(true)

    setTimeout(() => {
      startTimeRef.current = performance.now()

      Tone.getTransport().bpm.value = beat.bpm
      Tone.getTransport().cancel()
      Tone.getTransport().position = 0

      let step = 0
      let capturedWaveform = waveformEnvelopeRef.current.length > 0

      Tone.getTransport().scheduleRepeat((time) => {
        const s = step % STEPS_PER_BAR
        if (beat.kick[s])  kickRef.current?.triggerAttackRelease('C1', '8n', time)
        if (beat.snare[s]) snareRef.current?.triggerAttackRelease('8n', time)
        if (beat.hihat[s]) hihatRef.current?.triggerAttackRelease('C6', '32n', time)
        if (beat.clap?.[s]) clapRef.current?.triggerAttackRelease('8n', time)
        const bassNote = beat.bassline?.[s]
        if (bassNote) bassRef.current?.triggerAttackRelease(bassNote, '16n', time)

        if (step === 0 && !capturedWaveform && analyserRef.current) {
          capturedWaveform = true
          waveformEnvelopeRef.current = []
          let elapsed = 0
          const activeAnalyser = beat.bassline ? bassAnalyserRef.current : analyserRef.current
          waveformCaptureRef.current = setInterval(() => {
            const data = activeAnalyser!.getValue() as Float32Array
            const amp = Math.max(...Array.from(data).map(Math.abs))
            waveformEnvelopeRef.current.push(amp)
            elapsed += 10
            if (elapsed >= WAVEFORM_CAPTURE_MS) {
              clearInterval(waveformCaptureRef.current!)
              const env = waveformEnvelopeRef.current
              const peakIdx = env.indexOf(Math.max(...env))
              peakOffsetMsRef.current = peakIdx * 10
            }
          }, 10)
        }

        step++
      }, '16n')

      Tone.getTransport().start()
      animFrameRef.current = requestAnimationFrame(drawTimeline)
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBeat, initAudio, drawTimeline])

  // ── Cancel preview ────────────────────────────────────────────────────────

  const cancelPreview = useCallback(() => {
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    cancelAnimationFrame(animFrameRef.current)
    if (waveformCaptureRef.current) clearInterval(waveformCaptureRef.current)
    isPlayingRef.current = false
    isPreviewRef.current = false
    setIsListening(false)
    setPhase('select')
  }, [])

  // ── Commit ready ──────────────────────────────────────────────────────────

  const commitReady = useCallback(() => {
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    cancelAnimationFrame(animFrameRef.current)
    if (waveformCaptureRef.current) clearInterval(waveformCaptureRef.current)
    isPlayingRef.current = false
    isPreviewRef.current = false
    setIsListening(false)
    setPhase('ready')
  }, [])

  // ── Static draw at t=0 when entering ready phase ──────────────────────────

  useEffect(() => {
    if (phase !== 'ready') return
    const canvas = timelineCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const beat = selectedBeat
    const stepMs = (60000 / beat.bpm) / 4
    const W = canvas.width, H = canvas.height
    const centerY = H / 2, halfH = H / 2
    const scale = PLAYBACK_SCALE
    const playheadX = W / 2
    const viewStartMs = -playheadX / scale
    const viewEndMs = (W - playheadX) / scale
    const envelope = waveformEnvelopeRef.current
    const maxAmp = Math.max(...envelope, 0.01)
    const peakOffsetMs = peakOffsetMsRef.current

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = '#1e1e1e'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(W, centerY); ctx.stroke()

    const barMs = beat.bpm ? (60000 / beat.bpm) * 4 : 2000
    const firstBar = Math.floor(viewStartMs / barMs)
    const lastBar = Math.ceil(viewEndMs / barMs)
    for (let b = firstBar; b <= lastBar; b++) {
      const x = (b * barMs - viewStartMs) * scale
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      ctx.setLineDash([])
      if (x >= 0 && x <= W) {
        ctx.fillStyle = '#333'
        ctx.font = '9px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`Bar ${b + 1}`, x + 3, 10)
      }
    }

    const totalSteps = GAME_BARS * STEPS_PER_BAR
    for (let i = 0; i < totalSteps; i++) {
      const s = i % STEPS_PER_BAR
      if (!(beat.bassline ? beat.bassline[s] !== null : !!beat.taps[s])) continue
      const beatOriginMs = i * stepMs
      if (beatOriginMs + WAVEFORM_CAPTURE_MS < viewStartMs || beatOriginMs > viewEndMs) continue
      const beatOriginX = (beatOriginMs - viewStartMs) * scale
      if (envelope.length >= 2) {
        drawBeatWaveform(ctx, beatOriginX, centerY, halfH, scale, envelope, maxAmp, peakOffsetMs, 1, stepMs)
      } else {
        ctx.strokeStyle = 'rgba(253,181,21,0.5)'
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(beatOriginX, 16); ctx.lineTo(beatOriginX, H - 16); ctx.stroke()
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(playheadX, 0); ctx.lineTo(playheadX, H); ctx.stroke()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedBeat])

  // ── Start game ────────────────────────────────────────────────────────────

  const startGame = useCallback(async () => {
    await initAudio()
    const beat = selectedBeat
    const stepMs = (60000 / beat.bpm) / 4
    const totalSteps = GAME_BARS * STEPS_PER_BAR
    const scoredStartStep = STEPS_PER_BAR

    const ideals: number[] = []
    for (let i = scoredStartStep; i < totalSteps; i++) {
      if (beat.taps[i % STEPS_PER_BAR]) ideals.push(i * stepMs)
    }
    idealTimesRef.current = ideals
    userTapsRef.current = []

    setPhase('countdown')
    setCountdown('3')
    isPreviewRef.current = true

    Tone.getTransport().bpm.value = beat.bpm
    Tone.getTransport().cancel()
    Tone.getTransport().position = 0
    startTimeRef.current = performance.now()

    setTimeout(() => setCountdown('2'),   4 * stepMs)
    setTimeout(() => setCountdown('1'),   8 * stepMs)
    setTimeout(() => setCountdown('GO!'), 12 * stepMs)
    setTimeout(() => {
      setCountdown('')
      setPhase('playing')
      isPreviewRef.current = false
      isPlayingRef.current = true
    }, STEPS_PER_BAR * stepMs)

    if (waveformEnvelopeRef.current.length === 0) {
      peakOffsetMsRef.current = 0
    }

    let step = 0
    let capturedWaveform = waveformEnvelopeRef.current.length > 0
    Tone.getTransport().scheduleRepeat((time) => {
      const s = step % STEPS_PER_BAR
      if (beat.kick[s])  kickRef.current?.triggerAttackRelease('C1', '8n', time)
      if (beat.snare[s]) snareRef.current?.triggerAttackRelease('8n', time)
      if (beat.hihat[s]) hihatRef.current?.triggerAttackRelease('C6', '32n', time)
      if (beat.clap?.[s]) clapRef.current?.triggerAttackRelease('8n', time)
      const bassNote = beat.bassline?.[s]
      if (bassNote) bassRef.current?.triggerAttackRelease(bassNote, '16n', time)

      if (step === 0 && !capturedWaveform && analyserRef.current) {
        capturedWaveform = true
        waveformEnvelopeRef.current = []
        let elapsed = 0
        const activeAnalyser = beat.bassline ? bassAnalyserRef.current : analyserRef.current
        waveformCaptureRef.current = setInterval(() => {
          const data = activeAnalyser!.getValue() as Float32Array
          const amp = Math.max(...Array.from(data).map(Math.abs))
          waveformEnvelopeRef.current.push(amp)
          elapsed += 10
          if (elapsed >= WAVEFORM_CAPTURE_MS) {
            clearInterval(waveformCaptureRef.current!)
            const env = waveformEnvelopeRef.current
            const peakIdx = env.indexOf(Math.max(...env))
            peakOffsetMsRef.current = peakIdx * 10
          }
        }, 10)
      }

      step++
      if (step >= totalSteps) {
        Tone.getTransport().stop()
        Tone.getTransport().cancel()
        isPlayingRef.current = false
        cancelAnimationFrame(animFrameRef.current)
        setTimeout(() => endGame(ideals, beat), 400)
      }
    }, '16n')

    Tone.getTransport().start()
    animFrameRef.current = requestAnimationFrame(drawTimeline)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBeat, initAudio, drawTimeline])

  // ── Handle tap ────────────────────────────────────────────────────────────

  const handleTap = useCallback(() => {
    if (!isPlayingRef.current) return
    userTapsRef.current.push(performance.now() - startTimeRef.current)
    setFeedback('Tap!')
    setTimeout(() => setFeedback(''), 200)
  }, [])

  // ── Spacebar ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleTap() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleTap])

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      if (waveformCaptureRef.current) clearInterval(waveformCaptureRef.current)
      Tone.getTransport().stop()
      Tone.getTransport().cancel()
    }
  }, [])

  // ── Analyze results ───────────────────────────────────────────────────────

  const endGame = (ideals: number[], beat: Beat) => {
    const taps = [...userTapsRef.current]
    const tol = TOLERANCE[beat.difficulty]
    const tapResults: TapResult[] = []

    // Order-preserving match: walk taps and ideals in parallel.
    // If a tap is too far past the current ideal → that ideal is a miss, advance ideal.
    // If a tap is too far before the current ideal → spurious tap, discard.
    // Otherwise → match and advance both.
    let ti = 0, ii = 0
    while (ti < taps.length && ii < ideals.length) {
      const tap = taps[ti]
      const ideal = ideals[ii]
      const diff = tap - ideal
      if (diff > tol) {
        tapResults.push({ beat: ii + 1, tapMs: 0, idealMs: ideal, diffMs: 0, offsetMs: 0, rating: 'miss' })
        ii++
      } else if (diff < -tol) {
        ti++
      } else {
        const absDiff = Math.abs(diff)
        const offset = diff - peakOffsetMsRef.current
        const rating = absDiff <= 50 ? 'perfect' : absDiff <= 150 ? 'good' : 'ok'
        tapResults.push({ beat: ii + 1, tapMs: tap, idealMs: ideal, diffMs: absDiff, offsetMs: offset, rating })
        ti++
        ii++
      }
    }
    while (ii < ideals.length) {
      tapResults.push({ beat: ii + 1, tapMs: 0, idealMs: ideals[ii], diffMs: 0, offsetMs: 0, rating: 'miss' })
      ii++
    }
    const hits = tapResults.filter(r => r.rating !== 'miss').length
    const pct = Math.round((hits / ideals.length) * 100)

    const perfect = tapResults.filter(r => r.rating === 'perfect').length
    const good    = tapResults.filter(r => r.rating === 'good').length
    const ok      = tapResults.filter(r => r.rating === 'ok').length
    const miss    = tapResults.filter(r => r.rating === 'miss').length

    const nonMissOffsets = tapResults.filter(r => r.rating !== 'miss').map(r => r.offsetMs)
    if (nonMissOffsets.length >= 3) {
      const mean = nonMissOffsets.reduce((a, b) => a + b, 0) / nonMissOffsets.length
      const variance = nonMissOffsets.reduce((s, o) => s + (o - mean) ** 2, 0) / nonMissOffsets.length
      setRhythmStats({ mean, stdDev: Math.sqrt(variance) })
    } else {
      setRhythmStats(null)
    }

    setScore({ hits, total: ideals.length, pct })
    setResults(tapResults)
    setPhase('results')

    if (user) {
      fetch('/api/game/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beat_id: beat.id, score_pct: pct, perfect, good, ok, miss }),
      })
        .then(res => res.json())
        .then(data => { if (data.mastered) setShowMasteryBanner(true) })
        .catch(() => { if (process.env.NODE_ENV === 'development') console.error('save-session failed') })
    }

    if (!user) setShowSignIn(true)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen pt-24 pb-16 px-4" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-2xl mx-auto">
        {/* ── Hero ── */}
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-primary)' }}>
            Rhythm Trainer
          </div>
          <h1
            className="font-black uppercase leading-none mb-4"
            style={{
              fontFamily: "var(--font-barlow-condensed), 'Arial Narrow', Arial, sans-serif",
              fontSize: 'clamp(2.5rem, 7vw, 4rem)',
              letterSpacing: '0.02em',
            }}
          >
            Rhythm Isn&apos;t Born.<br />It&apos;s Trained.
          </h1>
          <p className="text-lg mb-6 max-w-lg" style={{ color: 'var(--muted)' }}>
            Most people can&apos;t dance because nobody taught them rhythm. BeatFirst does.
          </p>
          <div className="flex flex-col gap-2">
            {[
              'Tap along to real beats — no instruments needed',
              'Track your accuracy and watch your timing improve',
              'Build the foundation every dance style runs on',
            ].map((point) => (
              <div key={point} className="flex items-start gap-3 text-sm" style={{ color: 'var(--muted)' }}>
                <span style={{ color: 'var(--accent-primary)', marginTop: 2 }}>→</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex mb-8" style={{ borderBottom: '1px solid #222' }}>
          {(['play', 'progress'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                marginBottom: -1,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: activeTab === tab ? '#fff' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {tab === 'play' ? 'Play' : 'My Progress'}
            </button>
          ))}
        </div>

        {/* ── Progress tab ── */}
        {activeTab === 'progress' && <ProgressTab userEmail={user?.email} />}

        {/* ── Play tab ── */}
        {activeTab === 'play' && <>

        {/* ── Beat Select ── */}
        {phase === 'select' && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>Choose a Beat</h2>
            <div className="flex flex-col gap-3 mb-6">
              {BEATS.filter(b => b.difficulty !== 'advanced').map((b, index) => {
                const isLocked = index >= (3 + unlockedCount)
                if (isLocked) {
                  return (
                    <div
                      key={b.id}
                      onClick={() => setShowUnlockModal(true)}
                      className="flex items-center justify-between px-4 py-3 rounded-lg border"
                      style={{ borderColor: '#1a1a1a', backgroundColor: '#0d0d0d', cursor: 'pointer' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium" style={{ color: '#444' }}>{b.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#333' }}>{b.bpm} BPM</div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full mr-3"
                        style={{ backgroundColor: '#1a1a1a', color: '#333' }}>
                        {b.difficulty}
                      </span>
                      <div className="px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2"
                        style={{ backgroundColor: '#1a1a1a', color: '#444', border: '1px solid #2a2a2a', flexShrink: 0 }}>
                        <span>🔒</span>
                        <span>Locked</span>
                      </div>
                    </div>
                  )
                }
                return (
                  <div
                    key={b.id}
                    onClick={() => { setSelectedBeat(b); waveformEnvelopeRef.current = [] }}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border"
                    style={{
                      borderColor: selectedBeat.id === b.id ? 'var(--accent-primary)' : '#2a2a2a',
                      backgroundColor: selectedBeat.id === b.id ? 'rgba(37,99,235,0.1)' : '#111',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{b.bpm} BPM</div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full mr-3"
                      style={{ backgroundColor: difficultyBadge(b.difficulty) + '22', color: difficultyBadge(b.difficulty) }}>
                      {b.difficulty}
                    </span>
                    <button
                      onClick={() => { setSelectedBeat(b); waveformEnvelopeRef.current = []; startPreview() }}
                      className="px-4 py-1.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: 'var(--accent-primary)', flexShrink: 0 }}
                    >
                      Play
                    </button>
                  </div>
                )
              })}
            </div>


            {user && <p className="text-center text-sm mt-4" style={{ color: 'var(--muted)' }}>Signed in as {user.name}</p>}
          </div>
        )}

        {/* ── Preview ── */}
        {phase === 'preview' && (
          <div className="flex flex-col items-center gap-4">
            {isListening && (
              <>
                <div className="w-full rounded-lg overflow-hidden" style={{ border: '1px solid #222' }}>
                  <canvas
                    ref={timelineCanvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    style={{ width: '100%', display: 'block', backgroundColor: '#0a0a0a' }}
                  />
                </div>
                <div className="flex justify-between w-full text-xs px-1" style={{ color: 'var(--muted)' }}>
                  <span>← past</span>
                  <span style={{ color: '#fff' }}>▶ now</span>
                  <span>future →</span>
                </div>
              </>
            )}
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={listenBeat}
                className="w-full py-4 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1a3a1a', border: '1px solid #22c55e', color: '#22c55e' }}
              >
                {isListening ? 'Listen Again' : 'Listen to Beat Pattern'}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={cancelPreview}
                  className="flex-1 py-4 rounded-full font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#1a1a1a', color: 'var(--foreground)', border: '1px solid #333' }}
                >
                  Cancel
                </button>
                <button
                  onClick={commitReady}
                  className="flex-[2] py-4 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  Ready
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Ready ── */}
        {phase === 'ready' && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm self-start" style={{ color: 'var(--muted)' }}>
              Bar 1 will cue you in — scoring starts on bar 2
            </p>
            <div className="w-full rounded-lg overflow-hidden" style={{ border: '1px solid #222' }}>
              <canvas
                ref={timelineCanvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ width: '100%', display: 'block', backgroundColor: '#0a0a0a' }}
              />
            </div>
            <div className="flex justify-between w-full text-xs px-1" style={{ color: 'var(--muted)' }}>
              <span>← past</span>
              <span style={{ color: '#fff' }}>▶ now</span>
              <span>future →</span>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setPhase('select')}
                className="flex-1 py-4 rounded-full font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1a1a1a', color: 'var(--foreground)', border: '1px solid #333' }}
              >
                Back
              </button>
              <button
                onClick={startGame}
                className="flex-[2] py-4 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                Go
              </button>
            </div>
          </div>
        )}

        {/* ── Countdown ── */}
        {phase === 'countdown' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                <span>Round progress</span>
                <span>{selectedBeat.bars} bars · {selectedBeat.bpm} BPM</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#222' }}>
                <div className="h-full" style={{ width: '0%', backgroundColor: 'var(--accent-primary)' }} />
              </div>
            </div>
            <div className="w-full rounded-lg overflow-hidden" style={{ border: '1px solid #222', position: 'relative' }}>
              <canvas
                ref={timelineCanvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ width: '100%', display: 'block', backgroundColor: '#0a0a0a' }}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span className="text-7xl font-bold" style={{ color: 'var(--accent-primary)', textShadow: '0 0 30px rgba(37,99,235,0.5)' }}>
                  {countdown}
                </span>
              </div>
            </div>
            <div className="flex justify-between w-full text-xs px-1" style={{ color: 'var(--muted)' }}>
              <span>← past</span>
              <span style={{ color: '#fff' }}>▶ now</span>
              <span>future →</span>
            </div>
            <div className="h-6" />
            <button
              onPointerDown={handleTap}
              className="w-full max-w-xs py-6 rounded-2xl font-bold text-2xl text-white select-none active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--accent-primary)', touchAction: 'none', opacity: 0.5 }}
            >
              TAP
            </button>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              or press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#222' }}>Space</kbd>
            </p>
          </div>
        )}

        {/* ── Playing ── */}
        {phase === 'playing' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                <span>Round progress</span>
                <span>{selectedBeat.bars} bars · {selectedBeat.bpm} BPM</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#222' }}>
                <div
                  className="h-full"
                  style={{
                    width: `${playingProgress}%`,
                    backgroundColor: 'var(--accent-primary)',
                    transition: `width ${playingDurationMs}ms linear`,
                  }}
                />
              </div>
            </div>
            <div className="w-full rounded-lg overflow-hidden" style={{ border: '1px solid #222' }}>
              <canvas
                ref={timelineCanvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ width: '100%', display: 'block', backgroundColor: '#0a0a0a' }}
              />
            </div>
            <div className="flex justify-between w-full text-xs px-1" style={{ color: 'var(--muted)' }}>
              <span>← past</span>
              <span style={{ color: '#fff' }}>▶ now</span>
              <span>future →</span>
            </div>
            <div className="h-6 text-lg font-medium" style={{ color: '#22c55e' }}>{feedback}</div>
            <button
              onPointerDown={handleTap}
              className="w-full max-w-xs py-6 rounded-2xl font-bold text-2xl text-white select-none active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--accent-primary)', touchAction: 'none' }}
            >
              TAP
            </button>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              or press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#222' }}>Space</kbd>
            </p>
          </div>
        )}

        {/* ── Results ── */}
        {phase === 'results' && (
          <div>
            <div className="text-center mb-6">
              <div className="text-6xl font-bold mb-1"
                style={{ color: score.pct >= 80 ? '#22c55e' : score.pct >= 50 ? '#FDB515' : '#ef4444' }}>
                {score.pct}%
              </div>
              <div style={{ color: 'var(--muted)' }}>{score.hits} / {score.total} beats hit</div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{selectedBeat.name} · {selectedBeat.bpm} BPM</div>
            </div>

            {showMasteryBanner && (
              <div className="mb-6 p-4 rounded-xl text-center" style={{ backgroundColor: '#0f2a0f', border: '1px solid #22c55e' }}>
                <div className="text-3xl mb-1">★</div>
                <p className="font-bold text-lg mb-1" style={{ color: '#22c55e' }}>Beat Mastered!</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>3 rounds at 90%+ — you&apos;ve locked in {selectedBeat.name}</p>
              </div>
            )}

            {showSignIn && (
              <div className="mb-6 p-4 rounded-xl text-center" style={{ backgroundColor: '#111', border: '1px solid #2563EB' }}>
                <p className="font-semibold mb-1">To save your score & unlock tutorials</p>
                <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>Sign in with Google — it&apos;s free</p>
                <button
                  onClick={() => signIn('google')}
                  className="px-6 py-2 rounded-full font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  Sign in with Google
                </button>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
                Full Round Timeline
              </h3>
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                Yellow = kick waveform · Blue = perfect (peak) · Colored lines = your taps · X = miss
              </p>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #222', cursor: 'grab' }}>
                <canvas
                  ref={timelineCanvasRef}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  style={{ width: '100%', display: 'block', backgroundColor: '#0a0a0a' }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1 px-1" style={{ color: 'var(--muted)' }}>
                <span>Start</span>
                <span>scroll wheel = zoom · drag = pan</span>
                <span>End</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs flex-wrap" style={{ color: 'var(--muted)' }}>
                {(['perfect','good','ok','miss'] as const).map(r => (
                  <span key={r} className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ratingColor(r) }} />
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {rhythmStats && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
                  Your Rhythm
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#111', border: '1px solid #222' }}>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                      Average Timing
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      {rhythmStats.mean >= 0 ? '+' : ''}{Math.round(rhythmStats.mean)}
                      <span className="text-base font-normal ml-1" style={{ color: 'var(--muted)' }}>ms</span>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: feelLabel(rhythmStats.mean).color }}>
                      {feelLabel(rhythmStats.mean).label}
                    </div>
                    <TierBar tiers={feelTiers(rhythmStats.mean)} pointerPct={feelPointerPct(rhythmStats.mean)} />
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#111', border: '1px solid #222' }}>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                      Consistency
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      ±{Math.round(rhythmStats.stdDev)}
                      <span className="text-base font-normal ml-1" style={{ color: 'var(--muted)' }}>ms</span>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: consistencyLabel(rhythmStats.stdDev).color }}>
                      {consistencyLabel(rhythmStats.stdDev).label}
                    </div>
                    <TierBar tiers={consistencyTiers(rhythmStats.stdDev)} pointerPct={consistencyPointerPct(rhythmStats.stdDev)} />
                  </div>
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
                  Tight clusters beat random scatter — even slightly behind the beat is good, as long as you&apos;re consistent. That&apos;s what rhythm is.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={startPreview}
                className="w-full py-3 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                Play Again
              </button>
              <button
                onClick={() => { setPhase('select'); setResults([]); setShowSignIn(false); setRhythmStats(null) }}
                className="w-full py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1a1a1a', color: 'var(--foreground)', border: '1px solid #333' }}
              >
                Choose a Different Beat
              </button>
            </div>
          </div>
        )}

        </> /* end play tab */}
      </div>

      {/* ── Unlock Modal ── */}
      {showUnlockModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowUnlockModal(false); setInviteSent(false); setInviteEmail(''); setInviteError('') } }}
        >
          <div style={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent-primary)' }}>
              Unlock Beat Pattern
            </div>
            <h2 className="text-2xl font-bold mb-3">Invite a friend. Get a new beat.</h2>

            {!user ? (
              <>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  Log in first so we know which account to unlock the pattern for.
                </p>
                <button
                  onClick={() => signIn('google')}
                  className="w-full py-3 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  Sign in with Google
                </button>
              </>
            ) : inviteSent ? (
              <>
                <div className="p-4 rounded-xl mb-6 text-center" style={{ backgroundColor: '#0f2a0f', border: '1px solid #22c55e' }}>
                  <div className="text-2xl mb-1">✓</div>
                  <p className="font-semibold" style={{ color: '#22c55e' }}>Invite sent!</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                    Once {inviteEmail} signs up and completes a beat with 50%+, your next pattern unlocks.
                  </p>
                </div>
                <button
                  onClick={() => { setInviteSent(false); setInviteEmail('') }}
                  className="w-full py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#1a1a1a', color: 'var(--foreground)', border: '1px solid #333' }}
                >
                  Invite Another Friend
                </button>
              </>
            ) : (
              <>
                <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  Send an invite to a friend. When they sign up and complete any beat pattern with a 50%+ score, you unlock the next beat pattern.
                </p>
                <p className="text-xs mb-6" style={{ color: '#444' }}>
                  {3 - unlockedCount} pattern{3 - unlockedCount !== 1 ? 's' : ''} left to unlock
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder="friend@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ backgroundColor: '#0a0a0a', border: '1px solid #2a2a2a', color: 'var(--foreground)', outline: 'none' }}
                  />
                  <button
                    onClick={async () => {
                      if (!inviteEmail.includes('@') || !user?.email) return
                      setInviteLoading(true)
                      setInviteError('')
                      try {
                        const res = await fetch('/api/referral/invite', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ referrerEmail: user.email, referredEmail: inviteEmail }),
                        })
                        if (res.ok) {
                          setInviteSent(true)
                        } else {
                          const data = await res.json()
                          setInviteError(data.error ?? 'Something went wrong')
                        }
                      } catch {
                        setInviteError('Network error — please try again')
                      } finally {
                        setInviteLoading(false)
                      }
                    }}
                    disabled={inviteLoading}
                    className="w-full py-3 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: 'var(--accent-primary)', opacity: inviteEmail.includes('@') && !inviteLoading ? 1 : 0.4 }}
                  >
                    {inviteLoading ? 'Sending…' : 'Send Invite'}
                  </button>
                  {inviteError && (
                    <p style={{ color: '#f87171', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem' }}>{inviteError}</p>
                  )}
                </div>
              </>
            )}

            <button
              onClick={() => { setShowUnlockModal(false); setInviteSent(false); setInviteEmail(''); setInviteError('') }}
              className="w-full py-2 rounded-full text-sm mt-4 transition-opacity hover:opacity-90"
              style={{ color: '#444' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </main>
  )
}

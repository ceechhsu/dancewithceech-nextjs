'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import * as Tone from 'tone'
import { type Beat, BEATS } from '@/lib/beats'
import ProgressTab from '@/components/ProgressTab'

// ─── Constants ───────────────────────────────────────────────────────────────

const TOLERANCE = { beginner: 300, intermediate: 200, advanced: 100 }
const STEPS_PER_BAR = 16
const GAME_BARS = 9      // 1 countdown bar + 8 scored bars
const CANVAS_W = 560
const CANVAS_H = 120
const PLAYBACK_SCALE = 0.18 // px/ms — shows ~3.1 seconds at a time

// ─── Types ───────────────────────────────────────────────────────────────────

type TapResult = {
  beat: number
  tapMs: number
  idealMs: number
  diffMs: number
  offsetMs: number  // signed: negative = early, positive = late
  rating: 'perfect' | 'good' | 'ok' | 'miss'
}

type GamePhase = 'select' | 'preview' | 'ready' | 'countdown' | 'playing' | 'results'

type Props = { user: { name?: string | null; email?: string | null; image?: string | null } | null }

// ─── Component ───────────────────────────────────────────────────────────────

export default function BeatFirstGame({ user }: Props) {
  const [phase, setPhase] = useState<GamePhase>('select')
  const [selectedBeat, setSelectedBeat] = useState<Beat>(BEATS[0])
  const [countdown, setCountdown] = useState('')
  const [feedback, setFeedback] = useState('')
  const [results, setResults] = useState<TapResult[]>([])
  const [showSignIn, setShowSignIn] = useState(false)
  const [score, setScore] = useState({ hits: 0, total: 0, pct: 0 })
  const [showMasteryBanner, setShowMasteryBanner] = useState(false)
  const [activeTab, setActiveTab] = useState<'play' | 'progress'>('play')
  const [isListening, setIsListening] = useState(false)

  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('tab') === 'progress') setActiveTab('progress')
  }, [searchParams])

  // Audio
  const kickRef    = useRef<Tone.MembraneSynth | null>(null)
  const snareRef   = useRef<Tone.NoiseSynth | null>(null)
  const hihatRef   = useRef<Tone.MetalSynth | null>(null)
  const clapRef    = useRef<Tone.NoiseSynth | null>(null)
  const clapFilterRef = useRef<Tone.Filter | null>(null)
  const bassRef        = useRef<Tone.MonoSynth | null>(null)
  const analyserRef    = useRef<Tone.Analyser | null>(null)
  const bassAnalyserRef = useRef<Tone.Analyser | null>(null)

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
  const zoomRef       = useRef(1)       // 1 = fit-all, higher = zoomed in
  const panMsRef      = useRef(0)       // left edge of view in ms
  const isDraggingRef = useRef(false)
  const dragStartRef  = useRef({ x: 0, panMs: 0 })
  const redrawResultsRef = useRef<(() => void) | null>(null)

  // Pre-generate envelope for beats with bassline so waveform shows bassline pattern
  useEffect(() => {
    if (selectedBeat.bassline) {
      const stepMs = (60000 / selectedBeat.bpm) / 4
      const samples = Math.floor(stepMs / 10) // one 16th note worth of samples
      waveformEnvelopeRef.current = Array.from({ length: samples }, (_, i) =>
        Math.exp(-i * 10 / 25)
      )
      peakOffsetMsRef.current = 0
    }
  }, [selectedBeat])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const ratingColor = (r: TapResult['rating']) =>
    ({ perfect: '#22c55e', good: '#86efac', ok: '#FDB515', miss: '#ef4444' })[r]

  const difficultyBadge = (d: Beat['difficulty']) =>
    ({ beginner: '#22c55e', intermediate: '#FDB515', advanced: '#ef4444' })[d]

  // Convert canvas clientX to canvas pixel X (accounts for CSS scaling)
  const clientToCanvasX = (canvas: HTMLCanvasElement, clientX: number) => {
    const rect = canvas.getBoundingClientRect()
    return (clientX - rect.left) * (canvas.width / rect.width)
  }

  // ── Audio init ───────────────────────────────────────────────────────────

  const initAudio = useCallback(async () => {
    await Tone.start()
    analyserRef.current = new Tone.Analyser('waveform', 512)

    kickRef.current = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 6,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
    }).toDestination()
    kickRef.current.volume.value = 6
    kickRef.current.connect(analyserRef.current)

    snareRef.current = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
    }).toDestination()
    snareRef.current.volume.value = -4
    snareRef.current.connect(analyserRef.current)

    hihatRef.current = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
    }).toDestination()
    hihatRef.current.volume.value = -12
    hihatRef.current.connect(analyserRef.current)

    clapFilterRef.current = new Tone.Filter(1800, 'bandpass').toDestination()
    clapFilterRef.current.connect(analyserRef.current)
    clapRef.current = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 },
    })
    clapRef.current.connect(clapFilterRef.current)
    clapRef.current.volume.value = 6

    bassAnalyserRef.current = new Tone.Analyser('waveform', 512)
    bassRef.current = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.04 },
      filter: { Q: 3, type: 'lowpass', rolloff: -24 },
      filterEnvelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.04, baseFrequency: 300, octaves: 2 },
    }).toDestination()
    bassRef.current.volume.value = 8
    bassRef.current.connect(analyserRef.current)
    bassRef.current.connect(bassAnalyserRef.current)
  }, [])

  // ── Draw waveform shape for one beat ─────────────────────────────────────

  const drawBeatWaveform = (
    ctx: CanvasRenderingContext2D,
    beatOriginX: number,   // x = onset trigger time
    centerY: number,
    halfH: number,
    scale: number,         // px/ms
    envelope: number[],
    maxAmp: number,
    peakOffsetMs: number,
    alpha = 1,
    stepMs = 200,          // cap zones to fit within one step
  ) => {
    if (envelope.length < 2) return
    ctx.save()
    ctx.globalAlpha = alpha

    // Color zones centered on the perfect (peak) position
    // Cap at 70% of stepMs so zones never bleed into adjacent steps
    const yellowMs = Math.min(150, stepMs * 0.7)
    const blueMs   = Math.min(50,  stepMs * 0.3)
    const perfectX = beatOriginX + peakOffsetMs * scale
    ctx.fillStyle = 'rgba(253,181,21,0.12)'
    ctx.fillRect(perfectX - yellowMs * scale, 0, yellowMs * 2 * scale, centerY * 2)
    ctx.fillStyle = 'rgba(37,99,235,0.25)'
    ctx.fillRect(perfectX - blueMs * scale, 0, blueMs * 2 * scale, centerY * 2)

    // Build top path (positive side)
    const topPoints: [number, number][] = []
    const botPoints: [number, number][] = []
    for (let j = 0; j < envelope.length; j++) {
      const x = beatOriginX + j * 10 * scale
      const amp = (envelope[j] / maxAmp) * halfH * 0.85
      topPoints.push([x, centerY - amp])
      botPoints.push([x, centerY + amp])
    }

    // Filled shape
    ctx.beginPath()
    ctx.moveTo(topPoints[0][0], centerY)
    topPoints.forEach(([x, y]) => ctx.lineTo(x, y))
    for (let j = botPoints.length - 1; j >= 0; j--) ctx.lineTo(botPoints[j][0], botPoints[j][1])
    ctx.closePath()
    ctx.fillStyle = 'rgba(253,181,21,0.2)'
    ctx.fill()

    // Outline (top only for clarity)
    ctx.beginPath()
    ctx.moveTo(topPoints[0][0], centerY)
    topPoints.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.strokeStyle = '#FDB515'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    botPoints.forEach(([x, y], j) => j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
    ctx.strokeStyle = 'rgba(253,181,21,0.4)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Perfect line at peak
    ctx.strokeStyle = '#2563EB'
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(perfectX, 6); ctx.lineTo(perfectX, centerY * 2 - 6); ctx.stroke()

    ctx.restore()
  }

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

    // Centre baseline
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
        // Bright solid bar-start line during preview
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
        if (x >= 0 && x <= W) {
          // Pill label
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

    // Draw beat waveforms in view (infinite during preview, 9 bars during game)
    const totalSteps = isPreviewRef.current
      ? Math.ceil((viewEndMs + stepMs) / stepMs) + 1
      : GAME_BARS * STEPS_PER_BAR

    if (beat.bassline) {
      // Bassline beat: draw clean spikes only at exact bassline hit positions
      for (let i = 0; i < totalSteps; i++) {
        const s = i % STEPS_PER_BAR
        if (beat.bassline[s] === null) continue
        const beatOriginMs = i * stepMs
        if (beatOriginMs < viewStartMs || beatOriginMs > viewEndMs) continue
        const x = (beatOriginMs - viewStartMs) * scale
        const spikeH = halfH * 0.85
        // Blue marker line
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(x, centerY - spikeH); ctx.lineTo(x, centerY + spikeH); ctx.stroke()
        // Amber filled triangle (top)
        ctx.fillStyle = 'rgba(253,181,21,0.5)'
        ctx.beginPath()
        ctx.moveTo(x, centerY - spikeH)
        ctx.lineTo(x + stepMs * scale * 0.5, centerY)
        ctx.lineTo(x, centerY)
        ctx.closePath()
        ctx.fill()
        // Amber filled triangle (bottom)
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
        if (beatOriginMs + 500 < viewStartMs || beatOriginMs > viewEndMs) continue
        const beatOriginX = (beatOriginMs - viewStartMs) * scale
        drawBeatWaveform(ctx, beatOriginX, centerY, halfH, scale, envelope, maxAmp, peakOffsetMs, 1, stepMs)
      }
    }

    // User taps so far (as vertical marks below centreline)
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

  // ── Results timeline draw ─────────────────────────────────────────────────

  const buildResultsDrawFn = useCallback((
    canvas: HTMLCanvasElement,
    beat: Beat,
    tapResults: TapResult[],
  ) => {
    const stepMs = (60000 / beat.bpm) / 4
    const totalMs = beat.bars * STEPS_PER_BAR * stepMs
    const envelope = waveformEnvelopeRef.current
    const maxAmp = Math.max(...envelope, 0.01)
    const peakOffsetMs = peakOffsetMsRef.current
    const W = canvas.width, H = canvas.height
    const centerY = H / 2, halfH = H / 2

    return () => {
      const ctx = canvas.getContext('2d')!
      const fitScale = W / totalMs
      const scale = fitScale * zoomRef.current
      const panMs = panMsRef.current
      const msToX = (ms: number) => (ms - panMs) * scale

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, W, H)

      // Centre baseline
      ctx.strokeStyle = '#1e1e1e'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(W, centerY); ctx.stroke()

      // Bar markers
      const barMs = (60000 / beat.bpm) * 4
      for (let b = 0; b <= beat.bars; b++) {
        const x = msToX(b * barMs)
        if (x < -10 || x > W + 10) continue
        ctx.strokeStyle = '#1a1a1a'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#333'
        ctx.font = '9px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`B${b + 1}`, x + 2, 10)
      }

      // Beat waveforms
      const totalSteps = beat.bars * STEPS_PER_BAR
      for (let i = 0; i < totalSteps; i++) {
        const s = i % STEPS_PER_BAR
        if (!(beat.bassline ? beat.bassline[s] !== null : !!beat.taps[s])) continue
        const beatOriginMs = i * stepMs
        const beatOriginX = msToX(beatOriginMs)
        const endX = msToX(beatOriginMs + 500)
        if (endX < 0 || beatOriginX > W) continue
        drawBeatWaveform(ctx, beatOriginX, centerY, halfH, scale, envelope, maxAmp, peakOffsetMs, 0.85, stepMs)
      }

      // User tap lines + offset labels
      tapResults.forEach(r => {
        if (r.rating === 'miss') return
        const x = msToX(r.tapMs)
        if (x < 0 || x > W) return
        const color = ratingColor(r.rating)

        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.85
        ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, H - 4); ctx.stroke()
        ctx.globalAlpha = 1

        // Offset label
        const label = `${r.offsetMs >= 0 ? '+' : ''}${Math.round(r.offsetMs)}ms`
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = color
        ctx.globalAlpha = 0.9
        ctx.fillText(label, x, H - 6)
        ctx.globalAlpha = 1
      })

      // Miss markers (X at ideal position)
      tapResults.forEach(r => {
        if (r.rating !== 'miss') return
        const x = msToX(r.idealMs + peakOffsetMs)
        if (x < 0 || x > W) return
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.5
        const s = 5
        ctx.beginPath()
        ctx.moveTo(x - s, centerY - s); ctx.lineTo(x + s, centerY + s)
        ctx.moveTo(x + s, centerY - s); ctx.lineTo(x - s, centerY + s)
        ctx.stroke()
        ctx.globalAlpha = 1
      })

      // Zoom hint
      if (zoomRef.current === 1) {
        ctx.fillStyle = '#333'
        ctx.font = '9px monospace'
        ctx.textAlign = 'right'
        ctx.fillText('scroll to zoom · drag to pan', W - 6, H - 4)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    const draw = buildResultsDrawFn(canvas, beat, results)
    redrawResultsRef.current = draw
    draw()

    // Wheel → zoom centered on mouse position
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const fitScale = CANVAS_W / totalMs
      const mouseMs = panMsRef.current + clientToCanvasX(canvas, e.clientX) / (fitScale * zoomRef.current)
      const delta = e.deltaY > 0 ? 0.85 : 1.18
      zoomRef.current = Math.max(1, Math.min(30, zoomRef.current * delta))
      // Keep mouseMs under cursor
      const newScale = fitScale * zoomRef.current
      panMsRef.current = mouseMs - clientToCanvasX(canvas, e.clientX) / newScale
      // Clamp pan
      const maxPan = totalMs - CANVAS_W / newScale
      panMsRef.current = Math.max(0, Math.min(maxPan, panMsRef.current))
      draw()
    }

    // Drag → pan
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
  }, [phase, results, selectedBeat, buildResultsDrawFn])

  // ── Enter preview (no audio yet) ─────────────────────────────────────────

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

  // ── Listen to beat pattern (starts audio loop) ────────────────────────────

  const listenBeat = useCallback(async () => {
    // Stop any existing audio first
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    cancelAnimationFrame(animFrameRef.current)
    if (waveformCaptureRef.current) clearInterval(waveformCaptureRef.current)

    await initAudio()
    waveformEnvelopeRef.current = []
    peakOffsetMsRef.current = 0
    isPreviewRef.current = true

    const beat = selectedBeat
    setIsListening(true) // mount canvas first, then start Transport next tick

    setTimeout(() => {
    startTimeRef.current = performance.now()

    Tone.getTransport().bpm.value = beat.bpm
    Tone.getTransport().cancel()
    Tone.getTransport().position = 0

    let step = 0
    let capturedWaveform = waveformEnvelopeRef.current.length > 0 // skip if pre-generated (e.g. bassline beats)

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
          if (elapsed >= 500) {
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
    }, 0) // wait one tick for React to mount the canvas
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBeat, initAudio, drawTimeline])

  // ── Cancel preview ───────────────────────────────────────────────────────

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

  // ── Commit ready — stop preview, show static canvas + Go button ─────────

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

  // ── Static draw at t=0 when entering ready phase ──────────────────────

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
      if (beatOriginMs + 500 < viewStartMs || beatOriginMs > viewEndMs) continue
      const beatOriginX = (beatOriginMs - viewStartMs) * scale
      if (envelope.length >= 2) {
        drawBeatWaveform(ctx, beatOriginX, centerY, halfH, scale, envelope, maxAmp, peakOffsetMs, 1, stepMs)
      } else {
        // Fallback: simple beat marker line
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

  // ── Start game (Go button) — 9 bars, bar 1 = countdown, bars 2–9 = scored

  const startGame = useCallback(async () => {
    await initAudio() // ensure synths exist even if user skipped Listen
    const beat = selectedBeat
    const stepMs = (60000 / beat.bpm) / 4
    const totalSteps = GAME_BARS * STEPS_PER_BAR
    const scoredStartStep = STEPS_PER_BAR // bar 2 onwards

    const ideals: number[] = []
    for (let i = scoredStartStep; i < totalSteps; i++) {
      if (beat.taps[i % STEPS_PER_BAR]) ideals.push(i * stepMs)
    }
    idealTimesRef.current = ideals
    userTapsRef.current = []

    setPhase('countdown')
    setCountdown('3')
    isPreviewRef.current = true // bar markers visible during countdown bar

    Tone.getTransport().bpm.value = beat.bpm
    Tone.getTransport().cancel()
    Tone.getTransport().position = 0
    startTimeRef.current = performance.now()

    // Countdown number overlays on each beat of bar 1
    setTimeout(() => setCountdown('2'),   4 * stepMs)
    setTimeout(() => setCountdown('1'),   8 * stepMs)
    setTimeout(() => setCountdown('GO!'), 12 * stepMs)
    setTimeout(() => {
      setCountdown('')
      setPhase('playing')
      isPreviewRef.current = false
      isPlayingRef.current = true
    }, STEPS_PER_BAR * stepMs)

    // If user skipped Listen, reset envelope so capture runs fresh in the transport
    if (waveformEnvelopeRef.current.length === 0) {
      peakOffsetMsRef.current = 0
    }

    let step = 0
    let capturedWaveform = waveformEnvelopeRef.current.length > 0 // skip if already captured
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
          if (elapsed >= 500) {
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

  // ── Handle tap ───────────────────────────────────────────────────────────

  const handleTap = useCallback(() => {
    if (!isPlayingRef.current) return
    userTapsRef.current.push(performance.now() - startTimeRef.current)
    setFeedback('Tap!')
    setTimeout(() => setFeedback(''), 200)
  }, [])

  // ── Spacebar ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleTap() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleTap])

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      if (waveformCaptureRef.current) clearInterval(waveformCaptureRef.current)
      Tone.getTransport().stop()
      Tone.getTransport().cancel()
      kickRef.current?.dispose()
      snareRef.current?.dispose()
      hihatRef.current?.dispose()
      clapRef.current?.dispose()
      clapFilterRef.current?.dispose()
      analyserRef.current?.dispose()
    }
  }, [])

  // ── Analyze results ──────────────────────────────────────────────────────

  const endGame = (ideals: number[], beat: Beat) => {
    const taps = [...userTapsRef.current]
    const tol = TOLERANCE[beat.difficulty]
    const matched = new Set<number>()
    const tapResults: TapResult[] = []

    taps.forEach(tap => {
      let bestDiff = Infinity, bestIdx = -1
      ideals.forEach((ideal, i) => {
        if (!matched.has(i) && Math.abs(tap - ideal) < bestDiff) {
          bestDiff = Math.abs(tap - ideal); bestIdx = i
        }
      })
      if (bestIdx === -1) return
      matched.add(bestIdx)
      const offset = tap - ideals[bestIdx] - peakOffsetMsRef.current
      const rating = bestDiff <= 50 ? 'perfect' : bestDiff <= 150 ? 'good' : bestDiff <= tol ? 'ok' : 'miss'
      tapResults.push({ beat: bestIdx + 1, tapMs: tap, idealMs: ideals[bestIdx], diffMs: bestDiff, offsetMs: offset, rating })
    })

    ideals.forEach((ideal, i) => {
      if (!matched.has(i))
        tapResults.push({ beat: i + 1, tapMs: 0, idealMs: ideal, diffMs: 0, offsetMs: 0, rating: 'miss' })
    })

    tapResults.sort((a, b) => a.beat - b.beat)
    const hits = tapResults.filter(r => r.rating !== 'miss').length
    const pct = Math.round((hits / ideals.length) * 100)

    const perfect = tapResults.filter(r => r.rating === 'perfect').length
    const good    = tapResults.filter(r => r.rating === 'good').length
    const ok      = tapResults.filter(r => r.rating === 'ok').length
    const miss    = tapResults.filter(r => r.rating === 'miss').length

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
            <div className="flex flex-col gap-3 mb-8">
              {BEATS.filter(b => b.difficulty !== 'advanced').map(b => (
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
              ))}
            </div>
            {user && <p className="text-center text-sm mt-3" style={{ color: 'var(--muted)' }}>Signed in as {user.name}</p>}
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
            {/* Score */}
            <div className="text-center mb-6">
              <div className="text-6xl font-bold mb-1"
                style={{ color: score.pct >= 80 ? '#22c55e' : score.pct >= 50 ? '#FDB515' : '#ef4444' }}>
                {score.pct}%
              </div>
              <div style={{ color: 'var(--muted)' }}>{score.hits} / {score.total} beats hit</div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{selectedBeat.name} · {selectedBeat.bpm} BPM</div>
            </div>

            {/* Mastery banner */}
            {showMasteryBanner && (
              <div className="mb-6 p-4 rounded-xl text-center" style={{ backgroundColor: '#0f2a0f', border: '1px solid #22c55e' }}>
                <div className="text-3xl mb-1">★</div>
                <p className="font-bold text-lg mb-1" style={{ color: '#22c55e' }}>Beat Mastered!</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>3 rounds at 90%+ — you&apos;ve locked in {selectedBeat.name}</p>
              </div>
            )}

            {/* Sign-in prompt */}
            {showSignIn && (
              <div className="mb-6 p-4 rounded-xl text-center" style={{ backgroundColor: '#111', border: '1px solid #2563EB' }}>
                <p className="font-semibold mb-1">Save your score & unlock tutorials</p>
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

            {/* Full round timeline */}
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
              {/* Legend */}
              <div className="flex gap-4 mt-2 text-xs flex-wrap" style={{ color: 'var(--muted)' }}>
                {(['perfect','good','ok','miss'] as const).map(r => (
                  <span key={r} className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ratingColor(r) }} />
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={startPreview}
                className="w-full py-3 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                Play Again
              </button>
              <button
                onClick={() => { setPhase('select'); setResults([]); setShowSignIn(false) }}
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
    </main>
  )
}

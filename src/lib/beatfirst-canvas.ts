import React from 'react'
import { type Beat } from '@/lib/beats'
import { type TapResult, CANVAS_W, STEPS_PER_BAR, WAVEFORM_CAPTURE_MS } from '@/lib/beatfirst-constants'

export const ratingColor = (r: TapResult['rating']) =>
  ({ perfect: '#22c55e', good: '#86efac', ok: '#FDB515', miss: '#ef4444' })[r]

export function drawBeatWaveform(
  ctx: CanvasRenderingContext2D,
  beatOriginX: number,
  centerY: number,
  halfH: number,
  scale: number,
  envelope: number[],
  maxAmp: number,
  peakOffsetMs: number,
  alpha = 1,
  stepMs = 200,
) {
  if (envelope.length < 2) return
  ctx.save()
  ctx.globalAlpha = alpha

  const yellowMs = Math.min(150, stepMs * 0.7)
  const blueMs   = Math.min(50,  stepMs * 0.3)
  const perfectX = beatOriginX + peakOffsetMs * scale
  ctx.fillStyle = 'rgba(253,181,21,0.12)'
  ctx.fillRect(perfectX - yellowMs * scale, 0, yellowMs * 2 * scale, centerY * 2)
  ctx.fillStyle = 'rgba(37,99,235,0.25)'
  ctx.fillRect(perfectX - blueMs * scale, 0, blueMs * 2 * scale, centerY * 2)

  const topPoints: [number, number][] = []
  const botPoints: [number, number][] = []
  for (let j = 0; j < envelope.length; j++) {
    const x = beatOriginX + j * 10 * scale
    const amp = (envelope[j] / maxAmp) * halfH * 0.85
    topPoints.push([x, centerY - amp])
    botPoints.push([x, centerY + amp])
  }

  ctx.beginPath()
  ctx.moveTo(topPoints[0][0], centerY)
  topPoints.forEach(([x, y]) => ctx.lineTo(x, y))
  for (let j = botPoints.length - 1; j >= 0; j--) ctx.lineTo(botPoints[j][0], botPoints[j][1])
  ctx.closePath()
  ctx.fillStyle = 'rgba(253,181,21,0.2)'
  ctx.fill()

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

  ctx.strokeStyle = '#2563EB'
  ctx.lineWidth = 1.5
  ctx.setLineDash([])
  ctx.beginPath(); ctx.moveTo(perfectX, 6); ctx.lineTo(perfectX, centerY * 2 - 6); ctx.stroke()

  ctx.restore()
}

export function buildResultsDrawFn(
  canvas: HTMLCanvasElement,
  beat: Beat,
  tapResults: TapResult[],
  waveformEnvelope: number[],
  peakOffsetMs: number,
  zoomRef: React.MutableRefObject<number>,
  panMsRef: React.MutableRefObject<number>,
) {
  const stepMs = (60000 / beat.bpm) / 4
  const totalMs = beat.bars * STEPS_PER_BAR * stepMs
  const envelope = waveformEnvelope
  const maxAmp = Math.max(...envelope, 0.01)
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

    ctx.strokeStyle = '#1e1e1e'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(W, centerY); ctx.stroke()

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

    const totalSteps = beat.bars * STEPS_PER_BAR
    for (let i = 0; i < totalSteps; i++) {
      const s = i % STEPS_PER_BAR
      if (!(beat.bassline ? beat.bassline[s] !== null : !!beat.taps[s])) continue
      const beatOriginMs = i * stepMs
      const beatOriginX = msToX(beatOriginMs)
      const endX = msToX(beatOriginMs + WAVEFORM_CAPTURE_MS)
      if (endX < 0 || beatOriginX > W) continue
      drawBeatWaveform(ctx, beatOriginX, centerY, halfH, scale, envelope, maxAmp, peakOffsetMs, 0.85, stepMs)
    }

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
      const label = `${r.offsetMs >= 0 ? '+' : ''}${Math.round(r.offsetMs)}ms`
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = color
      ctx.globalAlpha = 0.9
      ctx.fillText(label, x, H - 6)
      ctx.globalAlpha = 1
    })

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

    if (zoomRef.current === 1) {
      ctx.fillStyle = '#333'
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('scroll to zoom · drag to pan', W - 6, H - 4)
    }
  }
}

// Convert canvas clientX to canvas pixel X (accounts for CSS scaling)
export function clientToCanvasX(canvas: HTMLCanvasElement, clientX: number) {
  const rect = canvas.getBoundingClientRect()
  return (clientX - rect.left) * (canvas.width / rect.width)
}

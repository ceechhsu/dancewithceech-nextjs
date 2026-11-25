import { getLevelTiming, LEVEL } from './engine'
import { getLevel, type Sound } from './levels'

/** A single reusable clap, synthesized locally; no downloads or microphone. */
function createClap(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.19), context.sampleRate)
  const data = buffer.getChannelData(0)
  let low = 0
  for (let i = 0; i < data.length; i++) {
    const t = i / context.sampleRate
    const noise = Math.random() * 2 - 1
    low += 0.16 * (noise - low)
    const envelope = [0, 0.011, 0.023].reduce((sum, onset) => {
      const age = t - onset
      return sum + (age < 0 ? 0 : Math.exp(-age / (onset === 0.023 ? 0.032 : 0.004)))
    }, 0)
    data[i] = (noise - low) * envelope * 0.55
  }
  return buffer
}

/** A falling bass tone with a short upper attack that carries on phone speakers. */
function createKick(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.27), context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const t = i / context.sampleRate
    const phase = 2 * Math.PI * (50 * t + 80 * 0.022 * (1 - Math.exp(-t / 0.022)))
    const body = Math.sin(phase) * Math.exp(-t / 0.065) * 0.68
    const harmonic = Math.sin(phase * 3) * Math.exp(-t / 0.045) * 0.15
    const attack = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t / 0.009) * 0.16
    const fade = Math.min(1, (data.length - 1 - i) / (context.sampleRate * 0.012))
    data[i] = (body + harmonic + attack) * (1 - Math.exp(-t / 0.0006)) * fade
  }
  return buffer
}

type ResultSound = 'pass' | 'retry'
type ActiveCue = { source: AudioBufferSourceNode; gain: GainNode }

function createResultSound(context: AudioContext, sound: ResultSound): AudioBuffer {
  const chime = sound === 'pass'
  const notes = chime ? [
    { onset: 0, duration: 0.19, pitch: 659.25, glide: 0, volume: 0.083 },
    { onset: 0.098, duration: 0.215, pitch: 987.77, glide: 0, volume: 0.092 },
  ] : [
    { onset: 0, duration: 0.19, pitch: 350, glide: 40, volume: 0.039 },
    { onset: 0.14, duration: 0.22, pitch: 292, glide: 52, volume: 0.03 },
  ]
  const rate = context.sampleRate
  const buffer = context.createBuffer(1, Math.ceil(rate * (chime ? 0.32 : 0.37)), rate)
  const data = buffer.getChannelData(0)
  for (const note of notes) {
    const firstSample = Math.round(note.onset * rate)
    const sampleCount = Math.round(note.duration * rate)
    for (let i = 0; i < sampleCount; i++) {
      const time = i / rate
      const progress = time / note.duration
      const phase = 2 * Math.PI * time * (note.pitch - 0.5 * note.glide * progress)
      const envelope = chime
        ? Math.min(1, time / 0.009) * Math.exp(-time / 0.078) * Math.min(1, (note.duration - time) / 0.028)
        : Math.pow(Math.sin(Math.PI * progress), 1.5)
      const harmonic = chime ? 0.18 * Math.exp(-time / 0.058) : 0.09 * (1 - progress)
      data[firstSample + i] += (Math.sin(phase) + harmonic * Math.sin(phase * 2)) * envelope * note.volume
    }
  }
  return buffer
}

export class ClapAudio {
  private context: AudioContext
  private sounds: Record<Sound, AudioBuffer>
  private sources: AudioBufferSourceNode[] = []
  private roundStart = 0
  private resultSounds: Partial<Record<ResultSound, AudioBuffer>> = {}
  private activeCue: ActiveCue | null = null

  constructor() {
    this.context = new AudioContext({ latencyHint: 'interactive' })
    this.sounds = { clap: createClap(this.context), kick: createKick(this.context) }
  }

  async resume() {
    await this.context.resume()
    if (this.context.state !== 'running') throw new Error('Audio could not start')
  }

  get running() { return this.context.state === 'running' }

  start(levelId = 1) {
    const level = getLevel(levelId)
    const { beatMs, countInMs } = getLevelTiming(levelId)
    this.stop()
    const countInStart = this.context.currentTime + 0.12
    this.roundStart = countInStart + countInMs / 1000
    const events = [
      ...Array.from({ length: LEVEL.countInBeats }, (_, i) => ({
        time: countInStart + i * beatMs / 1000, sound: 'clap' as Sound,
      })),
      ...level.notes.map(note => ({
        time: this.roundStart + note.atMs / 1000, sound: level.sounds[note.lane]!,
      })),
    ]
    for (const { time, sound } of events) {
      const source = this.context.createBufferSource()
      source.buffer = this.sounds[sound]
      source.connect(this.context.destination)
      source.start(time)
      this.sources.push(source)
    }
  }

  elapsedMs() {
    // Align animation/input with sound reaching the output, not the audio render head.
    const stamp = this.context.getOutputTimestamp?.()
    const now = stamp && typeof stamp.contextTime === 'number' && typeof stamp.performanceTime === 'number' && stamp.contextTime > 0 && stamp.performanceTime > 0
      ? stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000
      : this.context.currentTime - (this.context.outputLatency || this.context.baseLatency || 0)
    return (now - this.roundStart) * 1000
  }

  playResult(passed: boolean): void {
    if (!this.running || this.activeCue) return
    const sound = passed ? 'pass' : 'retry'
    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    source.buffer = this.resultSounds[sound] ??= createResultSound(this.context, sound)
    source.connect(gain)
    gain.connect(this.context.destination)
    source.onended = () => {
      if (this.activeCue?.source === source) this.activeCue = null
      source.disconnect()
      gain.disconnect()
    }
    source.start(this.context.currentTime)
    this.activeCue = { source, gain }
  }

  stop() {
    for (const source of this.sources) {
      try { source.stop() } catch { /* A source may already have ended. */ }
      source.disconnect()
    }
    this.sources = []
    const cue = this.activeCue
    if (!cue) return
    this.activeCue = null
    if (!this.running) {
      cue.source.stop()
      return
    }
    const now = this.context.currentTime
    const cutoff = now + 0.016
    cue.gain.gain.setValueAtTime(1, now)
    cue.gain.gain.linearRampToValueAtTime(0, cutoff)
    cue.source.stop(cutoff)
  }

  dispose() {
    this.stop()
    void this.context.close().catch(() => {})
  }
}

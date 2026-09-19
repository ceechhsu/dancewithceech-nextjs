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

export class ClapAudio {
  private context: AudioContext
  private sounds: Record<Sound, AudioBuffer>
  private sources: AudioBufferSourceNode[] = []
  private roundStart = 0

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

  stop() {
    for (const source of this.sources) {
      try { source.stop() } catch { /* A source may already have ended. */ }
      source.disconnect()
    }
    this.sources = []
  }

  dispose() {
    this.stop()
    void this.context.close().catch(() => {})
  }
}

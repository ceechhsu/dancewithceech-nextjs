import { BEAT_MS, COUNT_IN_MS, LEVEL } from './engine'
import { getLevel } from './levels'

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

export class ClapAudio {
  private context: AudioContext
  private clap: AudioBuffer
  private sources: AudioBufferSourceNode[] = []
  private roundStart = 0

  constructor() {
    this.context = new AudioContext({ latencyHint: 'interactive' })
    this.clap = createClap(this.context)
  }

  async resume() {
    await this.context.resume()
    if (this.context.state !== 'running') throw new Error('Audio could not start')
  }

  get running() { return this.context.state === 'running' }

  start(levelId = 1) {
    const level = getLevel(levelId)
    this.stop()
    const countInStart = this.context.currentTime + 0.12
    this.roundStart = countInStart + COUNT_IN_MS / 1000
    const times = [
      ...Array.from({ length: LEVEL.countInBeats }, (_, i) => countInStart + i * BEAT_MS / 1000),
      ...level.notes.map(note => this.roundStart + note.atMs / 1000),
    ]
    for (const time of times) {
      const source = this.context.createBufferSource()
      source.buffer = this.clap
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

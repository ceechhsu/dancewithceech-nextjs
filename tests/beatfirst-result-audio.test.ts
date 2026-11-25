import assert from 'node:assert/strict'
import test from 'node:test'
import { ClapAudio } from '../src/components/beatfirst-preview/audio'

class FakeBuffer {
  data: Float32Array
  constructor(length: number, readonly sampleRate: number) {
    this.data = new Float32Array(length)
  }
  get duration() { return this.data.length / this.sampleRate }
  getChannelData() { return this.data }
}

class FakeSource {
  buffer: FakeBuffer | null = null
  startedAt: number | null = null
  stoppedAt: number | null = null
  disconnected = false
  onended: (() => void) | null = null
  connect() {}
  disconnect() { this.disconnected = true }
  start(time = 0) { this.startedAt = time }
  stop(time = 0) { this.stoppedAt = time }
}

class FakeGain {
  ramp: [number, number] | null = null
  gain = {
    setValueAtTime() {},
    linearRampToValueAtTime: (value: number, endTime: number) => { this.ramp = [value, endTime] },
  }
  disconnected = false
  connect() {}
  disconnect() { this.disconnected = true }
}

class FakeAudioContext {
  static latest: FakeAudioContext
  state: AudioContextState = 'running'
  sampleRate = 48_000
  currentTime = 10
  destination = {}
  sources: FakeSource[] = []
  gains: FakeGain[] = []

  constructor() { FakeAudioContext.latest = this }
  createBuffer(_channels: number, length: number, sampleRate: number) { return new FakeBuffer(length, sampleRate) }
  createBufferSource() {
    const source = new FakeSource()
    this.sources.push(source)
    return source
  }
  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }
  async close() { this.state = 'closed' }
}

function withAudio(check: (audio: ClapAudio, context: FakeAudioContext) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: FakeAudioContext })
  try {
    const audio = new ClapAudio()
    check(audio, FakeAudioContext.latest)
  } finally {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original)
    else Reflect.deleteProperty(globalThis, 'AudioContext')
  }
}

function zeroCrossingPitch(buffer: FakeBuffer, start: number, end: number) {
  let crossings = 0
  for (let index = Math.ceil(start * buffer.sampleRate) + 1; index < end * buffer.sampleRate; index++) {
    if (buffer.data[index - 1] <= 0 && buffer.data[index] > 0) crossings++
  }
  return crossings / (end - start)
}

test('result cues are brief, quiet, and have different pitch direction', () => withAudio((audio, context) => {
  audio.playResult(true)
  const pass = context.sources[0]
  assert.equal(pass.startedAt, context.currentTime)
  pass.onended?.()
  assert.equal(pass.disconnected, true)
  assert.equal(context.gains[0].disconnected, true)
  audio.playResult(false)
  const retry = context.sources[1]
  assert.equal(retry.startedAt, context.currentTime)
  const passBuffer = pass.buffer!
  const retryBuffer = retry.buffer!
  assert.equal(passBuffer.duration, 0.32)
  assert.equal(retryBuffer.duration, 0.37)
  assert.ok(zeroCrossingPitch(passBuffer, 0.025, 0.075) * 1.3 < zeroCrossingPitch(passBuffer, 0.205, 0.275))
  assert.ok(zeroCrossingPitch(retryBuffer, 0.035, 0.09) > zeroCrossingPitch(retryBuffer, 0.22, 0.29) * 1.15)
  const peaks = [passBuffer, retryBuffer].map(buffer => {
    assert.ok(buffer.data.every(Number.isFinite))
    assert.equal(buffer.data[0], 0)
    assert.equal(buffer.data.at(-1), 0)
    return buffer.data.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0)
  })
  assert.ok(peaks[0] > 0.05 && peaks[0] < 0.12)
  assert.ok(peaks[1] > 0.015 && peaks[1] < peaks[0] * 0.62)
}))

test('results use one source at a time and stop before the next unchanged count-in', () => withAudio((audio, context) => {
  context.state = 'suspended'
  audio.playResult(true)
  assert.equal(context.sources.length, 0)

  context.state = 'running'
  audio.playResult(true)
  audio.playResult(false)
  assert.equal(context.sources.length, 1)
  const cue = context.sources[0]
  audio.start(6)
  const countIn = context.sources.slice(1, 5)
  assert.equal(countIn[0].startedAt, 10.12)
  assert.ok(cue.stoppedAt! > context.currentTime && cue.stoppedAt! < countIn[0].startedAt!)
  assert.deepEqual(context.gains[0].ramp, [0, cue.stoppedAt])
  assert.ok(countIn.every(source => source.buffer?.duration === 0.19))
  cue.onended?.()
  assert.ok(countIn.every(source => source.stoppedAt === null), 'cue cleanup leaves the next count-in alone')
}))

test('disposing stops the result cue and a closed context remains silent', () => withAudio((audio, context) => {
  audio.playResult(false)
  audio.dispose()
  assert.ok(context.sources[0].stoppedAt !== null)
  assert.equal(context.state, 'closed')
  audio.playResult(true)
  assert.equal(context.sources.length, 1)
}))

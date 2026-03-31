'use client'

import { useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'

export function useBeatFirstAudio() {
  const kickRef        = useRef<Tone.MembraneSynth | null>(null)
  const snareRef       = useRef<Tone.NoiseSynth | null>(null)
  const hihatRef       = useRef<Tone.MetalSynth | null>(null)
  const clapRef        = useRef<Tone.NoiseSynth | null>(null)
  const clapFilterRef  = useRef<Tone.Filter | null>(null)
  const bassRef        = useRef<Tone.MonoSynth | null>(null)
  const analyserRef    = useRef<Tone.Analyser | null>(null)
  const bassAnalyserRef = useRef<Tone.Analyser | null>(null)

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

  // Dispose synths on unmount
  useEffect(() => {
    return () => {
      kickRef.current?.dispose()
      snareRef.current?.dispose()
      hihatRef.current?.dispose()
      clapRef.current?.dispose()
      clapFilterRef.current?.dispose()
      bassRef.current?.dispose()
      analyserRef.current?.dispose()
      bassAnalyserRef.current?.dispose()
    }
  }, [])

  return {
    kickRef,
    snareRef,
    hihatRef,
    clapRef,
    clapFilterRef,
    bassRef,
    analyserRef,
    bassAnalyserRef,
    initAudio,
  }
}

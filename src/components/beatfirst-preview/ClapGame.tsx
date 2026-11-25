'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { ArrowDown, ArrowRight, Drum, Hand, Music2, Play, RotateCcw, Sparkle, Volume2, Trophy } from 'lucide-react'
import { ClapAudio } from './audio'
import { getLevelTiming, LEVEL, advanceRound, createRound, summarize, tapRound } from './engine'
import { getLevel, PASS_SCORE } from './levels'
import MasteryStars from './MasteryStars'
import { nextStarTarget } from './practice-goals'
import type { Attempt } from './progress'
import type { Tap } from './engine'
import styles from './ClapGame.module.css'
import resultStyles from './EngagementResult.module.css'

type Phase = 'idle' | 'loading' | 'countin' | 'playing' | 'results' | 'interrupted'
type Feedback = { text: string; detail: string; kind: 'perfect' | 'hit' | 'miss'; id: number }

export type ClapGameHandle = { continueTo: (levelId: number) => void }
export type ResultAction = { label: string; description?: string; onClick?: () => void; disabled?: boolean }

type Props = {
  ref?: Ref<ClapGameHandle>
  canStart?: boolean
  levelId: number
  personalBest?: number
  onComplete: (attempt: Attempt) => void
  onActive: (active: boolean) => void
  onNext?: () => void
  nextLabel?: string
  engagement?: {
    roundPoints: number
    totalPoints: number | null
    signedIn: boolean
    accountsEnabled: boolean
    nextAction?: ResultAction
  }
}

export default function ClapGame({ ref, canStart = true, levelId, personalBest, onComplete, onActive, onNext, nextLabel, engagement }: Props) {
  const level = getLevel(levelId)!
  const engagementEnabled = engagement !== undefined
  const tapsRef = useRef<Tap[]>([])
  const attemptId = useRef('')
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState(() => createRound(levelId))
  const [count, setCount] = useState(1)
  const [remaining, setRemaining] = useState<number>(level.durationMs / 1000)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [notice, setNotice] = useState('')
  const phaseRef = useRef<Phase>('idle')
  const roundRef = useRef(round)
  const timingRef = useRef({ beatMs: 0, countInMs: 0 })
  const audioRef = useRef<ClapAudio | null>(null)
  const frameRef = useRef(0)
  const generationRef = useRef(0)
  const feedbackId = useRef(0)
  const feedbackUntil = useRef(0)
  const lastTick = useRef(-1)
  const fieldRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<(HTMLSpanElement | null)[]>([])
  const progressRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLButtonElement>(null)
  const resultActionRef = useRef<HTMLButtonElement>(null)
  const fieldHeight = useRef(400)

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const publishRound = useCallback((next: typeof round) => {
    roundRef.current = next
    setRound(next)
  }, [])

  const stop = useCallback(() => {
    generationRef.current++
    cancelAnimationFrame(frameRef.current)
    audioRef.current?.stop()
  }, [])

  const interrupt = useCallback(() => {
    if (!['countin', 'playing', 'loading'].includes(phaseRef.current)) return
    stop()
    setNotice('Round paused. Start fresh when you’re ready.')
    setFeedback(null)
    changePhase('interrupted')
  }, [changePhase, stop])

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    const observer = new ResizeObserver(() => { fieldHeight.current = field.clientHeight })
    fieldHeight.current = field.clientHeight
    observer.observe(field)
    const onVisibility = () => { if (document.hidden) interrupt() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', interrupt)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', interrupt)
      stop()
      audioRef.current?.dispose()
      audioRef.current = null
    }
  }, [interrupt, stop])

  useEffect(() => {
    if (phase === 'results' || phase === 'interrupted') resultActionRef.current?.focus({ preventScroll: true })
    if (phase === 'countin') targetRef.current?.focus({ preventScroll: true })
  }, [phase])

  const showFeedback = useCallback((text: string, detail: string, kind: Feedback['kind']) => {
    feedbackUntil.current = performance.now() + 500
    setFeedback({ text, detail, kind, id: ++feedbackId.current })
  }, [])

  const tap = useCallback((lane: 0 | 1 = 0) => {
    if (!['countin', 'playing'].includes(phaseRef.current) || !audioRef.current) return
    const atMs = audioRef.current.elapsedMs()
    if (atMs < -LEVEL.windowMs || atMs >= roundRef.current.durationMs || tapsRef.current.length >= 250) return
    tapsRef.current.push({ atMs, lane })
    const result = tapRound(roundRef.current, atMs, lane)
    if (!result.feedback) return
    publishRound(result.round)
    const perfect = result.feedback === 'Perfect'
    showFeedback(
      result.feedback,
      result.offsetMs === undefined ? 'Listen for the next beat' : perfect ? 'Right on the beat' : `${Math.round(Math.abs(result.offsetMs))} ms ${result.feedback.toLowerCase()}`,
      result.offsetMs === undefined ? 'miss' : perfect ? 'perfect' : 'hit',
    )
  }, [publishRound, showFeedback])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!['Space', 'Enter', 'KeyF', 'KeyJ', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return
      if (!['countin', 'playing'].includes(phaseRef.current)) return
      const target = event.target as HTMLElement | null
      if (target?.closest('a, input, textarea, select') || (target?.closest('button') && !target.closest('[data-tap-lane]'))) return
      if (level.lanes === 1 && !['Space', 'Enter'].includes(event.code)) return
      event.preventDefault()
      const lane = level.lanes === 2 && (['KeyJ', 'ArrowRight'].includes(event.code) || (['Space', 'Enter'].includes(event.code) && target?.closest('[data-tap-lane="1"]'))) ? 1 : 0
      if (!event.repeat) tap(lane)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tap, level.lanes])

  const animate = useCallback(function tick() {
    const audio = audioRef.current
    if (!audio || !['countin', 'playing'].includes(phaseRef.current)) return
    if (!audio.running) { interrupt(); return }
    const { beatMs, countInMs } = timingRef.current
    const { levelId: roundLevelId, durationMs } = roundRef.current
    const elapsed = audio.elapsedMs()
    const targetY = fieldHeight.current - 84
    const nextRound = advanceRound(roundRef.current, elapsed)
    if (nextRound !== roundRef.current) {
      publishRound(nextRound)
      showFeedback('Missed', 'Catch the next one', 'miss')
    }
    for (let i = 0; i < nextRound.notes.length; i++) {
      const element = notesRef.current[i]
      if (!element) continue
      const note = nextRound.notes[i]
      const approach = 1 - (note.atMs - elapsed) / LEVEL.travelMs
      const y = targetY * approach
      element.style.transform = `translate3d(-50%, ${y - 12}px, 0) scale(${0.55 + Math.max(0, Math.min(1, approach)) * 0.45})`
      element.style.opacity = note.status === 'hit' || y < -24 || y > fieldHeight.current ? '0' : note.status === 'miss' ? '0.22' : '1'
    }
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, 1 - elapsed / durationMs))})`
    if (elapsed >= 0 && phaseRef.current === 'countin') changePhase('playing')
    const tickNumber = Math.floor(elapsed / 100)
    if (tickNumber !== lastTick.current) {
      lastTick.current = tickNumber
      setRemaining(Math.max(0, Math.ceil((durationMs - Math.max(0, elapsed)) / 1000)))
      setCount(Math.max(1, Math.min(4, Math.floor((elapsed + countInMs) / beatMs) + 1)))
      if (feedbackUntil.current < performance.now()) setFeedback(null)
    }
    if (elapsed >= durationMs) {
      audio.stop()
      changePhase('results')
      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current({ id: attemptId.current, levelId: roundLevelId, taps: tapsRef.current.slice(), completedAt: new Date().toISOString() })
        if (engagementEnabled) audio.playResult(summarize(roundRef.current).score >= PASS_SCORE)
      }
      return
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [changePhase, engagementEnabled, interrupt, publishRound, showFeedback])

  const beginRound = useCallback(async (roundLevelId: number) => {
    if (!canStart || ['loading', 'countin', 'playing'].includes(phaseRef.current)) return
    const newRound = createRound(roundLevelId)
    stop()
    const generation = generationRef.current
    changePhase('loading')
    setNotice('')
    setFeedback(null)
    publishRound(newRound)
    timingRef.current = getLevelTiming(roundLevelId)
    setRemaining(newRound.durationMs / 1000)
    setCount(1)
    lastTick.current = -1
    if (progressRef.current) progressRef.current.style.transform = 'scaleX(1)'
    tapsRef.current = []
    attemptId.current = crypto.randomUUID()
    completedRef.current = false
    try {
      audioRef.current ??= new ClapAudio()
      await audioRef.current.resume()
      if (generation !== generationRef.current) return
      audioRef.current.start(roundLevelId)
      changePhase('countin')
      frameRef.current = requestAnimationFrame(animate)
    } catch {
      if (generation !== generationRef.current) return
      audioRef.current?.dispose()
      audioRef.current = null
      setNotice('Sound couldn’t start. Check your volume, then try again.')
      changePhase('interrupted')
    }
  }, [animate, canStart, changePhase, publishRound, stop])
  const start = () => void beginRound(levelId)
  useImperativeHandle(ref, () => ({ continueTo: roundLevelId => void beginRound(roundLevelId) }), [beginRound])

  const active = phase === 'playing' || phase === 'countin'
  useEffect(() => { onActive(active || phase === 'loading') }, [active, phase, onActive])
  const stats = summarize(round)
  const completed = phase === 'results'
  const passed = stats.score >= PASS_SCORE
  const best = Math.max(personalBest ?? 0, stats.score)
  const starTarget = nextStarTarget(best)
  const resultTitle = stats.hits === stats.total ? 'You found the beat.' : stats.hits >= stats.total * .65 ? 'You’re finding your groove.' : stats.hits > 0 ? 'A little closer every time.' : 'Listen. Then find the beat.'

  return (
        <section className={styles.game} aria-label="BeatFirst rhythm game">
          <div className={styles.gameHeader}>
            <div><span className={styles.levelLabel}>LEVEL {String(levelId).padStart(2, '0')}</span><h2>{level.title}</h2></div>
            <div className={styles.tempo}><span>{level.bpm}</span> BPM</div>
          </div>
          <div className={styles.hud}>
            <span><b>{stats.hits}</b><span> / {stats.total} HITS</span></span>
            <span><b>{round.streak}</b><span> STREAK</span></span>
            <span className={styles.timer}><b>{remaining.toString().padStart(2, '0')}</b><span> SEC</span></span>
          </div>
          <div className={styles.progress}><div ref={progressRef} /></div>

          <div ref={fieldRef} className={styles.field} data-phase={phase} data-lanes={level.lanes}>
            {Array.from({ length: level.lanes }, (_, lane) => <div key={lane} className={styles.track} style={{ left: level.lanes === 1 ? '50%' : lane === 0 ? '25%' : '75%' }} aria-hidden="true" />)}
            <div className={styles.centerLine} aria-hidden="true" />
            <div className={styles.notes} aria-hidden="true">
              {round.notes.map((note, i) => <span style={{ left: level.lanes === 1 ? '50%' : note.lane === 0 ? '25%' : '75%' }} className={styles.note} data-sound={level.sounds[note.lane]} key={i} ref={el => { notesRef.current[i] = el }} />)}
            </div>

            {active && <div className={styles.liveMessage}>
              {phase === 'countin' && !feedback ? <><span className={styles.countNumber}>{count}</span><span className={styles.countHint}>Listen first. Get ready.</span></> : feedback ? <div key={feedback.id} className={styles.feedback} data-kind={feedback.kind}><strong>{feedback.text}</strong><span>{feedback.detail}</span></div> : <span className={styles.playHint}>Feel it. Tap it.</span>}
            </div>}

            {Array.from({ length: level.lanes }, (_, laneIndex) => {
              const lane = laneIndex as 0 | 1
              return <button key={lane} ref={lane === 0 ? targetRef : undefined} type="button" className={styles.target} data-tap-lane={lane} data-sound={level.sounds[lane]}
                style={{ left: level.lanes === 1 ? '50%' : lane === 0 ? '25%' : '75%' }}
                aria-label={level.lanes === 1 ? 'Tap the clap beat' : `Tap the ${lane === 0 ? 'left' : 'right'} ${level.sounds[lane]} beat`} aria-disabled={!active} tabIndex={active ? 0 : -1}
                onPointerDown={event => { if (!active || event.button !== 0) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); tap(lane) }}
                onClick={event => { if (event.detail === 0) tap(lane) }}>
                <span className={styles.hitLine} aria-hidden="true" />
                <span className={styles.pad} data-feedback={feedback?.kind ?? ''}>{level.sounds[lane] === 'kick' ? <Drum size={28} strokeWidth={1.6} /> : <Hand size={28} strokeWidth={1.6} />}</span>
                <span className={styles.targetLabel}>{level.lanes === 1 ? 'TAP HERE' : lane === 0 ? 'KICK · F' : 'CLAP · J'}</span>
              </button>
            })}

            {(phase === 'idle' || phase === 'loading') && <div className={styles.startOverlay}>
              <div className={styles.demo} aria-hidden="true"><span /><span /><ArrowDown size={17} /></div>
              <h3>{levelId === 1 ? <>A little rhythm.<br />A good beginning.</> : level.title}</h3>
              <p>{level.description}</p>
              <button className={styles.primary} onClick={start} disabled={phase === 'loading' || !canStart}><Play size={16} fill="currentColor" />{!canStart ? 'Getting ready…' : phase === 'loading' ? 'Starting sound…' : 'Let’s play'}</button>
              <span className={styles.startMeta}>4-BEAT COUNT-IN · {level.durationMs / 1000}-SECOND ROUND</span>
            </div>}

            {completed && engagement ? <div className={resultStyles.overlay} data-passed={passed}>
              <div className={resultStyles.content}>
                <div className={resultStyles.heading}>
                  {passed && <div className={resultStyles.pulseStage} aria-hidden="true">
                    <div className={resultStyles.ripples}><span data-result-ripple /><span data-result-ripple /></div>
                    <div className={resultStyles.accents}>
                      <span data-result-accent><Music2 size={14} /></span><span data-result-accent />
                      <span data-result-accent><Sparkle size={11} /></span><span data-result-accent />
                      <span data-result-accent><Sparkle size={14} /></span><span data-result-accent />
                      <span data-result-accent><Music2 size={13} /></span><span data-result-accent />
                    </div>
                    <div className={resultStyles.pulse}><span /><span /><span /><span /></div>
                  </div>}
                  <h3>{passed ? `Level ${levelId} passed!` : 'Try again. You’ve got this.'}</h3>
                </div>
                <div className={resultStyles.metrics} data-points={engagement.accountsEnabled}>
                  <div className={resultStyles.timing}>
                    <div><strong>{stats.score}</strong><span> / 100</span></div>
                    <span>Timing score</span>
                  </div>
                  {engagement.accountsEnabled && <div className={resultStyles.points}>
                    <div>
                      {engagement.totalPoints !== null && <strong>{engagement.totalPoints.toLocaleString('en-US')}</strong>}
                      {engagement.roundPoints > 0 && <span className={resultStyles.earnedPoints} data-result-points>+{engagement.roundPoints} round</span>}
                    </div>
                    <span>{engagement.totalPoints !== null ? 'Rhythm points' : engagement.signedIn ? 'Rhythm points sync with your account' : 'Sign in to save Rhythm Points'}</span>
                    {passed && <span className={resultStyles.rewardHint}>First saved passes add 20 points.</span>}
                  </div>}
                </div>
                <div className={resultStyles.stats}>
                  <span><b>{stats.hits}/{stats.total}</b> beats hit</span>
                  <span><b>{stats.bestStreak}</b> best beat streak</span>
                  <span className={resultStyles.personalBest}><MasteryStars score={best} highlightScore={passed ? stats.score : undefined} /> <span>Best <b>{best}</b></span></span>
                </div>
                {stats.extraTaps > 0 && <p className={resultStyles.extras}>{stats.extraTaps} extra {stats.extraTaps === 1 ? 'tap' : 'taps'} · One tap per note.</p>}
                <div className={resultStyles.actions}>
                  {engagement.nextAction?.description && <p>{engagement.nextAction.description}</p>}
                  <button ref={resultActionRef} className={`${styles.primary} ${resultStyles.primary}`} onClick={engagement.nextAction?.onClick ?? start} disabled={engagement.nextAction?.disabled || !canStart}>
                    {engagement.nextAction?.label ?? 'Replay'}
                    {engagement.nextAction?.onClick ? <ArrowRight size={18} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
                  </button>
                  {engagement.nextAction?.onClick && <button className={resultStyles.replay} onClick={start}><RotateCcw size={14} aria-hidden="true" /> {passed ? 'Replay' : 'Try again'}</button>}
                </div>
              </div>
            </div> : (completed || phase === 'interrupted') && <div className={styles.results}>
              {completed ? <>
                <span className={styles.resultIcon}><Trophy size={23} /></span>
                <span className={styles.resultEyebrow}>ROUND COMPLETE</span>
                <h3>{resultTitle}</h3>
                <div className={styles.score}><strong>{stats.score}</strong><span>/ 100<br />TIMING SCORE</span></div>
                <div className={styles.mastery}><MasteryStars score={best} /><span>PERSONAL BEST {best}</span></div>
                <div className={styles.resultStats}><div><strong>{stats.hits}<span> / {stats.total}</span></strong><span>BEATS HIT</span></div><div><strong>{stats.bestStreak}</strong><span>BEST STREAK</span></div></div>
                <p className={styles.resultTip}>{starTarget ? `Aim for ${starTarget} to earn your next star. Listen, then tap with the beat.` : 'All three stars earned. Keep your rhythm sharp.'}</p>
                {stats.extraTaps > 0 && <p className={styles.extraTaps}>{stats.extraTaps} extra {stats.extraTaps === 1 ? 'tap' : 'taps'} · One tap per note.</p>}
              </> : <><Volume2 className={styles.interruptedIcon} size={32} /><h3>Ready when you are.</h3><p className={styles.resultTip} role="status">{notice}</p></>}
              <button ref={resultActionRef} className={styles.primary} onClick={start}><RotateCcw size={16} />{completed ? 'Play again' : 'Start again'}</button>
              {completed && onNext && <button className={styles.next} onClick={onNext}>{nextLabel ?? 'Next level'} →</button>}
            </div>}
          </div>
          <div className={styles.gameFooter}>
            <span><Volume2 size={14} /> {level.lanes === 1 ? 'CLAP ONLY' : 'KICK + CLAP'}</span>
            <span className={styles.keyboardHint}>{level.lanes === 1 ? <>Tap or press <kbd>SPACE</kbd></> : <>Left <kbd>F</kbd> · Right <kbd>J</kbd></>}</span>
            <span className={styles.touchHint}>{level.lanes === 1 ? 'Tap the gold pad with your thumb' : 'Kick left · Clap right'}</span>
          </div>
          <p className={styles.srOnly} role="status" aria-live="polite">{phase === 'countin' ? 'Four-beat count-in. Get ready to tap.' : phase === 'playing' ? `Go. Tap each note in its lane for ${level.durationMs / 1000} seconds.` : completed ? `${engagement ? passed ? `Level ${levelId} passed.` : 'Try again. You’ve got this.' : 'Round complete.'} ${stats.hits} of ${stats.total} beats hit. Best streak ${stats.bestStreak}. Timing score ${stats.score} out of 100.${engagement?.totalPoints != null ? ` ${engagement.totalPoints} rhythm points.` : ''}${engagement?.nextAction?.description ? ` ${engagement.nextAction.description}` : ''}` : ''}</p>
        </section>
  )
}

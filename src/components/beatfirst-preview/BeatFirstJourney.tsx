'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, LockKeyhole, Volume2, ArrowLeft, ArrowRight, CloudCheck, Sparkles, ChevronDown } from 'lucide-react'
import ClapGame from './ClapGame'
import { LEVELS, PASS_SCORE } from './levels'
import { useProgress } from './useProgress'
import MasteryStars from './MasteryStars'
import { dailyPractice, masteryStars, nextMasteryLevel, nextStarTarget } from './practice-goals'
import type { Attempt } from './progress'
import gameStyles from './ClapGame.module.css'
import styles from './Journey.module.css'

export default function BeatFirstJourney() {
  const progress = useProgress()
  return <BeatFirstJourneyView progress={progress} />
}

export function BeatFirstJourneyView({ progress }: { progress: ReturnType<typeof useProgress> }) {
  const [chosen, setChosen] = useState(1)
  const [expanded, setExpanded] = useState([0, 1])
  const [now, setNow] = useState<Date | null>(null)
  const recentKey = progress.summary.recent.map(round => `${round.id}:${round.completedAt}`).join('|')
  useEffect(() => {
    const refresh = () => setNow(new Date())
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [recentKey])
  const [gameVersion, setGameVersion] = useState(0)
  const [active, setActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const wasActive = useRef(false)
  const owner = useRef<string | null>(null)
  const accountRef = useRef(progress.account)
  useEffect(() => { accountRef.current = progress.account }, [progress.account])
  const levelId = progress.summary.unlockedLevelIds.includes(chosen) ? chosen : 1
  const gameRef = useRef<HTMLDivElement>(null)
  const onActive = useCallback((playing: boolean) => {
    if (playing && !wasActive.current) owner.current = accountRef.current?.id ?? null
    wasActive.current = playing
    setActive(playing)
  }, [])
  const { record } = progress
  const onComplete = useCallback((attempt: Attempt) => { record(attempt, owner.current) }, [record])
  const choose = (id: number) => {
    if (active || !progress.summary.unlockedLevelIds.includes(id)) return
    if (id === levelId) setGameVersion(version => version + 1)
    setChosen(id)
    setExpanded(current => [...new Set([...current, Math.floor((id - 1) / 3)])])
    gameRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }
  const next = progress.summary.unlockedLevelIds.find(id => id > levelId)
  const introDone = [1,2,3].every(id => progress.guest.completedLevelIds.includes(id))
  const invite = !progress.account && introDone && !dismissed
  const highest = Math.max(...progress.summary.unlockedLevelIds)
  const firstUnplayed = [4, 5, 6].find(id => !progress.summary.completedLevelIds.includes(id))
  const suggested = highest === LEVELS.length && progress.summary.completedLevelIds.includes(highest)
    ? nextMasteryLevel(progress.summary.bestScores, progress.summary.unlockedLevelIds)
    : highest > 6 ? highest : firstUnplayed ?? 6
  const targetStar = nextStarTarget(progress.summary.bestScores[suggested])
  const totalStars = Object.values(progress.summary.bestScores).reduce((sum, score) => sum + masteryStars(score), 0)
  const practice = now ? dailyPractice(progress.summary.recent, now) : null
  const newChallenge = highest > 6 && !progress.summary.completedLevelIds.includes(highest)
  const nextGate = highest < LEVELS.length ? highest + 1 : null
  const prerequisiteBest = progress.summary.bestScores[highest] ?? 0
  const canSignIn = !active && progress.ready && progress.status !== 'loading'
  const stepTitle = !progress.account ? 'Unlock levels 4–6. Free.'
    : newChallenge ? `Level ${highest} unlocked!`
      : highest === 6 && firstUnplayed ? 'Levels 4–6 unlocked!'
        : nextGate ? `Your next goal: level ${nextGate}` : `All ${LEVELS.length} levels are open.`
  const stepDescription = !progress.account
    ? 'Sign in to play three longer challenges right away and save your progress on every device.'
    : newChallenge ? `${LEVELS[highest - 1].description} Your new challenge is ready.`
      : highest === 6 && firstUnplayed ? 'Build up gently from 15 to 20 seconds. Score 80 in level 6 to open level 7.'
        : nextGate ? `Score ${PASS_SCORE} in level ${highest} to unlock level ${nextGate}. Your personal best counts.`
          : totalStars === LEVELS.length * 3 ? 'All mastery stars earned. Keep the feeling with a favorite rhythm.'
            : `Aim for ${targetStar ?? 95} in level ${suggested} to earn another star, or replay a favorite.`
  const showGoalProgress = !!progress.account && !!nextGate && !newChallenge && !(highest === 6 && firstUnplayed)
  const groups = [
    { title: 'Start here', detail: '3 free samples · No account needed', ids: [1, 2, 3] },
    { title: 'Keep going', detail: progress.account ? 'Included with your free account' : 'Sign in free to unlock all three', ids: [4, 5, 6] },
    { title: 'Build your skill', detail: '90 BPM · Meet your kick and clap', ids: [7, 8, 9] },
    { title: 'Find your groove', detail: '90 BPM · Longer rounds, pairs, and pauses', ids: [10, 11, 12] },
    { title: 'Pick up the pace', detail: '100 BPM · Familiar patterns, a quicker pulse', ids: [13, 14, 15] },
    { title: 'Keep the pocket', detail: '110 BPM · New accents and 30-second practice', ids: [16, 17, 18] },
  ]

  return <main className={gameStyles.page}>
    <header className={gameStyles.header}>
      <Link href="/" className={gameStyles.brand}>DANCE<span>WITH</span>CEECH<span className={gameStyles.brandDot}>.</span></Link>
      <span className={gameStyles.preview}>BEATFIRST <span>/</span> PREVIEW</span>
    </header>
    <div className={styles.layout}>
      <section className={styles.intro}>
        <Link href="/beat-first" className={styles.back}><ArrowLeft size={14} /> Back to BeatFirst</Link>
        <div className={gameStyles.eyebrow}><span /> RHYTHM FIRST. THEN DANCE.</div>
        <h1>Find your <span>beat.</span></h1>
        <p className={styles.description}>Start with ten seconds. Build a rhythm that stays with you.</p>
        <div className={styles.desktopGuide}>
          <p><b>Start with the clap.</b> Tap as each note meets the line. Later, add a kick on the left and a clap on the right.</p>
          <p><b>Keep going.</b> Misses never stop the rhythm. Every round is a fresh start.</p>
          <span><Volume2 size={15} /> Sound on. Shoulders loose.</span>
        </div>
      </section>
      <div className={styles.gameSlot} ref={gameRef}>
        <ClapGame key={`${progress.account?.id ?? 'guest'}:${levelId}:${gameVersion}`} canStart={progress.ready} levelId={levelId} personalBest={progress.summary.bestScores[levelId]} onComplete={onComplete} onActive={onActive}
          onNext={next ? () => choose(next) : !progress.account ? () => void progress.login() : highest === LEVELS.length ? () => choose(suggested) : undefined} nextLabel={next ? newChallenge && next === highest ? `Level ${next} unlocked! Play now` : `Try level ${next}` : progress.account ? `Practice level ${suggested}` : 'Sign in to unlock levels 4–6'} />
        <p className={styles.saveStatus} role="status">{progress.account ? progress.pendingCount ? `${progress.pendingCount} ${progress.pendingCount === 1 ? 'round waiting' : 'rounds waiting'} to save` : progress.status === 'saved' ? 'Progress saved to your account' : progress.status === 'loading' ? 'Loading your progress…' : '' : 'Free samples · No account needed'}</p>
      </div>
      <section className={styles.journey} aria-label="Your rhythm journey">
        <div className={styles.sectionHeading}><span>YOUR RHYTHM JOURNEY</span><span>{progress.summary.completedLevelIds.length} / {LEVELS.length} PLAYED</span></div>
        <div className={styles.nextStep}>
          <span className={styles.stepEyebrow}><Sparkles size={14} /> {!progress.account ? 'YOUR NEXT STEP' : 'KEEP YOUR RHYTHM GROWING'}</span>
          <h2 aria-live="polite">{stepTitle}</h2>
          <p>{stepDescription}</p>
          {showGoalProgress && <div className={styles.goalProgress}>
            <label htmlFor="next-level-progress">Level {highest} best: <b>{prerequisiteBest} / {PASS_SCORE}</b></label>
            <progress id="next-level-progress" value={Math.min(prerequisiteBest, PASS_SCORE)} max={PASS_SCORE} />
          </div>}
          <button className={styles.unlockButton} disabled={progress.account ? active || !progress.ready : !canSignIn} onClick={() => progress.account ? choose(suggested) : void progress.login()}>
            {progress.account ? `Play level ${suggested}` : 'Sign in free to unlock levels 4–6'}<ArrowRight size={16} />
          </button>
          {!progress.account && <span className={styles.stepHint}>Continue with Google · Your sample scores come with you</span>}
        </div>
        <div className={styles.starGuide}><b>{totalStars} / {LEVELS.length * 3} stars</b><span>80 points ★ · 90 points ★★ · 95 points ★★★</span></div>
        {groups.map((group, index) => <div key={group.title} className={styles.levelGroup}>
          <h3><button className={styles.chapter} aria-expanded={expanded.includes(index)} aria-controls={`chapter-${index}`} onClick={() => setExpanded(current => current.includes(index) ? current.filter(id => id !== index) : [...current, index])}>
            <span><strong>{group.title}</strong><span>{group.detail}</span><small>Levels {group.ids[0]}–{group.ids[2]} · {group.ids.filter(id => progress.summary.unlockedLevelIds.includes(id)).length} / 3 open</small></span><ChevronDown size={17} />
          </button></h3>
          <div id={`chapter-${index}`} className={styles.levels} hidden={!expanded.includes(index)}>
          {LEVELS.filter(level => group.ids.includes(level.id)).map(level => {
            const unlocked = progress.summary.unlockedLevelIds.includes(level.id)
            const best = progress.summary.bestScores[level.id]
            const mastered = best !== undefined && best >= PASS_SCORE
            const signInUnlock = !progress.account && level.id >= 4 && level.id <= 6
            const requirement = level.id <= 6 ? 'Sign in free to unlock'
              : `${!progress.account ? 'Sign in, then score' : 'Score'} ${PASS_SCORE} in level ${level.id - 1} to unlock`
            const previousBest = progress.summary.bestScores[level.id - 1]
            return <button key={level.id} className={styles.level} data-selected={levelId === level.id} data-locked={!unlocked} disabled={active || (!unlocked && (!signInUnlock || !canSignIn))} onClick={() => signInUnlock ? void progress.login() : choose(level.id)} aria-pressed={unlocked ? levelId === level.id : undefined}>
              <span className={styles.levelNumber}>{String(level.id).padStart(2,'0')}</span>
              <span className={styles.levelText}><strong>{level.title}</strong><span>{level.durationMs / 1000} sec · {level.bpm} BPM · {level.lanes === 1 ? '1 lane' : '2 lanes'}{level.id <= 3 ? ' · Free' : ''}</span>
                {best !== undefined && <MasteryStars score={best} />}
                {!unlocked && <span className={styles.requirement}>{requirement}</span>}
                {!unlocked && level.id > 6 && progress.account && <span>Level {level.id - 1} best: {previousBest ?? 'Not played yet'}</span>}
              </span>
              <span className={styles.levelResult}>{!unlocked ? <LockKeyhole size={16} aria-label="Locked" /> : best !== undefined ? <><b>{best}</b><span>{mastered ? <><Check size={10} /> BEST</> : 'BEST'}</span></> : 'PLAY'}</span>
            </button>
          })}
          </div>
        </div>)}
        <p className={styles.goal}>Your personal best counts. Once you unlock a level, it stays yours.</p>
        <details className={styles.scoring}><summary>How do I earn 80 points?</summary><p>Tap close to each beat: perfect timing earns 100 points for that note, near hits earn 70, and wider hits earn 40. Misses and extra taps lower your round score. Your best score counts, and you can retry as often as you like.</p></details>
      </section>
      <section className={styles.account} aria-label="Saved progress">
        {progress.account ? <>
          <span className={styles.accountEyebrow}><CloudCheck size={15} /> YOUR PROGRESS</span>
          <h2>Welcome back, {progress.account.name}.</h2>
          <p>Your best scores and unlocked levels travel with you.</p>
          <div className={styles.accountStats}><b>{progress.summary.attemptCount}</b> saved rounds <span>·</span> <b>{progress.summary.unlockedLevelIds.length}</b> levels open</div>
          <div className={styles.dailyGoal}>
            <h3>{practice?.done ? 'Today’s practice is complete.' : 'A little rhythm, every day.'}</h3>
            <p>{practice?.done ? 'Three rounds done. Come back tomorrow for another small win.' : 'Finish 3 rounds today. Any level, any score.'}</p>
            <label htmlFor="daily-practice">{practice ? `${practice.completed} / ${practice.target} rounds today` : 'Loading today’s practice…'}</label>
            <progress id="daily-practice" value={practice?.completed ?? 0} max={3} />
            <button className={styles.textButton} disabled={active || !progress.ready} onClick={() => choose(suggested)}>Practice level {suggested} →</button>
          </div>
          {progress.summary.recent.length > 0 && <div className={styles.history}><h3>Recent rounds</h3>{progress.summary.recent.map(row => <div key={row.id}><span>{LEVELS.find(level => level.id === row.levelId)?.title}</span><b>{row.score}<span> / 100</span></b></div>)}</div>}
          <button className={styles.textButton} onClick={() => void progress.logout()} disabled={active || progress.pendingCount > 0}>Sign out</button>
        </> : <>
          <span className={styles.accountEyebrow}>A LITTLE PRACTICE. REAL PROGRESS.</span>
          <h2>{invite ? 'You’ve found the beat. Keep your progress.' : 'Make your rhythm count.'}</h2>
          <p>Unlock levels 4–6 instantly, save your best scores, and pick up where you left off on any device. Then earn kick-and-clap patterns, two tracks, and faster tempos as you improve.</p>
          <button className={gameStyles.primary} onClick={() => void progress.login()} disabled={!canSignIn}>Sign in free to unlock levels 4–6</button>
          <span className={styles.googleHint}>Continue with Google · Your practice rounds come with you</span>
          {invite && <button className={styles.textButton} onClick={() => { setDismissed(true); choose(1) }}>Keep practicing</button>}
        </>}
        {progress.message && <div className={styles.error} role="alert"><p>{progress.message}</p><button onClick={() => void progress.retry()} disabled={active || progress.status === 'loading' || progress.status === 'saving'}>Retry saving</button></div>}
        {progress.storageWarning && <p className={styles.error} role="alert">{progress.storageWarning}</p>}
      </section>
    </div>
    <footer className={gameStyles.pageFooter}><span>BEATFIRST <span className={gameStyles.footerDivider}>/</span> BY CEECH</span><span>Rhythm is a skill. You can learn it.</span></footer>
  </main>
}

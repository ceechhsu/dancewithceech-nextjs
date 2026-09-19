'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, LockKeyhole, Volume2, ArrowLeft, CloudCheck } from 'lucide-react'
import ClapGame from './ClapGame'
import { LEVELS, PASS_SCORE } from './levels'
import { useProgress } from './useProgress'
import type { Attempt } from './progress'
import gameStyles from './ClapGame.module.css'
import styles from './Journey.module.css'

export default function BeatFirstJourney() {
  const progress = useProgress()
  const [chosen, setChosen] = useState(1)
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
    setChosen(id)
    gameRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }
  const next = progress.summary.unlockedLevelIds.find(id => id > levelId)
  const introDone = [1,2,3].every(id => progress.guest.completedLevelIds.includes(id))
  const invite = !progress.account && introDone && !dismissed
  const needsIntro = [1,2,3].filter(id => (progress.summary.bestScores[id] ?? 0) < PASS_SCORE)
  const highest = Math.max(...progress.summary.unlockedLevelIds)
  const goal = needsIntro.length
    ? `Reach ${PASS_SCORE} points in each free sample to earn level 4.${!progress.account ? ' Sign in to keep your scores and unlock it.' : ''}`
    : !progress.account ? 'Your scores qualify for level 4. Sign in to save them and start your first 20-second challenge.'
      : highest < 6 ? `Reach ${PASS_SCORE} points in level ${highest} to unlock level ${highest + 1}.`
        : (progress.summary.bestScores[6] ?? 0) < PASS_SCORE ? 'Your final challenge: reach 80 points with both hands.' : 'All six levels mastered. Replay your favorites and improve your timing.'

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
          <p><b>Hear the clap.</b> Tap the gold pad as each blue note meets the line.</p>
          <p><b>Keep going.</b> Misses never stop the rhythm. Every round is a fresh start.</p>
          <span><Volume2 size={15} /> Sound on. Shoulders loose.</span>
        </div>
      </section>
      <div className={styles.gameSlot} ref={gameRef}>
        <ClapGame key={`${progress.account?.id ?? 'guest'}:${levelId}`} canStart={progress.ready} levelId={levelId} onComplete={onComplete} onActive={onActive}
          onNext={next ? () => choose(next) : invite ? () => void progress.login() : undefined} nextLabel={next ? `Try level ${next}` : 'Save my progress'} />
        <p className={styles.saveStatus} role="status">{progress.account ? progress.pendingCount ? `${progress.pendingCount} ${progress.pendingCount === 1 ? 'round waiting' : 'rounds waiting'} to save` : progress.status === 'saved' ? 'Progress saved to your account' : progress.status === 'loading' ? 'Loading your progress…' : '' : 'Free samples · No account needed'}</p>
      </div>
      <section className={styles.journey} aria-label="Your rhythm journey">
        <div className={styles.sectionHeading}><span>YOUR RHYTHM JOURNEY</span><span>{progress.summary.completedLevelIds.length} / 6 PLAYED</span></div>
        <div className={styles.levels}>
          {LEVELS.map(level => {
            const unlocked = progress.summary.unlockedLevelIds.includes(level.id)
            const best = progress.summary.bestScores[level.id]
            const mastered = best !== undefined && best >= PASS_SCORE
            return <button key={level.id} className={styles.level} data-selected={levelId === level.id} disabled={active || !unlocked} onClick={() => choose(level.id)} aria-pressed={levelId === level.id}>
              <span className={styles.levelNumber}>{!unlocked ? <LockKeyhole size={16} /> : mastered ? <Check size={17} /> : String(level.id).padStart(2,'0')}</span>
              <span className={styles.levelText}><strong>{level.title}</strong><span>{level.durationMs / 1000} sec · {level.lanes === 1 ? '1 lane' : '2 lanes'}{level.id <= 3 ? ' · Free' : ''}</span></span>
              <span className={styles.levelResult}>{best !== undefined ? <><b>{best}</b><span>BEST</span></> : !unlocked ? 'LOCKED' : 'PLAY'}</span>
            </button>
          })}
        </div>
        <p className={styles.goal}>{goal}</p>
        <details className={styles.scoring}><summary>How do I earn 80 points?</summary><p>Tap close to each clap: perfect timing earns 100 points for that note, near hits earn 70, and wider hits earn 40. Misses and extra taps lower your round score. Your best score counts, and you can retry as often as you like.</p></details>
      </section>
      <section className={styles.account} aria-label="Saved progress">
        {progress.account ? <>
          <span className={styles.accountEyebrow}><CloudCheck size={15} /> YOUR PROGRESS</span>
          <h2>Welcome back, {progress.account.name}.</h2>
          <p>Your best scores and unlocked levels travel with you.</p>
          <div className={styles.accountStats}><b>{progress.summary.attemptCount}</b> saved rounds <span>·</span> <b>{progress.summary.unlockedLevelIds.length}</b> levels open</div>
          {progress.summary.recent.length > 0 && <div className={styles.history}><h3>Recent rounds</h3>{progress.summary.recent.map(row => <div key={row.id}><span>{LEVELS.find(level => level.id === row.levelId)?.title}</span><b>{row.score}<span> / 100</span></b></div>)}</div>}
          <button className={styles.textButton} onClick={() => void progress.logout()} disabled={active || progress.pendingCount > 0}>Sign out</button>
        </> : <>
          <span className={styles.accountEyebrow}>A LITTLE PRACTICE. REAL PROGRESS.</span>
          <h2>{invite ? 'You’ve found the beat. Keep your progress.' : 'Make your rhythm count.'}</h2>
          <p>Sign in free to save your best scores, continue on another device, and earn longer rounds with new patterns and two tracks.</p>
          <button className={gameStyles.primary} onClick={() => void progress.login()} disabled={active || !progress.ready || progress.status === 'loading'}>Save my progress</button>
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

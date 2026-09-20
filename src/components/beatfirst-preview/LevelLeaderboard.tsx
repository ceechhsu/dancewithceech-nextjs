'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, RefreshCw, Trophy } from 'lucide-react'
import { LEVELS } from './levels'
import { normalizeDisplayName, type LeaderboardData, type LeaderboardProfile } from './leaderboard-model'
import { leaderboardRequest } from './leaderboard-request'
import styles from './Leaderboard.module.css'

type Props = {
  levelId: number
  onLevelChange: (id: number) => void
  accountId: string | null
  ready: boolean
  active: boolean
  bestScores: Record<string, number>
  refreshKey: number
  onLogin: () => Promise<void>
}

export default function Leaderboard({ levelId, onLevelChange, accountId, ready, active, bestScores, refreshKey, onLogin }: Props) {
  const [revision, setRevision] = useState(0)
  const [response, setResponse] = useState<{ key: string; data?: LeaderboardData; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const writeRef = useRef<AbortController | null>(null)
  const key = `${accountId ?? 'guest'}:${levelId}:${ready}:${refreshKey}:${revision}`
  const current = response?.key === key ? response : null
  const data = current?.data
  const best = bestScores[levelId]
  const level = LEVELS.find(item => item.id === levelId)!

  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    const headers: HeadersInit = accountId ? { 'X-BeatFirst-Owner': accountId } : {}
    void leaderboardRequest<LeaderboardData>(`/api/beatfirst/leaderboard?level=${levelId}`, { signal: controller.signal, headers })
      .then(data => { if (!controller.signal.aborted) setResponse({ key, data }) })
      .catch(error => { if (!controller.signal.aborted) setResponse({ key, error: error.message }) })
    return () => controller.abort()
  }, [key, levelId, accountId, ready])

  useEffect(() => () => writeRef.current?.abort(), [])

  const saveProfile = async (profile: LeaderboardProfile) => {
    if (!accountId || !ready || active || writeRef.current) throw new Error('Please wait, then try again.')
    const controller = new AbortController()
    writeRef.current = controller
    setSaving(true)
    try {
      await leaderboardRequest<{ profile: LeaderboardProfile }>('/api/beatfirst/leaderboard', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-BeatFirst-Owner': accountId },
        body: JSON.stringify(profile),
      })
      if (!controller.signal.aborted) setRevision(value => value + 1)
    } finally {
      writeRef.current = null
      if (!controller.signal.aborted) setSaving(false)
    }
  }

  return <section id="leaderboard" className={styles.panel} aria-labelledby="leaderboard-heading" tabIndex={-1}>
    <div className={styles.eyebrow}><Trophy size={14} /> A LITTLE FRIENDLY COMPETITION <span>ALL TIME</span></div>
    <div className={styles.heading}><h2 id="leaderboard-heading">Level {levelId} Top 10</h2><button type="button" className={styles.refresh} aria-label="Refresh leaderboard" disabled={!ready || saving || active} onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} /></button></div>
    <p className={styles.description}>Find your rhythm. See how it stacks up.</p>
    <label className={styles.levelLabel} htmlFor="leaderboard-level">Choose a level</label>
    <select id="leaderboard-level" value={levelId} disabled={active || saving} onChange={event => onLevelChange(Number(event.target.value))}>
      {LEVELS.map(item => <option key={item.id} value={item.id}>{item.id}. {item.title}</option>)}
    </select>
    <div className={styles.levelInfo}><span>{level.bpm} BPM · {level.durationMs / 1000} sec · {level.lanes === 1 ? '1 lane' : '2 lanes'}</span><strong>Your best: {best === undefined ? '—' : best}</strong></div>
    {!current && <p className={styles.message} role="status">Loading the Top 10…</p>}
    {current?.error && <div className={styles.error} role="status"><p>{current.error}</p><button type="button" onClick={() => setRevision(value => value + 1)}>Try again</button></div>}
    {data && <>
      {data.entries.length ? <table className={styles.table}>
        <caption className={styles.srOnly}>All-time top ten players for level {levelId}: {level.title}</caption>
        <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Score</th></tr></thead>
        <tbody>{data.entries.map(entry => <tr key={entry.displayName} data-you={entry.isYou}>
          <td><span className={styles.rank} data-first={entry.rank === 1}>#{entry.rank}</span></td>
          <th scope="row"><span className={styles.player}>{entry.displayName}{entry.isYou && <span className={styles.you}>You</span>}</span></th>
          <td className={styles.score}>{entry.score}<span> / 100</span></td>
        </tr>)}</tbody>
      </table> : <div className={styles.empty}><Trophy size={25} /><h3>The first spot is waiting.</h3><p>No public scores for this level yet. {data.profile?.listed ? 'Finish a round to set the pace.' : accountId ? 'Join and finish a round to set the pace.' : 'Sign in, choose a name, and set the pace.'}</p></div>}
      <p className={styles.rules}>One personal best per player. Equal scores share a rank. Ten players shown; earlier saved scores appear first in a tie.</p>
      {!accountId ? <div className={styles.join}>
        <h3>Your rhythm deserves a spot.</h3><p>Sign in free, then choose a public player name to join. Your saved best scores count.</p>
        <button type="button" className={styles.primary} disabled={!ready || active} onClick={() => void onLogin()}>Sign in to join the Top 10 <ArrowRight size={15} /></button>
      </div> : <ProfileControls profile={data.profile} onSave={saveProfile} disabled={!ready || active || saving} saving={saving} />}
    </>}
  </section>
}

function ProfileControls({ profile, onSave, disabled, saving }: { profile: LeaderboardProfile | null; onSave: (profile: LeaderboardProfile) => Promise<void>; disabled: boolean; saving: boolean }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (disabled) return
    setError('')
    try { await onSave({ displayName: normalizeDisplayName(name), listed: true }); setEditing(false) }
    catch (error) { setError(error instanceof Error ? error.message : 'Your name could not be saved. Try again.') }
  }
  const hide = async () => {
    if (!profile || disabled) return
    setError('')
    try { await onSave({ ...profile, listed: false }); setEditing(false) }
    catch (error) { setError(error instanceof Error ? error.message : 'Your scores could not be hidden. Try again.') }
  }
  const showForm = !profile || editing
  return <div className={styles.join}>
    {showForm ? <form onSubmit={submit}>
      <h3>{profile?.listed ? 'Make your name yours.' : 'Claim your place.'}</h3>
      <p>Your chosen name and saved best scores will be public on every level’s leaderboard. Your email stays private.</p>
      <label htmlFor="leaderboard-name">Public player name</label>
      <input id="leaderboard-name" name="displayName" value={name} onChange={event => setName(event.target.value)} autoComplete="off" minLength={3} maxLength={20} required disabled={disabled} aria-describedby="leaderboard-name-help" placeholder="e.g. RhythmRider" />
      <p id="leaderboard-name-help" className={styles.hint}>3–20 characters: A–Z, numbers, spaces, dots, underscores or hyphens.</p>
      <button className={styles.primary} disabled={disabled} type="submit">{saving ? 'Saving…' : profile?.listed ? 'Save player name' : 'Join leaderboard'} <ArrowRight size={15} /></button>
      {profile && <button className={styles.textButton} disabled={disabled} type="button" onClick={() => { setEditing(false); setError('') }}>Cancel</button>}
    </form> : <>
      <h3>{profile.listed ? 'You’re in. Keep the rhythm going.' : 'Your scores are hidden.'}</h3>
      <p>{profile.listed ? <>Playing as <strong>{profile.displayName}</strong>. Your saved personal bests update automatically.</> : <>Your progress is still saved. Join again as <strong>{profile.displayName}</strong> or choose a new name.</>}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.textButton} disabled={disabled} onClick={() => { setName(profile.displayName); setEditing(true); setError('') }}>{profile.listed ? 'Edit player name' : 'Join again'}</button>
        {profile.listed && <button type="button" className={styles.textButton} disabled={disabled} onClick={() => void hide()}>{saving ? 'Saving…' : 'Hide my scores'}</button>}
      </div>
    </>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>
}

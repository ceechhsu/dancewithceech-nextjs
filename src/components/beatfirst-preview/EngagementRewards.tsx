import { Flame, Music2 } from 'lucide-react'
import type { EngagementRewards as RewardsSummary } from './progress'
import styles from './EngagementRewards.module.css'

export default function EngagementRewards({ rewards, accountsEnabled, signedIn, loading }: {
  rewards: RewardsSummary | null
  accountsEnabled: boolean
  signedIn: boolean
  loading: boolean
}) {
  const checkedIn = rewards?.checkedInToday
  return <section className={styles.panel} aria-label="Rhythm rewards">
    <div className={styles.pointsRow}>
      <span className={styles.note} aria-hidden="true"><Music2 size={17} /></span>
      <div>
        <h2>Rhythm points</h2>
        <p>+10 per completed round · +20 per first pass</p>
      </div>
      {rewards && <strong className={styles.points}>{rewards.points.toLocaleString('en-US')}</strong>}
    </div>
    <div className={styles.dailyRow} role="status" aria-atomic="true">
      <Flame size={17} aria-hidden="true" />
      <div>
        <strong>{rewards?.currentStreak ? `${rewards.currentStreak}-day streak` : 'Daily check-in'}</strong>
        <p>{checkedIn ? <>
          +25 points for checking in today.{rewards.restarted && <> Welcome back. A fresh streak starts today.</>}
        </> : !accountsEnabled ? 'Account check-ins are unavailable on this staging deployment.' : loading ? 'Loading your check-in…' : signedIn ? 'Earn 25 points on your first visit each day.' : 'Sign in to save Rhythm Points and earn 25 points on your first visit each day.'}</p>
      </div>
      {!!rewards?.bestStreak && <small className={styles.best}>Best {rewards.bestStreak} {rewards.bestStreak === 1 ? 'day' : 'days'}</small>}
    </div>
  </section>
}

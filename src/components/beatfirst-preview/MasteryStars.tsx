import { Star } from 'lucide-react'
import { masteryStars } from './practice-goals'
import styles from './ClapGame.module.css'

export default function MasteryStars({ score }: { score: number | undefined }) {
  const count = masteryStars(score)
  return <span className={styles.stars} role="img" aria-label={`${count} of 3 mastery stars`}>
    {[1, 2, 3].map(star => <Star key={star} size={13} aria-hidden="true" fill={star <= count ? 'currentColor' : 'none'} data-earned={star <= count} />)}
  </span>
}

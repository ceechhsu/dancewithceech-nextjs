import Link from 'next/link'
import styles from './Journey.module.css'

export default function BeatFirstGuide() {
  return <section className={styles.guide} aria-labelledby="about-beatfirst">
    <span className={styles.accountEyebrow}>HOW BEATFIRST WORKS</span>
    <h2 id="about-beatfirst">A little practice. A stronger sense of rhythm.</h2>
    <p>Start with a ten-second clap rhythm. Listen to the four-beat count-in, then tap as each note reaches the line. Immediate feedback helps you notice whether you are early, late, or right on time. Misses never stop the beat.</p>
    <div className={styles.guideSteps}>
      <div><h3>1. Find the beat</h3><p>Play three free samples. No account or dance experience needed.</p></div>
      <div><h3>2. Keep your progress</h3><p>Sign in free with Google to save your scores and open levels 4–6 right away.</p></div>
      <div><h3>3. Grow your rhythm</h3><p>Score 80 to open each next level. Build up to two hands, new patterns, and faster tempos across 18 levels.</p></div>
    </div>
    <div className={styles.faq}>
      <h3>Frequently asked questions</h3>
      <details><summary>Is BeatFirst free?</summary><p>Yes. The three samples are available without signing in. A free Google sign-in lets you save progress and continue through all 18 levels.</p></details>
      <details><summary>Can I play on my phone?</summary><p>Yes. Turn your volume on and tap the pad with your thumb. In two-lane levels, play the gold kick on the left and the blue clap on the right. On a computer, use Space for one lane or F and J for two lanes.</p></details>
      <details><summary>How do I unlock levels and earn stars?</summary><p>Signing in opens levels 4–6. From level 6 onward, a personal best of 80 opens the next level. Earn one star at 80, two at 90, and three at 95. Lower scores on later attempts never take away your best or unlocked levels.</p></details>
      <details><summary>What should I do after BeatFirst?</summary><p>Bring that timing into your movement. Explore <Link href="/hip-hop-dance-moves">free dance tutorials</Link> or build your next skill with the <Link href="/running-man-method">Running Man Method</Link>.</p></details>
    </div>
  </section>
}

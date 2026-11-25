import Image from "next/image";
import Link from "next/link";
import styles from "./HomePrivateCoaching.module.css";
import ConsultationLink from "./ConsultationLink";

export default function HomePrivateCoaching({ heading = "Private Hip-Hop Dance Lessons", uniformHeading = false }: { heading?: string; uniformHeading?: boolean }) {
  return <section id="private-coaching" aria-labelledby="private-coaching-heading" className={styles.section}>
    <div className={styles.layout}>
      <div className={styles.intro}>
        <h2 id="private-coaching-heading" className={uniformHeading ? "home-section-heading" : styles.heading}>{heading}</h2>
        <p className={uniformHeading ? "home-section-tagline" : styles.audience}>For adults 18+</p>
        <p className={`${styles.availability}${uniformHeading ? " text-center" : ""}`}>Online or in person in San Jose.</p>
        <p className={`${styles.description}${uniformHeading ? " text-left" : ""}`}>When a move feels awkward, you need to know what to change. I’ll help you work on your rhythm, balance, and coordination, one step at a time.</p>
      </div>
      <Link id="virtual-coaching" href="/dance-floor-ready" prefetch={false} data-coaching-offer="online_coaching" aria-labelledby="online-coaching-title online-lessons-action" className={`${styles.card} ${styles.online}`}>
        <div className={styles.formatHeading}><h3 id="online-coaching-title">Online Hip-Hop Dance Lessons</h3><span><strong>Dance Floor Ready</strong> · 30 days of private coaching</span></div>
        <div className={styles.onlineVisual}><Image src="/dance-floor-ready-media/pilot/homepage-coaching-feedback.webp" unoptimized alt="Sample side-by-side coaching feedback: the dancer’s eighth step lands early while Ceech’s lands on the beat" width={1280} height={720} sizes="(min-width: 1200px) 560px, (min-width: 768px) 46vw, calc(100vw - 96px)" className={styles.onlineVisualImage} /></div>
        <p className={styles.formatDescription}>Learn to dance when nobody’s leading. Practice in short bursts, get private feedback, and compare your Day 1 and Day 30 clips.</p>
        <span id="online-lessons-action" className={styles.secondaryCta}>Explore Dance Floor Ready <span aria-hidden="true">→</span></span>
      </Link>
      <Link href="/private-lessons/san-jose" prefetch={false} data-coaching-offer="in_person" aria-labelledby="in-person-coaching-title in-person-lessons-action" className={`${styles.card} ${styles.inPerson}`}>
        <div className={styles.formatHeading}><h3 id="in-person-coaching-title">In-Person Hip-Hop Dance Lessons</h3><span>San Jose · Get Down Dance Studios · By appointment</span></div>
        <div className={styles.imageFrame}><Image src="/images/ceech/ceech-teaching-private-student-neck-control.jpg" unoptimized alt="Ceech explaining a neck movement during an in-person private lesson" width={1920} height={1000} sizes="(min-width: 1200px) 560px, (min-width: 768px) 46vw, calc(100vw - 96px)" className={styles.image} /></div>
        <p className={styles.formatDescription}>A 60-minute one-on-one lesson built around your goals, with specific corrections and drills to take home. Studio fees included.</p>
        <span id="in-person-lessons-action" className={styles.secondaryCta}>Explore San Jose lessons <span aria-hidden="true">→</span></span>
      </Link>
      <div className={styles.details}><div className={styles.actions}><ConsultationLink className={styles.primaryCta} /></div><p className={styles.callNote}>A phone conversation about your goals. No obligation to book a lesson.</p></div>
    </div>
  </section>;
}

import Image from "next/image";
import Link from "next/link";
import styles from "./HomePrivateCoaching.module.css";

export default function HomePrivateCoaching() {
  return (
    <section id="private-coaching" aria-labelledby="private-coaching-heading" className={styles.section}>
      <div className={styles.layout}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Private 1-on-1 Dance Coaching</p>
          <h2 id="private-coaching-heading" className={styles.heading}>
            Learn to dance with me.<br />
            <span>One on one.</span>
          </h2>
          <p className={styles.availability}>Online or in person in San Jose.</p>
          <p className={styles.description}>
            When a move feels awkward, you need to know what to change. I’ll help you work on your rhythm, balance, and coordination, one step at a time.
          </p>
        </div>

        <article className={styles.online} aria-labelledby="online-coaching-title">
          <div className={styles.formatHeading}>
            <h3 id="online-coaching-title">Online</h3>
            <span>Personal coaching, wherever you are</span>
          </div>
          <div className={styles.onlineVisual}>
            <Image
              src="/images/ceech/ceech-online-google-meet-real-cleaned-unmuted.png"
              alt="Student practicing during an online dance coaching session, with Ceech visible in the phone’s picture-in-picture view"
              width={1672}
              height={941}
              sizes="(min-width: 1200px) 560px, (min-width: 768px) 46vw, calc(100vw - 48px)"
              className={styles.onlineVisualImage}
            />
          </div>
          <p className={styles.caption}>A look inside a virtual coaching session.</p>
          <p className={styles.formatDescription}>
            Get recorded feedback on your dance video, then work through corrections together in a 30-minute Google Meet.
          </p>
          <Link href="/private-lessons#virtual-coaching" className={styles.secondaryCta} aria-label="Learn more about online 1-on-1 coaching">Learn More</Link>
        </article>

        <article className={styles.inPerson} aria-labelledby="in-person-coaching-title">
          <div className={styles.formatHeading}>
            <h3 id="in-person-coaching-title">In person</h3>
            <span>San Jose, California</span>
          </div>
          <div className={styles.imageFrame}>
            <Image
              src="/images/ceech/ceech-teaching-private-student-neck-control.jpg"
              alt="Ceech explaining a neck movement to a student during an in-person private lesson"
              width={1920}
              height={1000}
              sizes="(min-width: 1200px) 560px, (min-width: 768px) 46vw, calc(100vw - 48px)"
              className={styles.image}
            />
            <div className={styles.imageNote}>
              <span>The way I teach</span>
              <p>One correction.<br />One step forward.</p>
            </div>
          </div>
          <p className={styles.caption}>
            A moment from an in-person lesson with Ceech.
          </p>
          <p className={styles.formatDescription}>
            Work with me at Get Down Dance Studios. A 60-minute private lesson built around your goals, with specific corrections and drills to take home.
          </p>
          <Link href="/private-lessons/san-jose" className={styles.secondaryCta} aria-label="Learn more about in-person lessons in San Jose">Learn More</Link>
        </article>

        <div className={styles.details}>
          <div className={styles.actions}>
            <Link href="/private-lessons#booking" className={styles.primaryCta}>Book a Free Call</Link>
          </div>
          <p className={styles.callNote}>
            A free 30-minute phone conversation about your goals.<br />No obligation to book a lesson.
          </p>
        </div>

        <div className={styles.footer}>
          <p>Adults 18+ <span aria-hidden="true">·</span> Beginners welcome</p>
        </div>
      </div>
    </section>
  );
}

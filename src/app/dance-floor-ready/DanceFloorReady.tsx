"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { advanceFunnel, initialFunnel, readinessQuestions, type FunnelAction } from "@/lib/program-a/dance-floor-ready";
import { programA } from "@/lib/program-a/offer";
import { FREE_CONSULTATION_URL } from "@/lib/approved-pages/consultation";
import styles from "./DanceFloorReady.module.css";
import { useFitQuestionMusic } from "./useFitQuestionMusic";

const assets = "/dance-floor-ready-media/pilot";
const choices = ["ready", "nervous", "not-now"] as const;
const progressLabels = ["The Story", "How It Works", "Consultation"] as const;
const v2ProgressLabels = ["The Goal", "The Coaching", "Consultation"] as const;
const storyEyebrow = "Fully online · 30-day freestyle coaching pilot";
const v2StoryTitle = "Find the beat. Connect two moves. Keep dancing.";

function OfferTerms() {
  return <>
    <div className={styles.offerTerms}>
      <span><strong className={styles.price}>{programA.price}</strong> one-time coaching fee</span>
      <strong className={styles.guarantee}>Seven-day full refund guarantee</strong>
    </div>
    <p>Request a full refund by 11:59 p.m. Pacific on Day 7. Day 1 is your agreed coaching start date.</p>
  </>;
}

function Film({ chapter, label, videoRef, onEnd }: {
  chapter: 1 | 2;
  label: string;
  videoRef: Ref<HTMLVideoElement>;
  onEnd: () => void;
}) {
  const video = chapter === 1 ? "chapter-1-online" : "chapter-2-coaching-and-feedback";
  const captions = chapter === 1 ? "chapter-1-clarified" : video;
  return <video
    className={styles.film}
    aria-label={label}
    ref={videoRef}
    poster={`${assets}/chapter-${chapter}.webp`}
    src={`${assets}/${video}.mp4`}
    controls playsInline preload="none" width={1280} height={720} onEnded={onEnd}
  >
    <track kind="captions" label="English" srcLang="en" src={`${assets}/${captions}.en.vtt`} />
  </video>;
}

export default function DanceFloorReady({version = "current", showPreviewBadge = true}: {version?: "current" | "v2"; showPreviewBadge?: boolean}) {
  const v2 = version === "v2";
  const [state, setState] = useState(initialFunnel);
  const title = useRef<HTMLHeadingElement>(null);
  const mobileStoryTitle = useRef<HTMLHeadingElement>(null);
  const story = useRef<HTMLVideoElement>(null);
  const coaching = useRef<HTMLVideoElement>(null);
  const focus = useRef(false);
  const music = useFitQuestionMusic(`${assets}/fit-groove.mp3`);

  useEffect(() => {
    if (!focus.current) return;
    focus.current = false;
    const mobileHeading = state.stage === "story" ? mobileStoryTitle.current : null;
    const heading = mobileHeading?.getClientRects().length ? mobileHeading : title.current;
    heading?.focus();
    if (heading) window.scrollTo({ top: 0, behavior: "instant" });
  }, [state]);

  const stage = state.stage;
  const checkFitLabel = v2 ? "Check your fit" : "Skip to the fit questions";
  const activeQuestion = state.stage === "questions" || state.stage === "exit"
    ? readinessQuestions[state.question] : null;

  function go(action: FunnelAction) {
    const next = advanceFunnel(state, action);
    if (next === state) return;
    story.current?.pause();
    coaching.current?.pause();
    if (stage === "fit" && action === "yes") music.prepare();
    if (stage !== "questions" && next.stage === "questions") music.enter();
    if (stage === "questions" && next.stage !== "questions") music.leave();
    focus.current = true;
    setState(next);
    // The click that opens the coaching chapter also starts it. Native Play
    // remains available if the visitor's playback preferences block that.
    if (next.stage === "coaching" && action === "yes" && coaching.current) {
      coaching.current.currentTime = 0;
      void coaching.current.play().catch(() => undefined);
    }
  }

  const step = stage === "drill"
    ? (state.from === undefined ? 0 : 1)
    : { story: 0, fit: 0, coaching: 1, questions: 1, booking: 2, exit: 1 }[stage];
  const storyCard = <div className={styles.card}>
    <div className={v2 ? styles.desktopStoryIntro : undefined}>
      <p className={styles.eyebrow}>{storyEyebrow}</p>
      <h1 id="story-title" ref={stage === "story" ? title : undefined} tabIndex={-1}>{v2 ? v2StoryTitle : "Know what to do when the music starts."}</h1>
    </div>
    {v2 ? <>
      <p>You can follow a routine in class, but when a song comes on at a wedding or work party, you freeze. In 30 days of private online coaching, work on starting on your own and finding the beat again if you lose it.</p>
      <button className={styles.primary} type="button" onClick={() => go("continue")}>See if this is for you <span aria-hidden="true">→</span></button>
      <p className={styles.small}>With Ceech, teaching dance since 1998 · Adults 18+</p>
    </> : <>
      <p><strong className={styles.storyPromise}>Learn to dance when nobody’s leading.</strong> If you’ve taken classes but still feel stuck, fit short drills around work and get private video feedback from Ceech.</p>
      <p className={styles.storyProgress}><strong>Day 1 vs. Day 30:</strong> Film 30 seconds to the same part of the same song on both days. Watch your clips side by side to see what changed.</p>
      <p className={styles.small}>Space is limited · Adults 18+</p>
    </>}
    <details className={styles.textOption}><summary>Read instead</summary>
      <p>You’ve paid for dance lessons, practiced at home, and followed along in class. Then a friend waves you over at a wedding and you still don’t know how to start.</p>
      <p>Ceech has taught dance since 1998. Many people come to him after months of classes with other instructors. They can follow a routine in class but feel stuck when nobody’s leading. Dance Floor Ready is a 30-day online pilot that helps you find the beat, make your first move, and keep going. There’s no studio commute or weekly hour-long class.</p>
    </details>
  </div>;
  return <main className={`${styles.page}${v2 ? ` ${styles.salesPreview}` : ""}`} id="main-content" tabIndex={-1}>
    <div className={styles.shell} id="dance-floor-ready">
      <header className={styles.header}>
        <div className={styles.brand}>Dance Floor Ready</div>
        {showPreviewBadge && <span className={styles.preview}>{v2 ? "Private preview · V2" : "Private preview"}</span>}
      </header>
      <ol className={styles.steps} aria-label="Your progress">
        {(v2 ? v2ProgressLabels : progressLabels).map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined}>
          <span className={styles.stepNumber} aria-hidden="true">{i + 1}</span>{label}
        </li>)}
      </ol>

      <section hidden={stage !== "story"} aria-label={v2 ? v2StoryTitle : undefined} aria-labelledby={v2 ? undefined : "story-title"} className={`${styles.chapter}${v2 ? ` ${styles.outcomeChapter}` : ""}`}>
        {v2 && <div className={styles.mobileStoryIntro}>
          <p className={styles.eyebrow}>{storyEyebrow}</p>
          <h1 ref={mobileStoryTitle} tabIndex={-1}>{v2StoryTitle}</h1>
        </div>}
        <div className={styles.videoColumn}>
          <Film chapter={1} label="A wedding and a familiar feeling" videoRef={story} onEnd={() => stage === "story" && go("continue")} />
          <div className={styles.hint}><span>Chapter 1 · The story</span><span>Captions available</span></div>
          <div className={styles.storyActions}>
            <button className={v2 ? styles.secondary : styles.primary} type="button" onClick={() => { void story.current?.play().catch(() => story.current?.focus()); }}>
              Play the story <span aria-hidden="true">▶</span>
            </button>
            {!v2 && <button className={`${styles.secondary} ${styles.storySkip}`} type="button" onClick={() => go("continue")}>
              Skip to the question
            </button>}
          </div>
        </div>
        {storyCard}
      </section>

      {stage === "story" && v2 && <section className={styles.socialGuide} aria-labelledby="v2-approach-title">
        <div className={styles.guideIntro}>
          <h2 id="v2-approach-title">Learn what to do when nobody’s leading.</h2>
          <p>Short hip-hop drills give you something to practice between meetings or at home. Ceech reviews your clips privately so you know which part to keep and what to try differently.</p>
        </div>
        <ul className={styles.guideSituations} aria-label="What you’ll work on">
          <li><h3>Find the beat</h3><p>Listen for the rhythm and make your first move.</p></li>
          <li><h3>Connect two moves</h3><p>Switch between familiar steps without waiting for someone to lead.</p></li>
          <li><h3>Get back on beat</h3><p>Use a small reset so you can keep dancing when you lose your place.</p></li>
        </ul>
      </section>}

      {stage === "story" && !v2 && <section className={styles.socialGuide} aria-labelledby="social-guide-title">
        <div className={styles.guideIntro}>
          <h2 id="social-guide-title">Private online hip-hop dance lessons for adults</h2>
          <p>Dance Floor Ready is 30 days of personal coaching with Ceech for adults who can follow a routine in class but get stuck when nobody’s leading. Practice in two-minute bursts, get private feedback on your clips, and learn to freestyle without memorizing choreography.</p>
        </div>
        <div className={styles.guideDrill}>
          <h3>Try this before your next night out</h3>
          <p>Put on a song you know. Count “one, two, three, four” with the beat. Keep your knees soft and shift your weight left, right, left, right. When that feels steady, try a small step on each beat. If you lose the rhythm, go back to the weight shift.</p>
        </div>
        <ul className={styles.guideSituations} aria-label="Where to use it">
          <li><h3>At a wedding</h3><p>As a guest, start with a simple side-to-side step when someone waves you over.</p></li>
          <li><h3>At a club</h3><p>On a crowded floor, keep your feet close and groove in place.</p></li>
          <li><h3>At a work party</h3><p>When the song changes, listen for the new beat and reset with that small weight shift.</p></li>
        </ul>
        <button className={styles.secondary} type="button" onClick={() => go("continue")}>See if Dance Floor Ready fits <span aria-hidden="true">→</span></button>
      </section>}

      {stage === "fit" && <section className={styles.single} aria-labelledby="fit-title">
        <p className={styles.eyebrow}>{v2 ? "Who this is for" : "Let’s start here"}</p>
        <h2 id="fit-title" ref={title} tabIndex={-1}>Does this sound like you?</h2>
        <p className={styles.lead}>Have you ever paid for dance lessons, then gotten to a wedding or party and still thought, “What do I do now?”</p>
        <p>{v2 ? "This pilot is for adults who want to take what they’ve learned into real social settings, with short practice and private feedback they can fit around work." : "This pilot is fully online, for people who want private coaching they can fit around work and the rest of their week."}</p>
        <div className={styles.actions}>
          <button className={styles.primary} type="button" onClick={() => go("yes")}>{v2 ? "Yes, show me the coaching" : "Yes, that’s me"} <span aria-hidden="true">→</span></button>
          <button className={styles.secondary} type="button" onClick={() => go("no")}>No, not quite</button>
        </div>
        <button className={styles.back} type="button" onClick={() => go("back")}>← Back to the story</button>
      </section>}

      <section hidden={stage !== "coaching"} aria-labelledby="coaching-title" className={styles.chapter}>
        <div className={styles.videoColumn}>
          <Film chapter={2} label="How personal coaching works, with Ceech’s side-by-side feedback demo" videoRef={coaching} onEnd={() => stage === "coaching" && go("continue")} />
          <div className={styles.hint}><span>Chapter 2 · How it works</span><span>Captions available</span></div>
          {v2 && <button type="button" className={`${styles.primary} ${styles.mobileCoachingContinue}`} onClick={() => go("continue")}>{checkFitLabel}</button>}
        </div>
        <div className={styles.card}>
          <p className={styles.eyebrow}>How online coaching works</p>
          <h2 id="coaching-title" ref={stage === "coaching" ? title : undefined} tabIndex={-1}>{v2 ? "See exactly what to practice next." : "Start with a 30-second clip."}</h2>
          {v2 ? <>
            <p><strong>Practice a drill. Get one specific correction. Try it again.</strong> In this illustrated example, Ceech puts the student’s drill next to his reference and shows exactly where their timing differs.</p>
            <p className={styles.storyProgress}><strong>How you’ll see progress:</strong> Film your own freestyle to the same part of the same song on Day 1 and Day 30. Compare those two clips side by side.</p>
          </> : <p>Send Ceech a short clip on Day 1 so he can see where you’re starting. In the video, watch him compare a student’s clip with his own and show exactly where to adjust the timing.</p>}
          <details className={styles.textOption}><summary>Read the coaching steps</summary>
            <p>On Day 1, put on a song you know and film 30 seconds at home. Even stepping side to side counts. Send the clip privately to Ceech.</p>
            {v2 && <p>For coaching, watch Ceech’s reference drill and film yourself doing that same drill. Ceech compares your practice clip with his reference to give you one thing to work on.</p>}
            <p>In the example, both dancers land on the beat on the fourth step. On the eighth, the student touches down early. Ceech moves the replay forward frame by frame to show where his foot lands on the beat. His correction: practice that section until each step lands on the beat, then send another clip so he can check your timing again.</p>
            <p>Try a few reps in spare moments: a weight shift beside your desk, a small shoulder groove at lunch, or a gentle bounce while you wait in line.</p>
            <p>Send a practice clip each week, with one optional follow-up. On Day 30, film 30 seconds to the same part of the same song so you can see what changed.</p>
            <p>Ceech reviews every clip himself, so space is limited. Answer the next few questions honestly so you and Ceech can see if the coaching is a good fit.</p>
          </details>
          {v2 && <div className={styles.salesQuestions}>
            <details className={styles.textOption}><summary>How much time do I need?</summary>
              <p>Practice a few reps in short breaks, then set aside about five minutes a week to film a private clip. One clip is required each week, with one optional follow-up.</p>
            </details>
            <details className={styles.textOption}><summary>See the coaching price and refund terms</summary>
              <div className={styles.details}><OfferTerms /></div>
            </details>
          </div>}
          <div className={styles.actions}>
            <button className={v2 ? styles.secondary : styles.primary} type="button" onClick={() => { void coaching.current?.play().catch(() => coaching.current?.focus()); }}>
              Play How It Works <span aria-hidden="true">▶</span>
            </button>
            <button type="button" className={v2 ? `${styles.primary} ${styles.desktopCoachingContinue}` : styles.secondary} onClick={() => go("continue")}>{checkFitLabel}</button>
          </div>
          <button className={styles.back} type="button" onClick={() => go("back")}>← Back</button>
        </div>
      </section>

      {stage === "questions" && activeQuestion && <section className={styles.single} aria-labelledby="question-title">
        <p id="fit-question-count" className={styles.eyebrow}>Question {state.question + 1} of {readinessQuestions.length}</p>
        {state.question === 0 && <p id="fit-intro">{v2
          ? "Three quick questions about what the coaching asks of you: short practice, a private clip each week, and trying the feedback. You can keep going if you’re nervous and willing to try."
          : "You can practice a few reps at a time, wherever you have a spare moment. I review every weekly clip myself, so space is limited. Please answer honestly so we can see if the online coaching fits your day."
        }</p>}
        <h2 id="question-title" ref={title} tabIndex={-1} aria-describedby={state.question === 0 ? "fit-question-count fit-intro" : "fit-question-count"}>{activeQuestion.prompt}</h2>
        <div className={styles.answers}>
          {activeQuestion.options.map((option, i) => <button key={option} className={styles.choice} type="button" onClick={() => go(choices[i])}>
            {option}<span aria-hidden="true">→</span>
          </button>)}
        </div>
        <div className={styles.questionTools}>
          <button className={styles.back} type="button" onClick={() => go("back")}>← Back</button>
          <button className={styles.musicControl} type="button" title={music.playback === "playing" ? "Background music is playing" : undefined} onClick={music.toggle}>
            <span aria-hidden="true">♫</span>
            {music.playback === "blocked" ? "Play background music" : music.playback === "off" ? "Turn music on" : "Turn music off"}
          </button>
        </div>
      </section>}

      {stage === "exit" && activeQuestion && <section className={styles.single} aria-labelledby="exit-title">
        <p className={styles.eyebrow}>Find your next step</p>
        <h2 id="exit-title" ref={title} tabIndex={-1}>You can start smaller.</h2>
        <p className={styles.lead}>{activeQuestion.exit}</p>
        <button className={styles.primary} type="button" onClick={() => go("drill")}>Try the free two-minute drill</button>
        <button className={styles.back} type="button" onClick={() => go("back")}>← Review my answer</button>
      </section>}

      {stage === "drill" && <section className={styles.single} aria-labelledby="drill-title">
        <p className={styles.eyebrow}>Free two-minute drill</p>
        <h2 id="drill-title" ref={title} tabIndex={-1}>Find the beat and make your first move.</h2>
        <p className={styles.lead}>Put on a familiar song with a clear beat. Keep the movement small.</p>
        <ol className={styles.drill}>
          <li><strong>0:00–0:30</strong><span>Listen and tap your hand or foot on each beat. Count “one, two, three, four” and repeat.</span></li>
          <li><strong>0:30–1:00</strong><span>Keep tapping and shift your weight gently from one foot to the other on each beat.</span></li>
          <li><strong>1:00–2:00</strong><span>Try a small step to the right on one, then to the left on two. Repeat. If you lose the beat, go back to tapping and start again.</span></li>
        </ol>
        <button className={styles.back} type="button" onClick={() => go("back")}>← Back to your answer</button>
      </section>}

      {stage === "booking" && <section className={`${styles.single} ${styles.booking}`} aria-labelledby="booking-title">
        <p className={styles.eyebrow}>Your next step · Fully online pilot</p>
        <h2 id="booking-title" ref={title} tabIndex={-1}>{v2 ? "Let’s see whether the coaching fits." : "Talk one-on-one with Ceech."}</h2>
        <p className={styles.lead}>{v2 ? "On a free 30-minute call with Ceech, talk through one dance-floor moment, what you’ve already tried, and what you’d like to do differently." : "On your free 30-minute phone call, we’ll talk about where you get stuck and whether the pilot fits."}</p>
        <div className={styles.details}>
          <h3 className={styles.offerHeading}>What’s included</h3>
          <ul className={styles.offerInclusions}>
            <li>{programA.days} days online, starting with a short kickoff call</li>
            <li>Two-minute drills and up to two private clip reviews a week</li>
            <li>Standard feedback by the end of the next business day</li>
            <li>Day 1 and Day 30 clips to compare your progress</li>
          </ul>
          <OfferTerms />
        </div>
        <a className={styles.primary} href={FREE_CONSULTATION_URL} target="_blank" rel="noopener noreferrer" aria-describedby="fit-call-booking-note">
          Book a free consultation <span aria-hidden="true">→</span>
        </a>
        <p id="fit-call-booking-note" className={styles.small}>No payment to book. Opens in Calendly.</p>
        {v2 && <details className={styles.textOption}><summary>What to bring to the call</summary>
          <p>Think of one upcoming event or a recent time you sat out, and what you wish you’d been able to do. You don’t need to send a clip for the call. Once you book, Calendly handles confirmation and rescheduling.</p>
        </details>}
        <button className={styles.back} type="button" onClick={() => go("back")}>← Back</button>
      </section>}
    </div>
  </main>;
}

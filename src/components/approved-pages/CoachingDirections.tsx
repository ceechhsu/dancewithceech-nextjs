"use client";

import { useId, useState, useSyncExternalStore } from "react";
import styles from "./CoachingDirections.module.css";

const steps = [
  { title: "Send your dance video", detail: "Choose an already-recorded, full-body dance video on your phone and send it to Ceech.", timing: "Your own recorded video" },
  { title: "Get recorded corrections", detail: "Ceech reviews your video and sends personalized recorded feedback within three business days.", timing: "Recorded feedback · Within 3 business days" },
  { title: "Practice together live", detail: "Meet Ceech on Google Meet for 30 minutes to work through the corrections together.", timing: "Live coaching · 30-minute Google Meet" },
];
const sceneLabels = [
  "A student chooses a saved full-body dance video on a phone. The video travels to Ceech and receives a sent checkmark.",
  "Ceech watches the student's recording, marks a correction and returns a playable recorded-feedback clip. This is an asynchronous review, not a live call.",
  "The student and Ceech appear in two live video-call tiles, practicing the same movement together.",
];
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Dancer({ x, y, scale = 1, teacher = false, move = false }: { x: number; y: number; scale?: number; teacher?: boolean; move?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} className={teacher ? styles.teacher : styles.student}>
    <ellipse cx="0" cy="106" rx="34" ry="6" className={styles.shadow} />
    <g className={move ? styles.danceBody : undefined}>
      <path d="M-12 59 -19 82 -28 102 M11 59 21 80 29 102" className={styles.legs} />
      <path d="M-29 104h-12 M28 104h13" className={styles.shoes} />
      <path d="M-13 22q13-9 26 0l5 37h-36z" className={styles.shirt} />
      <g className={move ? styles.danceArm : undefined}><path d="M-14 27 -30 44 -43 30" className={styles.arm} /><circle cx="-43" cy="30" r="4" className={styles.skin} /></g>
      <g className={move ? styles.otherArm : undefined}><path d="M14 27 30 40 42 22" className={styles.arm} /><circle cx="42" cy="22" r="4" className={styles.skin} /></g>
      <rect x="-5" y="9" width="10" height="13" rx="4" className={styles.skin} />
      <circle cy="0" r="15" className={styles.skin} />
      <path d={teacher ? "M-15-2q-2-20 16-17 15 0 14 16L3-9-6-4z" : "M-15 2q-8-23 13-22 23-2 18 24l-7-13-24 5z"} className={styles.hair} />
      <path d="M-5 3h1m8 0h1" className={styles.face} /><path d="M-4 9q4 3 8 0" className={styles.smile} />
    </g>
  </g>;
}
function Check({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} className={styles.check}><circle r="12" className={styles.checkCircle} /><path d="m-6 0 4 4 8-9" className={styles.checkMark} /></g>;
}
function Scene({ step }: { step: number }) {
  const uid = useId();
  return <svg viewBox="0 0 340 244" role="img" aria-labelledby={`${uid}-title ${uid}-desc`} className={styles.scene}>
    <title id={`${uid}-title`}>{steps[step].title}</title><desc id={`${uid}-desc`}>{sceneLabels[step]}</desc>
    <defs><pattern id={`${uid}-grid`} width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="currentColor" strokeWidth=".5" /></pattern></defs>
    <rect width="340" height="244" rx="20" className={styles.sceneBackground} />
    <rect width="340" height="244" rx="20" fill={`url(#${uid}-grid)`} className={styles.grid} />
    <circle cx="280" cy="45" r="37" className={styles.orbit} /><path d="M21 211h298" className={styles.floor} />
    {step === 0 && <>
      <Dancer x={68} y={103} scale={.87} />
      <rect x="94" y="107" width="19" height="32" rx="4" className={styles.phoneSmall} /><path d="m99 121 4 4 5-7" className={styles.smallCheck} />
      <rect x="139" y="27" width="100" height="174" rx="17" className={styles.device} /><rect x="149" y="51" width="80" height="111" rx="8" className={styles.screen} />
      <rect x="172" y="35" width="34" height="4" rx="2" className={styles.speaker} />
      <text x="189" y="66" textAnchor="middle" className={styles.microLabel}>SAVED VIDEO</text>
      <Dancer x={189} y={91} scale={.5} />
      <circle cx="214" cy="147" r="10" className={styles.playCircle} /><path d="m212 142 7 5-7 5z" className={styles.playIcon} />
      <rect x="155" y="171" width="68" height="20" rx="10" className={styles.blueFill} /><text x="189" y="185" textAnchor="middle" className={styles.whiteLabel}>SEND VIDEO ↑</text>
      <path d="M245 136q40 0 40-40" className={styles.sendTrack} />
      <g className={styles.packet}><rect x="257" y="114" width="27" height="21" rx="5" className={styles.packetFill} /><path d="m268 119 8 5-8 6z" className={styles.packetPlay} /></g>
      <circle cx="287" cy="68" r="23" className={styles.recipient} /><Dancer x={287} y={64} scale={.26} teacher />
      <text x="287" y="106" textAnchor="middle" className={styles.label}>Ceech</text><Check x={309} y={51} />
      <text x="189" y="227" textAnchor="middle" className={styles.label}>Already recorded. Ready to send.</text>
    </>}
    {step === 1 && <>
      <rect x="20" y="38" width="194" height="128" rx="12" className={styles.device} /><rect x="29" y="47" width="176" height="98" rx="5" className={styles.screen} />
      <Dancer x={95} y={71} scale={.61} />
      <path d="m100 104 24 3 9-20" className={styles.annotation} /><circle cx="122" cy="104" r="20" className={styles.annotationCircle} />
      <path d="M37 155h159" className={styles.timelineBase} /><path d="M37 155h159" className={styles.timeline} /><path d="m38 149 8 5-8 5z" className={styles.playIcon} />
      <path d="M102 166v14m-29 0h58" className={styles.stand} />
      <Dancer x={268} y={93} scale={.85} teacher /><path d="m236 128-20-12-20 3" className={styles.pointerArm} />
      <rect x="28" y="188" width="284" height="43" rx="10" className={styles.feedbackClip} />
      <circle cx="48" cy="209" r="12" className={styles.playCircle} /><path d="m45 203 9 6-9 6z" className={styles.playIcon} />
      <text x="68" y="205" className={styles.feedbackLabel}>RECORDED CORRECTIONS</text>
      <g className={styles.waveform}>{[5,10,7,13,9,6,12,8,5,10,7,11].map((h,i)=><rect key={i} x={70+i*9} y={218-h/2} width="4" height={h} rx="2" />)}</g>
      <path d="M209 216h66m-8-7 9 7-9 7" className={styles.returnArrow} /><Check x={294} y={209} />
      <rect x="36" y="17" width="145" height="23" rx="11" className={styles.badge} /><text x="108" y="32" textAnchor="middle" className={styles.label}>WATCH · MARK · SEND BACK</text>
    </>}
    {step === 2 && <>
      <rect x="20" y="42" width="300" height="157" rx="14" className={styles.device} />
      <rect x="30" y="53" width="134" height="117" rx="8" className={styles.screen} /><rect x="176" y="53" width="134" height="117" rx="8" className={styles.screen} />
      <Dancer x={97} y={80} scale={.67} move /><Dancer x={243} y={80} scale={.67} teacher move />
      <rect x="39" y="145" width="53" height="17" rx="5" className={styles.nameBadge} /><text x="65" y="157" textAnchor="middle" className={styles.whiteLabel}>YOU</text>
      <rect x="185" y="145" width="59" height="17" rx="5" className={styles.nameBadge} /><text x="214" y="157" textAnchor="middle" className={styles.whiteLabel}>CEECH</text>
      <circle cx="146" cy="184" r="7" className={styles.callButton} /><circle cx="170" cy="184" r="7" className={styles.callButton} /><rect x="186" y="177" width="27" height="14" rx="7" className={styles.endCall} /><path d="m193 185q7-5 13 0" className={styles.callLine} />
      <rect x="115" y="16" width="110" height="24" rx="12" className={styles.liveBadge} /><circle cx="131" cy="28" r="3" className={styles.liveDot} /><text x="176" y="32" textAnchor="middle" className={styles.liveLabel}>LIVE TOGETHER</text>
      <path d="m161 211 9 7 9-7m-9 7v-16" className={styles.syncArrow} /><text x="170" y="236" textAnchor="middle" className={styles.label}>See it. Try it. Adjust together.</text>
    </>}
  </svg>;
}
function Direction({ playful, reduced, embedded = false }: { playful: boolean; reduced: boolean; embedded?: boolean }) {
  const [playing, setPlaying] = useState(true);
  const [replay, setReplay] = useState(0);
  const id = embedded ? "online-coaching" : playful ? "playful" : "polished";
  return <section id={id} aria-labelledby={`${id}-heading`} className={`${styles.direction} ${playful ? styles.playful : styles.polished} ${embedded ? styles.embedded : ""}`} data-playing={playing && !reduced}>
    <div className={embedded ? styles.embeddedHeading : styles.directionHeading}>
      <div>
        <p className={embedded ? "funnel-eyebrow text-center" : styles.kicker}>{embedded ? "Personal feedback · Adults 18+ · Worldwide" : `DIRECTION ${playful ? "A" : "B"}`}</p>
        <h2 id={`${id}-heading`} className={embedded ? "home-section-heading" : undefined}>{embedded ? "One video. Clear feedback. Practice together." : playful ? "A little character. A clear next step." : "Your progress, clearly in view."}</h2>
        <p className={embedded ? "home-section-tagline" : styles.description}>{embedded ? "A complete online coaching cycle connects your own dancing with specific corrections and a live session. Start with a free phone consultation to discuss your goals." : playful ? "Playful cartoon · Rounded characters, warm details and a little bounce." : "Polished illustration · Quiet motion, precise lines and a focused studio feel."}</p>
      </div>
      <div className={styles.controls} role="group" aria-label={`${playful ? "Playful" : "Polished"} animation controls`}>
        <button type="button" disabled={reduced} aria-pressed={!playing} onClick={()=>setPlaying(!playing)}>{reduced ? "Motion off" : playing ? "Pause animations" : "Resume animations"}</button>
        <button type="button" disabled={reduced} onClick={()=>{setReplay(replay+1);setPlaying(true);}}>↻ Replay</button>
      </div>
    </div>
    <ol className={styles.steps} key={replay}>{steps.map((step,index)=><li key={step.title} className={styles.step}>
      <div className={styles.art}><span className={styles.number}>0{index+1}</span><Scene step={index} /></div>
      <div className={styles.stepCopy}><p className={styles.timing}>{step.timing}</p><h3>{step.title}</h3><p>{step.detail}</p></div>
    </li>)}</ol>
    {embedded && <p className={styles.cycleNote}>One video submission and one recorded review per cycle. Additional recorded reviews are not included in the same cycle. Appointments are arranged in Pacific Time.</p>}
    <p className={styles.motionNote}>{reduced ? "Reduced motion is on. The still illustrations show every step." : "Each action loops in 4.8 seconds. Pause to compare, or replay from the start."}</p>
  </section>;
}
export function OnlineCoachingCycle() {
  const reduced = useSyncExternalStore(subscribeMotion, getReducedMotion, ()=>true);
  return <div className="bg-surface"><Direction playful={false} reduced={reduced} embedded /></div>;
}


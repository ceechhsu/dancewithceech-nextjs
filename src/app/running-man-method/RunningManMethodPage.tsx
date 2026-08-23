import {
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CirclePlay,
  Clock3,
  GraduationCap,
  HeartHandshake,
  Infinity as InfinityIcon,
  LockKeyhole,
  Music2,
  RefreshCw,
  Sparkles,
  Target,
  Upload,
  UserRoundCheck,
  UsersRound,
  Video,
} from "lucide-react";
import Image from "next/image";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import HeroSeatStatus from "@/components/running-man/HeroSeatStatus";
import EnrollmentPanel from "@/components/running-man/EnrollmentPanel";

const enrollmentHref = "#enroll";

const cohortFacts = [
  { icon: CalendarDays, label: "Four-week cohort", value: "September 24–October 22, 2026" },
  { icon: Clock3, label: "Weekly live sessions", value: "Thursdays at 8:00 p.m. Pacific" },
  { icon: UsersRound, label: "Small-group support", value: "Adults 18+ · Only 12 seats" },
];

const learningPath = [
  {
    number: "01",
    title: "Learn One Skill at a Time",
    copy: "Follow short, progressive drills that break the Running Man into manageable skills—including rhythm, balance, coordination, and movement.",
  },
  {
    number: "02",
    title: "Practice Until You’re Ready",
    copy: "There is no arbitrary number of minutes. Repeat each drill until you believe you can demonstrate it correctly, then record your submission.",
  },
  {
    number: "03",
    title: "Receive Feedback and Improve",
    copy: "At key Mastery Checkpoints, Ceech explains what you are doing well and what needs adjustment. Practice the correction and resubmit when needed.",
  },
  {
    number: "04",
    title: "Build Confidence Gradually",
    copy: "Begin by sharing with one supportive classmate, progress to a small group, and eventually share with the cohort.",
  },
  {
    number: "05",
    title: "Complete the Graduation Challenge",
    copy: "Perform the Running Man continuously and on beat for at least 30 seconds—live in front of Ceech and your fellow students.",
  },
];

const inclusions = [
  {
    icon: CirclePlay,
    title: "Step-by-Step Video Training",
    copy: "Short lessons and drills that build rhythm, balance, coordination, movement, and muscle memory without overwhelming you with choreography.",
  },
  {
    icon: Upload,
    title: "Practice Submissions",
    copy: "Practice until you believe you have mastered each drill, then record and submit your performance to stay accountable.",
  },
  {
    icon: LockKeyhole,
    title: "Weekly Private Mastery Checkpoints",
    copy: "Complete a privately graded checkpoint each week so Ceech can assess whether you are developing the skills correctly.",
  },
  {
    icon: UserRoundCheck,
    title: "Personalized Feedback From Ceech",
    copy: "Learn what you are doing well, what needs adjustment, and what to practice next—with opportunities to revise and resubmit.",
  },
  {
    icon: Video,
    title: "Four Weekly Live Cohort Sessions",
    copy: "Join a required 30-minute progress check, assignment review, and group Q&A. Ceech may remain up to 30 additional minutes for optional coaching.",
  },
  {
    icon: HeartHandshake,
    title: "Gradual Confidence Training",
    copy: "Progress from one classmate to a small group and eventually the cohort, so being seen while dancing becomes more comfortable.",
  },
  {
    icon: GraduationCap,
    title: "Live Graduation Challenge",
    copy: "Complete a single-take, 30-second Running Man performance—continuously and on beat—in front of Ceech and your cohort.",
  },
  {
    icon: InfinityIcon,
    title: "Lifetime Video Access",
    copy: "Continue reviewing and practicing with the recorded lesson videos after the four-week cohort ends.",
  },
  {
    icon: Sparkles,
    title: "Bonus Session Recordings",
    copy: "When available, recordings of the weekly live sessions will be provided for review. Live participation remains important.",
  },
];

const faqItems = [
  {
    question: "Do I need previous dance experience?",
    answer: "No. The Running Man Method is designed for complete and frustrated adult beginners. You must be at least 18 years old.",
  },
  {
    question: "What if I have no rhythm?",
    answer: "You should be able to recognize and follow a basic beat before enrolling. If you cannot yet do that, begin with the free Beat First rhythm-training tool, then return when your rhythm foundation is stronger.",
    link: true,
  },
  {
    question: "Are there any physical requirements?",
    answer: "You should be able to safely perform a light hop on the balls of your feet without pain or instability. If an injury, medical condition, or physical limitation could make the movement unsafe, consult a qualified healthcare professional before enrolling. If you simply feel uncoordinated, that is okay—the drills are designed to train coordination progressively.",
  },
  {
    question: "Do I need special shoes or flooring?",
    answer: "No special equipment is required. Comfortable sneakers are recommended, but you may practice barefoot if that feels safe and comfortable. A smooth, clear surface such as hardwood, tile, or linoleum is ideal.",
  },
  {
    question: "How much time must I practice each day?",
    answer: "There is no arbitrary daily-minute requirement. Practice each short drill until you believe you can demonstrate it correctly. Progress is based on mastery—not minutes watched.",
  },
  {
    question: "How does personalized feedback work?",
    answer: "You will complete a private Mastery Checkpoint each week. Ceech will review it within 24 hours and explain what you are doing well and what needs adjustment. If revision is needed, practice the correction and resubmit within 48 hours. You may revise and resubmit as many times as necessary while the cohort is active.",
  },
  {
    question: "What happens during the weekly live sessions?",
    answer: "The required 30-minute core session includes a progress check, assignment review, and group Q&A. When additional support is needed, Ceech may remain for up to 30 minutes of optional extended coaching. Sessions take place Thursdays at 8:00 p.m. Pacific Time.",
  },
  {
    question: "What if I miss a live session?",
    answer: "Session recordings will be provided as an added bonus when available. Recordings do not replace required live participation unless your absence has been approved.",
  },
  {
    question: "Who will see my video submissions?",
    answer: "Practice sharing expands gradually: an assigned partner in Week 1, a small group of three or four in Week 2, and the full cohort in Week 3. Graded Mastery Checkpoints remain private between you and Ceech. The final Graduation Challenge is performed live for Ceech and the cohort.",
  },
  {
    question: "What happens if I don’t pass the Graduation Challenge?",
    answer: "Every student may make up to two graduation attempts. Students who submit all required work on time, complete assigned peer feedback, attend required sessions unless excused, and participate in graduation may repeat the next available Running Man Method cohort once at 50% off if they do not pass.",
  },
  {
    question: "How long will I have access?",
    answer: "You will receive lifetime access to the recorded training videos. Personal feedback, grading, live coaching, and cohort-community access end on graduation day.",
  },
  {
    question: "What is the refund policy?",
    answer: "You may request a full refund through Day 5 of the program. No refunds are available after Day 5, including for missed sessions or unfinished assignments. The cohort requires at least eight students. If Ceech cancels or postpones it, you may choose a full refund or transfer after the next cohort dates are confirmed.",
  },
];

function SectionHeading({ eyebrow, title, copy, align = "center" }: { eyebrow: string; title: string; copy?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FDB515]">{eyebrow}</p>
      <h2 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-white sm:text-5xl lg:text-6xl">{title}</h2>
      {copy ? <p className="mt-5 text-lg leading-8 text-white/60">{copy}</p> : null}
    </div>
  );
}

function PrimaryCta({ label = "Claim My Founding-Cohort Seat", href = enrollmentHref }: { label?: string; href?: string }) {
  return (
    <a href={href} className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#2563EB] px-7 text-center text-base font-bold text-white shadow-[0_16px_44px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515]">
      {label}
    </a>
  );
}

function VideoTestimonial({ id, name, title, copy, featured = false }: { id: string; name: string; title: string; copy: string; featured?: boolean }) {
  return (
    <article className={`overflow-hidden rounded-3xl border border-white/10 bg-[#111] ${featured ? "lg:grid lg:grid-cols-[1.2fr_0.8fr]" : ""}`}>
      <div className={`relative ${featured ? "aspect-video lg:aspect-auto" : "aspect-video"}`}>
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={`${name} student testimonial about learning dance with Ceech`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="absolute inset-0 h-full w-full" />
      </div>
      <div className="p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563EB]">{name}</p>
        <h3 className="mt-3 font-display text-3xl font-bold uppercase leading-tight text-white">{title}</h3>
        <p className="mt-4 text-base leading-7 text-white/60">{copy}</p>
      </div>
    </article>
  );
}

export default function RunningManMethodPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] pb-20 text-[#F9F9F9] md:pb-0">
      <Nav />

      <section className="relative isolate px-5 pb-20 pt-28 sm:px-8 lg:px-10 lg:pb-28 lg:pt-36">
        <div aria-hidden="true" className="absolute -left-40 top-24 -z-10 h-96 w-96 rounded-full bg-[#2563EB]/15 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-48 bottom-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#FDB515]/8 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
            <div className="mb-7 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em]">
              <span className="rounded-full border border-[#FDB515]/30 bg-[#FDB515]/10 px-3 py-1.5 text-[#FDB515]">Founding Cohort</span>
              <span className="text-white/45">The Dance With Ceech System</span>
            </div>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.94] tracking-[-0.025em] text-white sm:text-6xl lg:text-7xl">Learn the Running Man—and Finally Feel Ready to Join the Dance Floor</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">A four-week online cohort for complete and frustrated adult beginners who are tired of copying choreography and guessing whether they are practicing correctly.</p>
            <div className="mt-7 max-w-2xl border-l-2 border-[#FDB515] bg-white/[0.035] px-5 py-4 text-sm leading-6 text-white/70 sm:text-base">
              <strong className="text-white">What is the Running Man?</strong>{" "}The iconic hip-hop move that creates the illusion of running in place—a recognizable, versatile step you can use with many different songs.
            </div>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">Ceech will guide you through simple, progressive drills and give you personalized feedback at key mastery checkpoints, so you know what to adjust and what to practice next.</p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {cohortFacts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <Icon aria-hidden="true" className="mb-3 h-5 w-5 text-[#2563EB]" />
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/40">{label}</p>
                  <p className="mt-1.5 text-sm font-semibold leading-5 text-white/90">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <PrimaryCta label="View Founding-Cohort Enrollment" />
              <p className="text-sm leading-5 text-white/50">Enrollment closes September 17<br />or when all 12 seats are filled.</p>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#2563EB]/30 via-transparent to-[#FDB515]/25 blur-xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#111] shadow-2xl">
              <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]">
                <Image src="/images/ceech/running-man-method-class.jpg" alt="Ceech teaching adult dance students the Running Man in a group class" fill priority sizes="(min-width: 1024px) 42vw, 92vw" className="object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FDB515]">Your graduation goal</p>
                <p className="mt-2 max-w-md font-display text-3xl font-bold uppercase leading-tight text-white sm:text-4xl">30 seconds. On beat. Live. Confident.</p>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/70">Every week prepares you gradually for one clear, measurable performance in front of Ceech and your supportive cohort.</p>
              </div>
            </div>
            <div className="absolute -right-2 -top-5 rotate-3 rounded-xl border border-[#FDB515]/30 bg-[#15120A] px-4 py-3 shadow-xl sm:right-5">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#FDB515]">Limited to 12 students</p>
              <HeroSeatStatus />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0D0D0D] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading eyebrow="The real problem" title="You Don’t Need More Choreography. You Need One Move You Can Trust." align="left" />
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-10">
            <p className="text-xl leading-8 text-white/80">You want to join the dance floor—but you do not know what to do once you get there.</p>
            <blockquote className="my-7 border-l-2 border-[#FDB515] pl-5 font-display text-3xl font-bold uppercase leading-tight text-white">“Am I doing it correctly? Will I look awkward? What if everyone sees that I don’t know how to dance?”</blockquote>
            <p className="leading-7 text-white/60">So you stay near the wall, wait for someone else to go first, or rely on a little “liquid courage” before you feel comfortable enough to try.</p>
            <p className="mt-5 leading-7 text-white/75">That does not mean you are incapable of dancing. It means you have not been given a clear foundation—or the feedback needed to know that you are practicing correctly.</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Why tutorials often fall short" title="Copying the Steps Isn’t the Same as Learning to Dance" copy="Many dance tutorials show you where to put your feet and expect you to follow along. But they frequently leave out one of the most important parts of dancing: rhythm." />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-[#2563EB]/25 bg-[#2563EB]/8 p-7 sm:p-9">
              <Music2 aria-hidden="true" className="h-9 w-9 text-[#2563EB]" />
              <h3 className="mt-6 font-display text-3xl font-bold uppercase text-white">Rhythm Before Repetition</h3>
              <p className="mt-4 leading-7 text-white/60">You can memorize every step and still feel awkward if you do not understand how the movement connects to the beat. The Running Man Method trains the rhythm—not only the foot pattern.</p>
            </article>
            <article className="rounded-3xl border border-[#FDB515]/25 bg-[#FDB515]/8 p-7 sm:p-9">
              <Award aria-hidden="true" className="h-9 w-9 text-[#FDB515]" />
              <h3 className="mt-6 font-display text-3xl font-bold uppercase text-white">Teaching, Not Just Demonstrating</h3>
              <p className="mt-4 leading-7 text-white/60">A great dancer can make a move look effortless. An experienced teacher can break it into beginner-friendly steps, identify why you are struggling, and explain exactly what needs to change.</p>
            </article>
          </div>
          <div className="mt-8 grid gap-3 rounded-3xl border border-white/10 bg-[#111] p-7 sm:grid-cols-2 sm:p-9 lg:grid-cols-4">
            {["Train the rhythm", "Master simple drills", "Receive accurate feedback", "Correct mistakes early"].map((item) => (
              <div key={item} className="flex items-center gap-3"><CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#2563EB]" /><span className="text-sm font-semibold text-white/80">{item}</span></div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-lg leading-8 text-white/65">You will not just copy the Running Man. You will learn how to make it work with your body and the music.</p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0D0D0D] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="The method" title="A Clear Path From “I Don’t Know What to Do” to “I Can Do This”" copy="You will not be thrown into the final performance unprepared. Every part of the program progressively trains you for that moment." />
          <ol className="relative mt-16 space-y-5 before:absolute before:bottom-8 before:left-[1.55rem] before:top-8 before:w-px before:bg-gradient-to-b before:from-[#2563EB] before:via-white/15 before:to-[#FDB515] md:grid md:grid-cols-5 md:gap-4 md:space-y-0 md:before:left-10 md:before:right-10 md:before:top-[1.55rem] md:before:h-px md:before:w-auto">
            {learningPath.map((step) => (
              <li key={step.number} className="relative grid grid-cols-[3.2rem_1fr] gap-5 rounded-2xl border border-white/10 bg-[#111] p-5 md:block md:min-h-[21rem] md:p-6">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#2563EB]/50 bg-[#0A0A0A] font-display text-lg font-bold text-[#FDB515]">{step.number}</span>
                <div><h3 className="font-display text-2xl font-bold uppercase leading-tight text-white md:mt-7">{step.title}</h3><p className="mt-3 text-sm leading-6 text-white/55">{step.copy}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Know before you enroll" title="Is The Running Man Method Right for You?" />
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-[#2563EB]/30 bg-[#2563EB]/8 p-7 sm:p-9">
              <h3 className="font-display text-3xl font-bold uppercase text-white">This program is for you if:</h3>
              <ul className="mt-7 space-y-4">
                {["You are a complete beginner and do not know what to do on the dance floor.", "You have tried classes or tutorials but still feel unsure.", "Choreography classes move too quickly to build a foundation.", "You want to understand rhythm—not merely imitate steps.", "You want personalized feedback and are willing to make corrections.", "You can follow a basic beat but struggle to coordinate the movement.", "You want to become more comfortable dancing in front of others."].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-white/75"><Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" /><span>{item}</span></li>
                ))}
              </ul>
            </article>
            <article className="rounded-3xl border border-[#FDB515]/30 bg-[#FDB515]/7 p-7 sm:p-9">
              <h3 className="font-display text-3xl font-bold uppercase text-white">It may not be right for you yet if:</h3>
              <ul className="mt-7 space-y-4">
                {["You cannot yet recognize or move with a basic beat.", "You cannot safely perform a light hop on the balls of your feet without pain or instability.", "An injury, medical condition, or physical limitation may make the movement unsafe.", "You only want choreography for one particular song.", "You want a passive course that requires no practice.", "You are unwilling to record your dancing or participate in graduation.", "You are an advanced dancer seeking audition choreography."].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-white/70"><Target aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#FDB515]" /><span>{item}</span></li>
                ))}
              </ul>
              <a href="https://dancewithceech.com/beat-first" className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#FDB515]/40 px-5 py-3 text-sm font-bold text-[#FDB515] transition hover:bg-[#FDB515]/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515]">Start with the free Beat First rhythm tool</a>
            </article>
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-lg font-semibold leading-8 text-white/80">You do not need to be naturally coordinated. If you can recognize the beat and safely perform the basic physical movements, the drills will help you develop your coordination.</p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0D0D0D] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="What your enrollment includes" title="Everything You Need to Learn, Practice, and Perform" />
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inclusions.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-[#111] p-6 transition hover:border-[#2563EB]/35">
                <Icon aria-hidden="true" className="h-7 w-7 text-[#2563EB]" /><h3 className="mt-5 font-display text-2xl font-bold uppercase leading-tight text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/55">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Student experiences" title="A New Program From a Proven Teacher" copy="The Running Man Method is launching its first cohort, so there are no program graduates yet. But the teaching approach behind it has been developed through more than 25 years of helping students learn, improve, and become more confident." />
          <div className="mt-14 space-y-5">
            <VideoTestimonial id="YT5xMAgGdX0" name="George" title="Clear Instruction and Greater Confidence" copy="George explains how Ceech simplifies movements, gives students time to practice, works with different skill levels, and helped him feel more confident dancing in public." featured />
            <div className="grid gap-5 lg:grid-cols-2">
              <VideoTestimonial id="XuJAnRRk7fI" name="Martin" title="From “I’m Not a Dancer” to Doing the Steps" copy="Martin came in with no dance background. He describes how Ceech made complicated movements feel manageable and helped him execute the steps during his first class." />
              <VideoTestimonial id="s5UPI4Y2U0Y" name="Jordan" title="A Supportive Place to Learn" copy="Jordan describes feeling comfortable in Ceech’s classes, learning through supportive groups, and forming friendships with other students." />
            </div>
          </div>
          <p className="mx-auto mt-9 max-w-3xl text-center text-lg leading-8 text-white/65">These students did not need more impressive demonstrations. They needed an instructor who could make dance understandable.</p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0D0D0D] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rounded-[2rem] bg-[#2563EB]/15 blur-2xl" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/15"><Image src="/images/ceech/portrait-smile-small.jpg" alt="Dance instructor Ceech Hsu smiling" fill sizes="(min-width: 1024px) 34vw, 86vw" className="object-cover" /></div>
          </div>
          <div>
            <SectionHeading eyebrow="Meet your teacher" title="Learn From an Experienced Teacher—Not Just a Talented Dancer" align="left" />
            <p className="mt-6 text-lg leading-8 text-white/65">A talented dancer can show you what the Running Man looks like. An experienced teacher can identify why your movement is not working and explain how to correct it.</p>
            <p className="mt-5 text-lg leading-8 text-white/65">For more than 25 years, Ceech has helped over 6,000 students understand rhythm, develop coordination, and learn dance through manageable progressions.</p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {["More than 25 years teaching", "More than 6,000 students taught", "MA in Kinesiology", "Professor at four Bay Area colleges", "Guest instructor at Stanford, UC Berkeley, UC Santa Cruz, and more", "Co-founder of Get Down Dance Studios", "Creator of a Running Man course for Udemy", "Choreographed and taught members of the Jabbawockeez"].map((credential) => (
                <li key={credential} className="flex gap-3 text-sm leading-6 text-white/70"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#FDB515]" /><span>{credential}</span></li>
              ))}
            </ul>
            <p className="mt-7 border-l-2 border-[#2563EB] pl-5 leading-7 text-white/65">Ceech has also won Body Rock with DS Players, competed on <em>America’s Got Talent</em>, and received recognition for his contributions to the Bay Area hip-hop dance community.</p>
          </div>
        </div>
      </section>

      <section id="enroll" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Founding-cohort enrollment" title="Join the First 12 Students" copy="Every student receives the complete four-week program. The only difference is how early you claim your seat. Enrollment is paid in full." />
          <EnrollmentPanel />
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0D0D0D] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="Questions before joining" title="Frequently Asked Questions" />
          <div className="mt-12 divide-y divide-white/10 rounded-3xl border border-white/10 bg-[#111] px-5 sm:px-8">
            {faqItems.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515] [&::-webkit-details-marker]:hidden"><span>{item.question}</span><ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-[#FDB515] transition group-open:rotate-180" /></summary>
                <div className="max-w-3xl pb-2 pt-4 text-sm leading-7 text-white/60"><p>{item.answer}</p>{item.link ? <a href="https://dancewithceech.com/beat-first" className="mt-3 inline-block font-bold text-[#2563EB] hover:text-[#FDB515]">Try Beat First free →</a> : null}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="enrollment-confirmation" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#2563EB]/35 bg-gradient-to-br from-[#102250] via-[#0D1425] to-[#15120A] p-7 sm:p-12 lg:p-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FDB515]">Your next dance-floor chapter</p>
          <h2 className="mt-4 max-w-4xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">Graduate on October 22—Then Take Your Running Man to Halloween</h2>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/70">You do not need dozens of dance moves. You need one move that you understand, have practiced correctly, and can trust yourself to perform.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {["I understand this is active training that requires practice and video submissions.", "I understand the gradual video-sharing progression and private Mastery Checkpoints.", "I plan to attend the Thursday sessions and live Graduation Challenge.", "I am at least 18 and can practice safely or have appropriate medical clearance.", "I have reviewed the full-refund-through-Day-5 policy."].map((item) => (
              <div key={item} className="flex gap-3 rounded-xl bg-black/20 p-4 text-sm leading-6 text-white/70"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#FDB515]" /><span>{item}</span></div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <a href="#enroll" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#FDB515] px-8 text-center text-base font-extrabold text-black transition hover:-translate-y-0.5 hover:bg-[#FFD15C] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">I Understand and Am Ready to Enroll</a>
            <div className="text-sm leading-6 text-white/55">
              <HeroSeatStatus compact showPrice />
              <p className="font-semibold text-white/80">Limited to 12 students</p>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-display text-2xl font-bold uppercase text-white">Continue Your Dance Journey</p><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Students who graduate receive 20% off their next eligible Dance With Ceech Method, such as the Roger Rabbit Method.</p></div>
            <RefreshCw aria-hidden="true" className="h-9 w-9 shrink-0 text-[#2563EB]" />
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-3xl text-center font-display text-3xl font-bold uppercase leading-tight text-white">Stop watching from the wall. Start building a move you can confidently bring to the dance floor.</p>
      </section>

      <Footer />
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080808]/95 p-3 backdrop-blur md:hidden">
        <a href="#enroll" className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB515]">View Enrollment</a>
      </div>
    </main>
  );
}

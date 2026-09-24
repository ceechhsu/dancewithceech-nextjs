import { CheckCircle2, ChevronDown, Music2 } from "lucide-react";
import Image from "next/image";

import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import RunningManInterestForm from "@/components/running-man/RunningManInterestForm";
import TrackedRunningManVideo from "@/components/running-man/TrackedRunningManVideo";

const practiceSteps = [
  {
    label: "On the numbered count",
    copy: "Both feet land on each numbered count.",
  },
  {
    label: "On the “and”",
    copy: "One knee should be up and one leg lands on the ground.",
  },
  {
    label: "Build the rhythm",
    copy: "Count it slowly out loud. When the timing feels steady, work toward music around 100–110 BPM.",
  },
];

const testimonials = [
  {
    id: "YT5xMAgGdX0",
    name: "George",
    title: "Clear instruction and greater confidence",
    copy: "George talks about how Ceech simplifies movements, gives students time to practice, and helps them feel more confident dancing in public.",
  },
  {
    id: "XuJAnRRk7fI",
    name: "Martin",
    title: "From “I’m not a dancer” to doing the steps",
    copy: "Martin came to class with no dance background. He describes how Ceech made complicated movements feel manageable.",
  },
  {
    id: "s5UPI4Y2U0Y",
    name: "Jordan",
    title: "A supportive place to learn",
    copy: "Jordan describes feeling comfortable in Ceech’s classes, learning in a supportive group, and connecting with other students.",
  },
];

const faqs = [
  {
    question: "Do I need dance experience?",
    answer: "No. This is for beginners who want to learn the Running Man and make its rhythm feel more natural.",
  },
  {
    question: "What if I keep losing the timing?",
    answer: "That is the most common thing I see beginners struggle with. We slow it down, say the count out loud, and focus on rhythm before adding music. If the timing falls apart, turn the music off and rebuild it slowly.",
  },
  {
    question: "Are dates, format, or price set for the next class?",
    answer: "Not yet. You can leave your email on the interest list, and I’ll get in touch when the next class details are ready. Joining the list is not enrollment and does not obligate you to join.",
  },
  {
    question: "Is it safe to practice?",
    answer: "The Running Man involves repeated hopping. If hopping may be unsafe for you, skip it or check with a healthcare professional first. Practice on a clear surface with some grip, and avoid slippery socks on hardwood.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FDB515]">{eyebrow}</p>
      <h2 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-white sm:text-5xl">
        {title}
      </h2>
      {copy ? <p className="mt-5 text-lg leading-8 text-white/60">{copy}</p> : null}
    </div>
  );
}

function VideoTestimonial({
  id,
  name,
  title,
  copy,
}: {
  id: string;
  name: string;
  title: string;
  copy: string;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
      <div className="relative aspect-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={`${name} shares their experience learning dance with Ceech`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#60A5FA]">{name}</p>
        <h3 className="mt-3 font-display text-2xl font-bold uppercase leading-tight text-white">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/60">{copy}</p>
      </div>
    </article>
  );
}

export default function RunningManMethodPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] pb-20 text-[#F9F9F9] md:pb-0">
      <Nav />

      <section className="px-5 pb-20 pt-28 sm:px-8 lg:px-10 lg:pb-24 lg:pt-36">
        <div className="mx-auto max-w-5xl">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-[#FDB515]">
            A beginner-friendly Running Man lesson
          </p>
          <h1 className="max-w-4xl font-display text-5xl font-extrabold uppercase leading-[0.94] tracking-[-0.025em] text-white sm:text-6xl lg:text-7xl">
            Get the Running Man on beat—one count at a time.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/70 sm:text-xl">
            If the steps feel rushed or off, start with the rhythm. I teach the Running Man by counting each beat: both feet land on the numbered count; on the “and,” one knee is up as the other leg lands.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/60 sm:text-lg">
            We slow it down, say the count out loud, and build toward music around 100–110 BPM when you’re ready.
          </p>

          <div className="mt-9 max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl">
            <TrackedRunningManVideo
              placement="method_page_hero"
              className="block aspect-video w-full"
              controls
              playsInline
              preload="metadata"
              poster="/images/running-man-method-teaser-poster.webp"
              aria-label="Ceech and Margarita demonstrating the Running Man with step-by-step captions"
            >
              <source src="/videos/edit/running-man-method-teaser-web.mp4" type="video/mp4" />
              Your browser does not support video playback.
            </TrackedRunningManVideo>
            <p className="border-t border-white/10 px-5 py-4 text-sm leading-6 text-white/65 sm:px-7 sm:text-base">
              Watch the move, then break it down with the count below.
            </p>
          </div>

          <a
            href="#interest"
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-[#2563EB] px-7 text-center text-base font-bold text-white shadow-[0_16px_44px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515]"
          >
            Tell me about the next class
          </a>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0D0D0D] px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="The timing pattern"
            title="The rhythm is what makes the move click"
            copy="The most common beginner mistake I see is timing. Start with the count, give your body time to find it, then add the music."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {practiceSteps.map((step, index) => (
              <article key={step.label} className="rounded-3xl border border-white/10 bg-[#111] p-7 sm:p-8">
                <p className="font-display text-4xl font-extrabold text-[#FDB515]">0{index + 1}</p>
                <h3 className="mt-5 font-display text-2xl font-bold uppercase leading-tight text-white">{step.label}</h3>
                <p className="mt-3 leading-7 text-white/65">{step.copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-4 rounded-2xl border border-[#2563EB]/25 bg-[#2563EB]/[0.08] p-6 sm:p-7">
            <Music2 aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-[#60A5FA]" />
            <p className="leading-7 text-white/75">
              If the rhythm slips, I count it with you. We slow down, say the count out loud, and only bring in music when you’re ready.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Who this is for"
              title="One move, learned with a clear rhythm"
              copy="This is for beginners who want to learn the Running Man and make its timing feel more natural. You don’t need dance experience."
            />
            <ul className="mx-auto mt-8 max-w-2xl space-y-4">
              {[
                "You know the steps but the move still feels rushed or off.",
                "You want to understand the count instead of just copying along.",
                "You’d like to start slowly and build toward dancing with music.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-base leading-7 text-white/75">
                  <CheckCircle2 aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#60A5FA]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <article className="rounded-3xl border border-[#FDB515]/20 bg-[#15120A] p-7 sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FDB515]">Why I still love this move</p>
            <p className="mt-5 text-lg leading-8 text-white/80">
              I first did the Running Man at a high-school dance in San Jose in 1988. I was excited—and I ran it all night because it was the only move I really knew. I’d find other people doing it and challenge them to see who could keep going longest.
            </p>
            <p className="mt-4 leading-7 text-white/65">
              That memory is part of why I enjoy teaching it: the move is fun, but getting the rhythm right is what makes it click.
            </p>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0D0D0D] px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Student experiences"
            title="Learn from a teacher who understands beginners"
            copy="I’ve taught adult beginners for more than 25 years and hold an MA in Kinesiology. My focus is breaking movement into manageable steps and helping students understand what to adjust."
          />
          <p className="mx-auto mt-7 max-w-3xl text-center text-sm leading-6 text-white/55">
            The Running Man Method hasn’t had its first class yet, so these aren’t reviews from Running Man Method graduates. They’re students sharing their experience learning dance with Ceech.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {testimonials.map((testimonial) => <VideoTestimonial key={testimonial.id} {...testimonial} />)}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.65fr_1fr] lg:items-center">
          <div className="relative mx-auto w-full max-w-sm">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/15">
              <Image
                src="/images/ceech/ceech-smiling-portrait.jpg"
                alt="Dance instructor Ceech Hsu"
                title="Dance instructor Ceech Hsu"
                fill
                sizes="(min-width: 1024px) 30vw, 86vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FDB515]">A little more about your teacher</p>
            <h2 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-white sm:text-5xl">
              Dance teaching, built around the learner
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/65">
              For more than 25 years, I’ve helped students build rhythm, coordination, and confidence through clear progressions. My college teaching includes hip-hop at Mission College, West Valley College, and Cabrillo College, plus weight training at Gavilan College, where I also taught hip-hop from 2018 to 2020. My MA in Kinesiology informs how I explain movement.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0D0D0D] px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="A few quick answers" title="Running Man questions" />
          <div className="mt-10 divide-y divide-white/10 rounded-3xl border border-white/10 bg-[#111] px-5 sm:px-8">
            {faqs.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515] [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-[#FDB515] transition group-open:rotate-180" />
                </summary>
                <p className="max-w-3xl pb-2 pt-4 text-sm leading-7 text-white/60">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="interest" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#2563EB]/35 bg-gradient-to-br from-[#102250] via-[#0D1425] to-[#15120A] p-7 sm:p-12 lg:p-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FDB515]">Hear about the next class</p>
            <h2 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-white sm:text-5xl">
              Want to learn the Running Man with me?
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Dates, format, and price aren’t set yet. Leave your email if you’d like me to contact you when those details are ready. This is an interest list, not enrollment, and there’s no obligation.
            </p>
          </div>
          <RunningManInterestForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}

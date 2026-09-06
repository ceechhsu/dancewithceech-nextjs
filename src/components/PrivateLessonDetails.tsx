import Link from "next/link";
import type { LessonFaq } from "@/lib/private-lesson-details";

export function LessonIntroduction() {
  return (
    <section className="pt-16 px-6">
      <div className="max-w-4xl mx-auto rounded-2xl p-6 md:p-8" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
        <h2 className="text-2xl font-bold mb-4">Meet your instructor</h2>
        <p className="leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
          Ceech Hsu has taught dance since 1998 and began teaching at Mission College in 2002. He holds a Master of Arts in Kinesiology from Fresno Pacific University and trained directly with Skeeter Rabbit and Pop&apos;in Pete of the Electric Boogaloos.
        </p>
        <p className="leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
          His approach is specific: identify the rhythm, balance, or coordination problem, then give you a drill you can practice. One step before the next.
        </p>
        <Link href="/about" className="underline underline-offset-4" style={{ color: "var(--accent-primary)" }}>Read Ceech&apos;s story</Link>
      </div>
    </section>
  );
}

const processes = [
  {
    title: "In-person lessons",
    steps: [
      ["Talk about your goals", "Start with a free 30-minute phone consultation. Discuss what you want to learn and arrange a lesson in San Jose."],
      ["Work on what you need", "During your 60-minute lesson, Ceech identifies the skill holding you back and teaches a custom drill with specific corrections."],
      ["Take your practice home", "In the final 5 to 10 minutes, record Ceech demonstrating your drills so you know what to practice before your next lesson."],
    ],
  },
  {
    title: "Virtual coaching",
    steps: [
      ["Submit your dance video", "After purchasing a cycle or pack, send a recording that shows your movement clearly."],
      ["Receive recorded feedback", "Within three business days, Ceech sends a short video explaining what is working, what needs correction, and your next step."],
      ["Schedule Live Coaching", "Arrange your next available 30-minute Google Meet with Ceech. Ask questions, practice corrections together, and leave with a drill. This completes one coaching cycle."],
    ],
  },
];

export function LessonProcess() {
  return (
    <section id="how-lessons-work" className="pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">How your lessons work</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {processes.map(({ title, steps }) => (
            <div key={title} className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
              <h3 className="text-xl font-bold mb-6">{title}</h3>
              <ol className="space-y-6 list-decimal pl-5 marker:text-blue-400">
                {steps.map(([heading, detail]) => (
                  <li key={heading} className="pl-2">
                    <h4 className="font-semibold mb-2">{heading}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CelebrationLessons() {
  return (
    <section id="wedding-dance" className="py-16 px-6" style={{ borderBottom: "1px solid #1f1f1f" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-5">A dance for your wedding or celebration</h2>
        <p className="leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
          Bring your vision, your songs, or simply a starting idea. Ceech designs and teaches choreography for wedding couples, birthdays, and small-group celebrations. Every dance is built around the people performing it.
        </p>
        <p className="leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
          A typical wedding couple should plan for the 10-session package and start about three months before the event, meeting roughly once a week. Your goals, experience, and practice determine the right pace.
        </p>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--muted)" }}>
          Standard in-person rates apply to couples. Larger groups cost more based on participant count. Music editing, travel, and extra rehearsals are quoted separately.
        </p>
        <a href="#booking" className="underline underline-offset-4" style={{ color: "var(--accent-primary)" }}>Discuss your dance in a free phone consultation</a>
      </div>
    </section>
  );
}

export function SpecializedLessons() {
  return (
    <section id="specialized-lessons" className="py-16 px-6 scroll-mt-24" style={{ borderBottom: "1px solid #1f1f1f" }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-5">Private lessons for your goals</h2>
        <p className="leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
          Coaching for adults 18+, in San Jose or online. Tell Ceech what you are preparing for so your drills match your goals and current skills.
        </p>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
            <h3 className="text-xl font-bold mb-4">Competition and audition coaching</h3>
            <p className="leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
              Prepare for a dance team audition or competition with specific feedback on your timing, balance, coordination, and execution. Bring the requirements and any choreography you need to practice.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>Competition results and audition selection are not guaranteed.</p>
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
            <h3 className="text-xl font-bold mb-4">Dance for social events</h3>
            <p className="leading-relaxed" style={{ color: "var(--muted)" }}>
              Learn steps you can use at parties, weddings, and other celebrations without needing a choreographed performance. Practice finding the beat, shifting your weight, and connecting a few moves you can repeat on the dance floor.
            </p>
          </div>
        </div>
        <a href="#booking" className="underline underline-offset-4" style={{ color: "var(--accent-primary)" }}>Talk through your goals in a free 30-minute phone consultation</a>
      </div>
    </section>
  );
}

export function LessonFaqs({ faqs }: { faqs: LessonFaq[] }) {
  return (
    <section id="faq" className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Before you book</h2>
        {faqs.map(({ question, answer }) => (
          <details key={question} className="py-5 border-b border-white/10">
            <summary className="font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-400 rounded">{question}</summary>
            <p className="mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function LessonLocation() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Find Dance With Ceech in Japantown</h2>
        <p className="leading-relaxed mb-4" style={{ color: "var(--muted)" }}>In-person lessons take place at Get Down Dance Studios.<br />196 Jackson St, San Jose, CA 95112<br />By appointment only, normally Saturdays between 9 a.m. and 5 p.m. Pacific Time. Other times may be available by special request.</p>
        <p className="leading-relaxed mb-4" style={{ color: "var(--muted)" }}>Paid street parking only. Check posted signs for fees and time limits, and allow time to park.</p>
        <a href="https://maps.app.goo.gl/UwJFWssFCYNC5Zyc7" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" style={{ color: "var(--accent-primary)" }}>View location and directions on Google Maps</a>
      </div>
    </section>
  );
}

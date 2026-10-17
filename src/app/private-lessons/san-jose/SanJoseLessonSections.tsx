const processes = [
  {
    title: "In-person lessons",
    steps: [
      ["Talk about your goals", "Start with a free 30-minute phone consultation. Discuss what you want to learn and arrange a lesson in San Jose."],
      ["Work on what you need", "During your 60-minute lesson, Ceech identifies the skill holding you back and teaches a custom drill with specific corrections."],
      ["Take your practice home", "In the final 5 to 10 minutes, record Ceech demonstrating your drills so you know what to practice before your next lesson."],
    ],
  },
];

export function SanJoseLessonProcess() {
  return (
    <section id="how-lessons-work" className="pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">How your lessons work</h2>
        <div className="grid gap-6">
          {processes.map(({ title, steps }) => (
            <div key={title} className="scroll-mt-24 rounded-2xl p-6 md:p-8" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
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

export function SanJoseSpecializedLessons() {
  return (
    <section id="specialized-lessons" className="py-16 px-6 scroll-mt-24" style={{ borderBottom: "1px solid #1f1f1f" }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-5">Private lessons for your goals</h2>
        <p className="leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
          Coaching for adults 18+, in San Jose. Tell Ceech what you are preparing for so your drills match your goals and current skills.
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
        <a href="#booking" className="underline underline-offset-4" style={{ color: "var(--accent-primary-accessible)" }}>Talk through your goals in a free 30-minute phone consultation</a>
      </div>
    </section>
  );
}


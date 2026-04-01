import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/Nav";

export const metadata = {
  title: "About Ceech — DanceWithCeech",
  description: "From UC Berkeley electrical engineer to hip-hop dance educator. Ceech's story, philosophy, and 25+ years of teaching.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

      <Nav />

      {/* HERO */}
      <section className="pt-40 pb-24 px-6 text-center">
        <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
          About Ceech
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight max-w-3xl mx-auto mb-6">
          From Engineer to Educator.
        </h1>
        <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
          A UC Berkeley electrical engineer who discovered hip-hop dance — and spent the next 25+ years proving that anyone with the right system can learn to move.
        </p>

        {/* Professional photo */}
        <div className="mt-12 flex justify-center">
          <Image
            src="/images/ceech/portrait-smile-small.jpg"
            alt="Ceech — DanceWithCeech"
            width={400}
            height={500}
            className="rounded-2xl object-cover"
            style={{ maxHeight: '480px', width: 'auto' }}
          />
        </div>
      </section>

      {/* STORY */}
      <section className="py-12 px-6 max-w-3xl mx-auto">

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--accent-primary)" }}>The Unlikely Beginning</h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            I wasn&apos;t supposed to be a dancer. I was an Electrical Engineering and Computer Science student at UC Berkeley — analytical, logical, and athletic. Then I tore my ACL.
          </p>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            Sidelined from snowboarding that winter, I flew back to Taiwan to visit family. A friend introduced me to three guys who had become household names there: the LA Boys. Originally from Los Angeles, they had won major dance competitions in Taiwan and headlined their own shows. I sat down with the oldest brother, Jeff, and heard how they got their start.
          </p>
          <p className="text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
            That conversation changed everything. As an Asian American, I had spent years feeling the pull toward a &quot;safe&quot; path — doctor, engineer, something respectable. Watching these guys own a stage cracked something open: logic and creativity weren&apos;t opposites. I could have both.
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--accent-primary)" }}>Learning From the Best</h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            My first real instructor was Gary Kendell — one of the most gifted dancers I have ever seen. From the moment I watched him move, I knew I needed to learn from him. Gary was already being hired by major artists to choreograph and perform — including what we now call K-pop artists, before that term even existed. He became my big brother in dance.
          </p>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            In 1999, I connected with Pop&apos;in Pete and Skeeter Rabbit of the legendary Electric Boogaloos — the originators of popping and Electric Boogaloo style. They took me in not just as a student, but like a little brother. I learned not only technique, but the history, culture, and spirit behind the movement.
          </p>
        </div>

        {/* Dance photo */}
        <div className="mb-16 flex justify-center">
          <Image
            src="/images/ceech/hat-off-pose.jpg"
            alt="Ceech dancing"
            width={500}
            height={600}
            className="rounded-2xl object-cover"
            style={{ maxHeight: '520px', width: 'auto' }}
          />
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--accent-primary)" }}>Competing at the Highest Level</h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            In the early 2000s, I formed CaliStyles — a crew built around Electric Boogaloo-style movement that competed and performed across the Bay Area, including as featured guests at UC Santa Cruz.
          </p>

          {/* CaliStyles photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>CaliStyles — Featured at UC Santa Cruz</div>
              <Image
                src="/images/ceech/calistyles.jpg"
                alt="CaliStyles at UC Santa Cruz"
                width={600}
                height={400}
                className="rounded-xl object-cover w-full"
                style={{ height: '220px' }}
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>CaliStyles — Cane Routine</div>
              <div style={{ position: 'relative', height: '220px', borderRadius: '12px', overflow: 'hidden' }}>
                <iframe
                  src="https://www.youtube.com/embed/5gZQwf0VGRY"
                  title="CaliStyles Cane Routine"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            </div>
          </div>

          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            I was also a senior member and choreographer of Mindtricks — a Bay Area crew that became one of the most respected in the region. Several founding members of Mindtricks went on to form Jabbawockeez, who won MTV&apos;s America&apos;s Best Dance Crew and today headline their own show at MGM Grand in Las Vegas. One of my CaliStyles crew members, Bionic, went on to become a principal dancer in Michael Jackson ONE, the Cirque du Soleil production in Las Vegas.
          </p>

          {/* Mindtricks photo */}
          <div className="my-8">
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Mindtricks — Many original Jabbawockeez founders pictured</div>
            <Image
              src="/images/ceech/mindtricks.jpg"
              alt="Mindtricks crew — original Jabbawockeez founders"
              width={700}
              height={450}
              className="rounded-xl object-cover w-full"
            />
          </div>

          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            Later, I formed DS Players. In 2007, we entered Body Rock — one of the most prestigious international hip-hop dance competitions in the country, drawing over 15 crews from across the US and abroad. We took 1st place.
          </p>

          {/* Body Rock winner photo + video */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>DS Players — Body Rock 2007 Champions</div>
              <Image
                src="/images/ceech/bodyrockwinner.jpg"
                alt="DS Players winning Body Rock 2007"
                width={600}
                height={400}
                className="rounded-xl object-cover w-full"
                style={{ height: '220px' }}
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>DS Players — Body Rock 2007 Performance</div>
              <a
                href="https://www.youtube.com/watch?v=xjQF9YUDuDY"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', position: 'relative', height: '220px', borderRadius: '12px', overflow: 'hidden' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://img.youtube.com/vi/xjQF9YUDuDY/hqdefault.jpg"
                  alt="DS Players Body Rock 2007"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '18px solid #000', marginLeft: 4 }} />
                  </div>
                </div>
              </a>
            </div>
          </div>

          <p className="text-lg leading-relaxed mb-6" style={{ color: "var(--muted)" }}>
            After Body Rock and a series of competition wins that followed, America&apos;s Got Talent casting agents took notice. DS Players was invited to audition for the 2010 season in Los Angeles. We performed to a packed theater.
          </p>
          <div className="mb-8 flex justify-center">
            <Image
              src="/images/ceech/dsp-agt.jpg"
              alt="DS Players on America's Got Talent 2010"
              width={700}
              height={450}
              className="rounded-2xl object-cover"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--accent-primary)" }}>25+ Years of Teaching</h2>
          <p className="text-lg leading-relaxed mb-6" style={{ color: "var(--muted)" }}>
            I have been teaching hip-hop dance at Bay Area community colleges since 2002. What started as one class became a career spanning eight institutions, thousands of students, and every level of experience — from complete beginners to competitive dancers.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {['Mission College', 'West Valley College', 'Cabrillo College', 'Gavilan College'].map(school => (
              <div key={school} className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: '#111', border: '1px solid #222', color: 'var(--muted)' }}>
                {school}
              </div>
            ))}
          </div>
          <p className="text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
            Beyond academia, I&apos;ve taught at corporate campuses including <strong style={{ color: 'var(--foreground)' }}>Google</strong> and <strong style={{ color: 'var(--foreground)' }}>LinkedIn</strong>, fitness chains including 24 Hour Fitness, and multiple dance studios throughout the Bay Area. I am co-founder of <a href="https://getdowndancestudios.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--foreground)', textDecoration: 'underline' }}><strong style={{ color: 'var(--foreground)' }}>Get Down Dance Studios</strong></a> in San Jose, California.
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--accent-primary)" }}>My Teaching Philosophy</h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            Dance teachers often say it&apos;s hard to teach analytical, left-brained people how to dance. I disagree — and I&apos;ve spent 25 years proving it.
          </p>
          <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
            My background in engineering isn&apos;t separate from my teaching — it&apos;s the core of it. I break movement down into logical, repeatable steps. I explain the mechanics behind every groove. I give students a system, not just inspiration.
          </p>
          {/* Pull quote */}
          <blockquote style={{
            borderLeft: '3px solid var(--accent-primary)',
            paddingLeft: '24px',
            margin: '0',
          }}>
            <p className="text-2xl font-bold leading-snug" style={{ color: 'var(--foreground)' }}>
              &ldquo;Dance is not a gift. It is a skill. And every skill can be taught — if you have the right method.&rdquo;
            </p>
          </blockquote>

          <div className="mt-12 flex justify-center">
            <Image
              src="/images/ceech/thinking.jpg"
              alt="Ceech — teaching philosophy"
              width={500}
              height={600}
              className="rounded-2xl object-cover"
              style={{ maxHeight: '480px', width: 'auto' }}
            />
          </div>
        </div>

      </section>

      {/* CREDENTIALS BAR */}
      <section className="py-16 px-6" style={{ backgroundColor: "var(--surface)", borderTop: "1px solid #1f1f1f", borderBottom: "1px solid #1f1f1f" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { stat: "25+", label: "Years Teaching" },
            { stat: "8+", label: "Colleges Taught At" },
            { stat: "5", label: "Dance Styles" },
            { stat: "1999", label: "Trained by Electric Boogaloos" },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div className="text-3xl font-bold mb-1" style={{ color: "var(--accent-primary)" }}>{stat}</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to start?</h2>
        <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
          Begin with BeatFirst — the free rhythm trainer. No dance experience required. No judgment.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/beat-first" className="px-8 py-4 rounded-full text-white font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--accent-primary)" }}>
            Play BeatFirst — Free
          </Link>
          <Link href="/private-lessons" className="px-8 py-4 rounded-full font-semibold transition-colors hover:text-white" style={{ border: "1px solid #333", color: "var(--muted)" }}>
            Book a Private Lesson
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="font-bold text-lg mb-2">DanceWithCeech</div>
            <p className="text-sm max-w-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              Rhythm first. Then dance. Hip-hop dance education for analytical minds.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Learn</div>
              <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <Link href="/beat-first" className="hover:text-white transition-colors">BeatFirst</Link>
                <Link href="/academy" className="hover:text-white transition-colors">Academy</Link>
                <Link href="/private-lessons" className="hover:text-white transition-colors">Private Lessons</Link>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Styles</div>
              <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <Link href="/hip-hop-dance-moves" className="hover:text-white transition-colors">Hip-Hop</Link>
                <Link href="/locking-dance-moves" className="hover:text-white transition-colors">Locking</Link>
                <Link href="/breaking-dance-moves" className="hover:text-white transition-colors">Breaking</Link>
                <Link href="/funk-style-dance-moves" className="hover:text-white transition-colors">Funk & Popping</Link>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Connect</div>
              <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                <Link href="/about" className="hover:text-white transition-colors">About</Link>
                <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-8 text-xs text-center" style={{ borderTop: "1px solid #1f1f1f", color: "var(--muted)" }}>
          © {new Date().getFullYear()} DanceWithCeech. All rights reserved.
        </div>
      </footer>

    </main>
  );
}

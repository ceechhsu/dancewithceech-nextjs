import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/Nav";
import ScrollyHero from "@/components/ScrollyHero";
import { CircularGallery } from "@/components/ui/circular-gallery";
import { RainbowBorderButton } from "@/components/ui/rainbow-border-button";

export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

      <Nav />

      <ScrollyHero />

      {/* SOCIAL PROOF BAR */}
      <section className="py-12 px-6" style={{ borderTop: "1px solid #1f1f1f", borderBottom: "1px solid #1f1f1f" }}>
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-12 text-center">
          {[
            { stat: "25+", label: "Years Teaching" },
            { stat: "5,000+", label: "Students Trained" },
            { stat: "8+", label: "Colleges Taught At" },
            { stat: "5", label: "Dance Styles" },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div className="text-3xl font-bold mb-1" style={{ color: "var(--accent-primary)" }}>{stat}</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CREDIBILITY */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-center mb-8" style={{ color: "var(--muted)" }}>
            Ceech&apos;s Story
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
              <Image
                src="/images/ceech/dsp-agt.jpg"
                alt="DS Players on America's Got Talent 2010"
                width={600}
                height={380}
                className="w-full object-cover"
                style={{ height: "200px" }}
              />
              <div className="px-4 py-3" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent-gold)" }}>America&apos;s Got Talent</div>
                <div className="text-sm font-semibold">DS Players — Season 5 (2010)</div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
              <Image
                src="/images/ceech/mindtricks.jpg"
                alt="Mindtricks — original Jabbawockeez founders"
                width={600}
                height={380}
                className="w-full object-cover"
                style={{ height: "200px" }}
              />
              <div className="px-4 py-3" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent-gold)" }}>Crew with Future Jabbawockeez Members</div>
                <div className="text-sm font-semibold">Mindtricks — Bay Area&apos;s most respected crew</div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
              <Image
                src="/images/ceech/bodyrockwinner.jpg"
                alt="DS Players Body Rock 2007 Champions"
                width={600}
                height={380}
                className="w-full object-cover"
                style={{ height: "200px" }}
              />
              <div className="px-4 py-3" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent-gold)" }}>Body Rock 2007 — 1st Place</div>
                <div className="text-sm font-semibold">International Hip-Hop Dance Championship</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: "var(--muted)" }}>
            <span>Also taught at</span>
            <strong style={{ color: "var(--foreground)" }}>Google</strong>
            <strong style={{ color: "var(--foreground)" }}>LinkedIn</strong>
            <strong style={{ color: "var(--foreground)" }}>Mission College</strong>
            <span>+ 8 Bay Area colleges</span>
          </div>
        </div>
      </section>

      {/* BEATFIRST TEASER */}
      <section className="py-24 px-6" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
            BeatFirst Rhythm Trainer
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            The first skill every dancer<br />needs — and most skip.
          </h2>
          <p className="text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
            Tap to the beat, earn your rhythm score, and unlock real dance move tutorials. Free. No account needed.
          </p>
          <Link href="/beat-first" className="inline-block px-8 py-4 rounded-full text-white font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--accent-primary)" }}>
            Play BeatFirst — Free
          </Link>
        </div>
      </section>

      {/* DANCE STYLES */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Pick Your Style</h2>
            <p style={{ color: "var(--muted)" }}>Five hip-hop dance styles. All teachable. All learnable.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Hip-Hop", slug: "/hip-hop-dance-moves", image: "/images/styles/hip-hop.jpg", description: "The foundation. Groove, bounce, and flow." },
              { name: "Locking", slug: "/locking-dance-moves", image: "/images/styles/locking.jpg", description: "Funky freezes and sharp punctuations." },
              { name: "Breaking", slug: "/breaking-dance-moves", image: "/images/styles/breaking.jpg", description: "Footwork, power moves, and style." },
              { name: "Funk & Popping", slug: "/funk-style-dance-moves", image: "/images/styles/funk.jpg", description: "Isolations, waves, and electric hits." },
              { name: "House Dance", slug: "/blog?category=house-dance", image: "/images/styles/house.jpg", description: "Fast footwork rooted in the underground." },
            ].map(({ name, slug, image, description }) => (
              <Link key={name} href={slug} className="group rounded-2xl overflow-hidden transition-colors hover:border-blue-600" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
                <div className="h-48 overflow-hidden">
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">{name}</h3>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 overflow-x-hidden" style={{ backgroundColor: "var(--surface)" }}>
        <div className="px-6 text-center mb-12">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
            Student Results
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">Real students. Real progress.</h2>
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>Hover to pause · Click any card to watch</p>
        </div>
        <div style={{ height: "480px" }}>
          <CircularGallery
            items={[
              { videoId: "PppnU3oHvlQ" },
              { videoId: "J4_XpORtTfQ" },
              { videoId: "bdSEa_S85-c" },
              { videoId: "I68OCXhkaEo" },
              { videoId: "0DKQ1PPW7Ag" },
              { videoId: "CgB1N_nx5vo" },
              { videoId: "h32DyBzyi4Q" },
            ]}
          />
        </div>
      </section>

      {/* ACADEMY TEASER */}
      <section className="py-24 px-6" style={{ backgroundColor: "var(--background)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-secondary)" }}>
            The Academy
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            When your rhythm is ready,<br />the academy unlocks.
          </h2>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: "var(--muted)" }}>
            A full progressive curriculum — drill by drill, move by move. Built for students who want a real system, not random YouTube clips.
          </p>
          <div className="flex justify-center">
            <RainbowBorderButton href="/academy">
              Explore the Academy
            </RainbowBorderButton>
          </div>
        </div>
      </section>

      {/* PRIVATE LESSONS CTA */}
      <section className="py-24 px-6" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Want direct feedback from Ceech?
          </h2>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: "var(--muted)" }}>
            Private 1-on-1 Zoom lessons. Real-time corrections. Personalized to exactly where you are.
          </p>
          <Link href="/private-lessons" className="inline-block px-8 py-4 rounded-full text-white font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--accent-primary)" }}>
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

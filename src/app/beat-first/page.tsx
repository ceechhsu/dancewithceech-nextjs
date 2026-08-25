import BeatFirstGame from '@/components/BeatFirstGame'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const metadata = {
  title: 'BeatFirst — Rhythm Trainer | DanceWithCeech',
  description: 'Use BeatFirst, a free online rhythm trainer for dancers. Tap along to real drum beats, measure your timing, and build the rhythm foundation dance requires.',
  alternates: { canonical: 'https://dancewithceech.com/beat-first' },
  openGraph: {
    title: 'BeatFirst — Rhythm Trainer | DanceWithCeech',
    description: 'Use a free online rhythm trainer to measure your timing and build the rhythm foundation dance requires.',
    url: 'https://dancewithceech.com/beat-first',
    siteName: 'DanceWithCeech',
    images: [{ url: 'https://dancewithceech.com/images/ceech/teaching-knee-pop.jpg', width: 1200, height: 630, alt: 'BeatFirst Rhythm Trainer' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BeatFirst — Rhythm Trainer | DanceWithCeech',
    description: 'Use a free online rhythm trainer to measure your timing and build the rhythm foundation dance requires.',
    images: ['https://dancewithceech.com/images/ceech/teaching-knee-pop.jpg'],
  },
}

const beatFirstSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'BeatFirst Rhythm Trainer',
  url: 'https://dancewithceech.com/beat-first',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any',
  description: 'A free online rhythm trainer that helps dancers practice hearing and tapping to real drum beats.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

export default async function BeatFirstPage() {
  const session = await auth()

  let unlockedCount = 0
  if (session?.user?.email) {
    const { count } = await supabaseAdmin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_email', session.user.email)
      .not('fulfilled_at', 'is', null)
    unlockedCount = Math.min(count ?? 0, 3)
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(beatFirstSchema) }} />
      <Nav user={session?.user ?? null} />
      <BeatFirstGame user={session?.user ?? null} unlockedCount={unlockedCount} />
      <section className="px-6 py-20" style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>
        <div className="mx-auto max-w-4xl">
          <div className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-primary)' }}>How BeatFirst works</div>
          <h2 className="mt-3 text-3xl font-bold">Train the skill most dance tutorials skip</h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            BeatFirst plays real drum patterns and asks you to tap with the beat. You receive immediate timing feedback, so you can tell whether you are early, late, or on time before adding complicated dance steps.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ['1. Listen', 'Hear the pulse in a real drum groove before you move.'],
              ['2. Tap', 'Tap along and let BeatFirst measure your timing.'],
              ['3. Improve', 'Repeat the exercise and watch your rhythm score become more consistent.'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl p-6" style={{ backgroundColor: 'var(--background)', border: '1px solid #1f1f1f' }}>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-14">
            <h2 className="text-2xl font-bold">Why rhythm comes first</h2>
            <p className="mt-4 leading-relaxed" style={{ color: 'var(--muted)' }}>
              A dance move can be mechanically correct and still look wrong when it is off beat. Training rhythm separately makes later footwork, balance, and coordination easier because your body already knows when each movement should happen.
            </p>
          </div>
          <div className="mt-14">
            <h2 className="text-2xl font-bold">Frequently asked questions</h2>
            <div className="mt-5 space-y-5">
              <div><h3 className="font-bold">Is BeatFirst free?</h3><p className="mt-1" style={{ color: 'var(--muted)' }}>Yes. You can begin rhythm training free in your browser.</p></div>
              <div><h3 className="font-bold">Do I need dance experience?</h3><p className="mt-1" style={{ color: 'var(--muted)' }}>No. BeatFirst is designed to help complete beginners build the timing foundation they need before learning dance moves.</p></div>
              <div><h3 className="font-bold">What should I do after BeatFirst?</h3><p className="mt-1" style={{ color: 'var(--muted)' }}>Once you can hear and follow the beat consistently, apply that skill to a beginner tutorial or a guided program such as the Running Man Method.</p></div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}

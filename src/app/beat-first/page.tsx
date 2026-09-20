import BeatFirstJourney from '@/components/beatfirst-preview/BeatFirstJourney'
import BeatFirstGuide from '@/components/beatfirst-preview/BeatFirstGuide'

export const metadata = {
  title: 'BeatFirst: Rhythm Trainer | DanceWithCeech',
  description: 'Build your rhythm with BeatFirst. Try three free 10-second samples, then sign in free to save progress across 18 levels of claps, kicks, and new beat patterns.',
  alternates: { canonical: 'https://dancewithceech.com/beat-first' },
  openGraph: {
    title: 'BeatFirst: Rhythm Trainer | DanceWithCeech',
    description: 'Start with ten seconds. Build your rhythm through 18 free levels of claps, kicks, and new beat patterns.',
    url: 'https://dancewithceech.com/beat-first',
    siteName: 'DanceWithCeech',
    images: [{ url: 'https://dancewithceech.com/images/ceech/ceech-samy-teaching-knee-pop.jpg', width: 1200, height: 630, alt: 'BeatFirst Rhythm Trainer' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BeatFirst: Rhythm Trainer | DanceWithCeech',
    description: 'Start with ten seconds. Build your rhythm through 18 free levels of claps, kicks, and new beat patterns.',
    images: ['https://dancewithceech.com/images/ceech/ceech-samy-teaching-knee-pop.jpg'],
  },
}

const beatFirstSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'BeatFirst Rhythm Trainer',
  url: 'https://dancewithceech.com/beat-first',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any',
  description: 'A free rhythm game with 18 progressive levels. Tap along with claps and kick drums at 90, 100, and 110 BPM, earn mastery stars, and save your progress.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

export default function BeatFirstPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(beatFirstSchema) }} />
    <BeatFirstJourney><BeatFirstGuide /></BeatFirstJourney>
  </>
}

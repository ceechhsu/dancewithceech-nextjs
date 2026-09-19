import type { Metadata } from 'next'
import BeatFirstJourney from '@/components/beatfirst-preview/BeatFirstJourney'

export const metadata: Metadata = {
  title: 'BeatFirst Playground — Your Rhythm Journey | DanceWithCeech',
  description: 'Find your beat in ten seconds. A simple clap rhythm game from DanceWithCeech.',
  robots: { index: false, follow: false },
}

export default function BeatFirstPreviewPage() {
  return <BeatFirstJourney />
}

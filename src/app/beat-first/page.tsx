import BeatFirstGame from '@/components/BeatFirstGame'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { auth } from '@/auth'

export const metadata = {
  title: 'BeatFirst — Rhythm Trainer | DanceWithCeech',
  description: 'Train your rhythm with real drum beats. Tap along, score points, unlock dance tutorials.',
  openGraph: {
    title: 'BeatFirst — Rhythm Trainer | DanceWithCeech',
    description: 'Train your rhythm with real drum beats. Tap along, score points, unlock dance tutorials.',
    url: 'https://dancewithceech.com/beat-first',
    siteName: 'DanceWithCeech',
    images: [{ url: 'https://dancewithceech.com/images/ceech/teaching-knee-pop.jpg', width: 1200, height: 630, alt: 'BeatFirst Rhythm Trainer' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BeatFirst — Rhythm Trainer | DanceWithCeech',
    description: 'Train your rhythm with real drum beats. Tap along, score points, unlock dance tutorials.',
    images: ['https://dancewithceech.com/images/ceech/teaching-knee-pop.jpg'],
  },
}

export default async function BeatFirstPage() {
  const session = await auth()
  return (
    <>
      <Nav />
      <BeatFirstGame user={session?.user ?? null} />
      <Footer />
    </>
  )
}

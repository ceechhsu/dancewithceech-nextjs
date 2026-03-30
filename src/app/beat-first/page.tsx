import BeatFirstGame from '@/components/BeatFirstGame'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { auth } from '@/auth'

export const metadata = {
  title: 'BeatFirst — Rhythm Trainer | DanceWithCeech',
  description: 'Train your rhythm with real drum beats. Tap along, score points, unlock dance tutorials.',
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

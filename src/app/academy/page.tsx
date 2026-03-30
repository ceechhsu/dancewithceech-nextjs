import Nav from '@/components/Nav'
import AcademyWaitlist from '@/components/AcademyWaitlist'

export const metadata = {
  title: 'The Academy — DanceWithCeech',
  description: 'A full progressive dance curriculum. Rhythm → footwork → style → performance. Join the waitlist for founding member access.',
}

export default function AcademyPage() {
  return (
    <main style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh' }}>
      <Nav />
      <AcademyWaitlist />
    </main>
  )
}

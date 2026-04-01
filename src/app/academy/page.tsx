import Nav from '@/components/Nav'
import AcademyWaitlist from '@/components/AcademyWaitlist'

export const metadata = {
  title: 'The Academy — DanceWithCeech',
  description: 'A private, judgment-free dance program for working professionals. Learn at home, build real confidence, and get on any dance floor. Founding member spots open now.',
  openGraph: {
    title: 'The Academy — DanceWithCeech',
    description: 'A private, judgment-free dance program for working professionals. Learn at home, build real confidence, and get on any dance floor. Founding member spots open now.',
    url: 'https://dancewithceech.com/academy',
    siteName: 'DanceWithCeech',
    images: [{ url: 'https://dancewithceech.com/images/ceech/group-class.jpg', width: 1200, height: 630, alt: 'DanceWithCeech Academy' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Academy — DanceWithCeech',
    description: 'A private, judgment-free dance program for working professionals. Learn at home, build real confidence, and get on any dance floor. Founding member spots open now.',
    images: ['https://dancewithceech.com/images/ceech/group-class.jpg'],
  },
}

export default function AcademyPage() {
  return (
    <main style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh' }}>
      <Nav />
      <AcademyWaitlist />
    </main>
  )
}

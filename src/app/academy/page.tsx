import Nav from '@/components/Nav'
import AcademyWaitlist from '@/components/AcademyWaitlist'

const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "DanceWithCeech Academy — Hip-Hop, Locking, Popping, Breaking & House Dance",
  "description": "A private, judgment-free online dance program covering hip-hop, locking, popping, breaking, and house dance. Taught by Ceech — Electric Boogaloos lineage instructor with 25+ years of teaching experience. Designed for working professionals to learn at their own pace and build real confidence on any dance floor.",
  "url": "https://dancewithceech.com/academy",
  "provider": {
    "@type": "Organization",
    "name": "DanceWithCeech",
    "url": "https://dancewithceech.com",
    "sameAs": [
      "https://www.instagram.com/dancewithceech",
      "https://www.tiktok.com/@dancewithceech",
      "https://www.youtube.com/@dancewithceech",
      "https://www.facebook.com/dancewithceech"
    ]
  },
  "instructor": {
    "@type": "Person",
    "name": "Ceech Hsu",
    "description": "UC Berkeley engineer turned 25-year dance instructor. Trained under Pop'in Pete and Skeeter Rabbit of the Electric Boogaloos. Taught at 4 Bay Area community colleges.",
    "url": "https://dancewithceech.com/about"
  },
  "educationalLevel": "Beginner to Advanced",
  "inLanguage": "en-US",
  "teaches": "Hip-hop, locking, popping, breaking, and house dance fundamentals, choreography, freestyle, and rhythm training.",
  "hasCourseInstance": [
    {
      "@type": "CourseInstance",
      "name": "Founding Member — Annual",
      "courseMode": "Online",
      "offers": {
        "@type": "Offer",
        "price": "199",
        "priceCurrency": "USD",
        "category": "Annual subscription",
        "availability": "https://schema.org/LimitedAvailability"
      }
    },
    {
      "@type": "CourseInstance",
      "name": "Founding Member — Lifetime",
      "courseMode": "Online",
      "offers": {
        "@type": "Offer",
        "price": "297",
        "priceCurrency": "USD",
        "category": "Lifetime access",
        "availability": "https://schema.org/LimitedAvailability"
      }
    },
    {
      "@type": "CourseInstance",
      "name": "Monthly",
      "courseMode": "Online",
      "offers": {
        "@type": "Offer",
        "price": "29",
        "priceCurrency": "USD",
        "category": "Monthly subscription",
        "availability": "https://schema.org/InStock"
      }
    },
    {
      "@type": "CourseInstance",
      "name": "Annual (Standard)",
      "courseMode": "Online",
      "offers": {
        "@type": "Offer",
        "price": "444",
        "priceCurrency": "USD",
        "category": "Annual subscription ($37/mo billed yearly)",
        "availability": "https://schema.org/InStock"
      }
    }
  ]
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />
      <Nav />
      <AcademyWaitlist />
    </main>
  )
}

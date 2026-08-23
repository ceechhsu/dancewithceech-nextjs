import type { Metadata } from "next";
import RunningManMethodPage from "./RunningManMethodPage";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Course",
      name: "The Running Man Method",
      description:
        "A four-week online cohort for adult beginners to learn the Running Man through progressive drills, personal feedback, and a live graduation challenge.",
      url: "https://dancewithceech.com/running-man-method",
      provider: {
        "@type": "Organization",
        name: "Dance With Ceech",
        url: "https://dancewithceech.com",
      },
      instructor: {
        "@type": "Person",
        name: "Ceech Hsu",
        url: "https://dancewithceech.com/about",
      },
      educationalLevel: "Beginner",
      inLanguage: "en-US",
      teaches:
        "Running Man rhythm, balance, coordination, muscle memory, and performance confidence",
      hasCourseInstance: {
        "@type": "CourseInstance",
        name: "Founding Cohort — Fall 2026",
        courseMode: "Online",
        startDate: "2026-09-24",
        endDate: "2026-10-22",
        offers: {
          "@type": "Offer",
          price: "197",
          priceCurrency: "USD",
          availability: "https://schema.org/LimitedAvailability",
          url: "https://dancewithceech.com/running-man-method#enroll",
        },
      },
    },
    {
      "@type": "Event",
      name: "The Running Man Method — Live Graduation Challenge",
      description:
        "Students perform the Running Man continuously and on beat for at least 30 seconds live in front of Ceech and their cohort.",
      startDate: "2026-10-22T20:00:00-07:00",
      endDate: "2026-10-22T21:30:00-07:00",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "VirtualLocation",
        url: "https://dancewithceech.com/running-man-method",
      },
      organizer: {
        "@type": "Organization",
        name: "Dance With Ceech",
        url: "https://dancewithceech.com",
      },
      performer: {
        "@type": "Person",
        name: "Ceech Hsu",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "The Running Man Method | Dance With Ceech",
  description:
    "A four-week online cohort for adult beginners. Learn the Running Man through progressive drills, personal feedback, and a live graduation challenge.",
  alternates: {
    canonical: "https://dancewithceech.com/running-man-method",
  },
  openGraph: {
    title: "The Running Man Method | Dance With Ceech",
    description:
      "Stop guessing whether you are practicing correctly. Build rhythm, coordination, and confidence in a four-week beginner cohort.",
    url: "https://dancewithceech.com/running-man-method",
    siteName: "Dance With Ceech",
    images: [
      {
        url: "https://dancewithceech.com/images/ceech/running-man-method-class.jpg",
        width: 1200,
        height: 800,
        alt: "Ceech teaching adult dance students",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Running Man Method | Dance With Ceech",
    description:
      "A four-week online cohort that helps adult beginners learn the Running Man correctly and perform it with confidence.",
    images: ["https://dancewithceech.com/images/ceech/running-man-method-class.jpg"],
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <RunningManMethodPage />
    </>
  );
}

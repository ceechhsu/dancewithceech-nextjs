import type { Metadata } from "next";
import RunningManMethodPage from "./RunningManMethodPage";

const title = "How to Do the Running Man: Rhythm-First Tutorial | Ceech";
const description =
  "Learn the Running Man one count at a time. Ceech explains the numbered counts, the “and,” and how beginners can build rhythm around 100–110 BPM.";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "The Running Man Method",
  description,
  url: "https://dancewithceech.com/running-man-method",
  about: {
    "@type": "Thing",
    name: "Running Man (dance move)",
  },
  publisher: {
    "@type": "Organization",
    name: "Dance With Ceech",
    url: "https://dancewithceech.com",
  },
};

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://dancewithceech.com/running-man-method",
  },
  openGraph: {
    title,
    description,
    url: "https://dancewithceech.com/running-man-method",
    siteName: "Dance With Ceech",
    images: [
      {
        url: "https://dancewithceech.com/images/ceech/ceech-teaching-running-man-adult-class.webp",
        width: 1200,
        height: 800,
        alt: "Ceech teaching adult dance students",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://dancewithceech.com/images/ceech/ceech-teaching-running-man-adult-class.webp"],
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

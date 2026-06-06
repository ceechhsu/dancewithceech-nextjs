import type { Metadata } from "next";
import { Suspense } from "react";
import LinksContent from "./LinksContent";

export const metadata: Metadata = {
  title: "Links — DanceWithCeech",
  description: "All the links from Ceech's social bios in one place — private lessons, BeatFirst rhythm trainer, Academy waitlist, tutorials, and more.",
  robots: { index: false, follow: true },
};

export default function LinksPage() {
  return (
    <Suspense fallback={null}>
      <LinksContent />
    </Suspense>
  );
}

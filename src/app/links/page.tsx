import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "@/components/approved-pages/Nav";
import approvedStyles from "@/components/approved-pages/PageScope.module.css";
import LinksContent from "./LinksContent";

export const metadata: Metadata = {
  title: "Links: DanceWithCeech",
  description: "All the links from Ceech's social bios in one place: private lessons, BeatFirst rhythm trainer, tutorials, and more.",
  robots: { index: false, follow: true },
};

export default function LinksPage() {
  return (
    <>
      <a href="#main-content" className={approvedStyles.skipLink}>Skip to content</a>
      <Nav position="relative" />
      <Suspense fallback={null}>
        <LinksContent />
      </Suspense>
    </>
  );
}

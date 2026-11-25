import type { Metadata } from "next";
import Nav from "@/components/approved-pages/Nav";
import approvedStyles from "@/components/approved-pages/PageScope.module.css";
import DanceFloorReady from "./DanceFloorReady";

export const metadata: Metadata = {
  title: "Online Hip-Hop Dance Lessons | Dance Floor Ready",
  description: "Private online hip-hop dance lessons for adults. Learn to freestyle at weddings, parties, and clubs with short drills and personal video feedback from Ceech.",
  alternates: { canonical: "https://dancewithceech.com/dance-floor-ready" },
};

export default function DanceFloorReadyPage() {
  return <div className={approvedStyles.scope}>
    <a href="#main-content" className={approvedStyles.skipLink}>Skip to content</a>
    <Nav position="sticky" />
    <DanceFloorReady version="v2" showPreviewBadge={false} />
  </div>;
}

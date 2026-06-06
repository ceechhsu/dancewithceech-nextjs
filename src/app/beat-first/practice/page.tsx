import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BeatFirst Practice | DanceWithCeech",
  description: "Private beta practice route for comparing your timing against a reference dance video.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function BeatFirstPracticePage() {
  return (
    <main
      style={{
        minHeight: "100svh",
        background: "#15171f",
      }}
    >
      <iframe
        src="/beatfirst-practice/record.html"
        title="BeatFirst Practice"
        allow="camera; microphone; fullscreen"
        style={{
          display: "block",
          width: "100%",
          minHeight: "100svh",
          border: 0,
          background: "#15171f",
        }}
      />
    </main>
  );
}

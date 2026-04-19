import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Links — DanceWithCeech",
  description: "All the links from Ceech's social bios in one place — private lessons, BeatFirst rhythm trainer, Academy waitlist, tutorials, and more.",
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ src?: string }>;

const VALID_SOURCES = new Set(["ig", "tt", "fb", "yt", "gmb", "email"]);

function buildUrl(path: string, source: string, campaign: string): string {
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: "linkinbio",
    utm_campaign: campaign,
  });
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${params.toString()}`;
}

type LinkCard = {
  label: string;
  sublabel: string;
  href: string;
  external: boolean;
  campaign: string;
  accent?: string;
};

export default async function LinksPage({ searchParams }: { searchParams: SearchParams }) {
  const { src } = await searchParams;
  const source = src && VALID_SOURCES.has(src) ? src : "bio";

  const internal = (path: string, campaign: string) => buildUrl(path, source, campaign);
  const external = (url: string, campaign: string) => buildUrl(url, source, campaign);

  const cards: LinkCard[] = [
    {
      label: "Try BeatFirst (free)",
      sublabel: "Train your rhythm ear in 5 minutes",
      href: internal("/beat-first", "beatfirst"),
      external: false,
      campaign: "beatfirst",
      accent: "#FDB515",
    },
    {
      label: "Book a free consultation",
      sublabel: "Private lessons — San Jose or online",
      href: internal("/private-lessons", "private-lessons"),
      external: false,
      campaign: "private-lessons",
      accent: "#2563EB",
    },
    {
      label: "Join the Academy waitlist",
      sublabel: "Founding-member pricing closes soon",
      href: internal("/academy", "academy-waitlist"),
      external: false,
      campaign: "academy-waitlist",
    },
    {
      label: "Hip hop dance tutorials",
      sublabel: "88 free written breakdowns on the blog",
      href: internal("/blog", "blog"),
      external: false,
      campaign: "blog",
    },
    {
      label: "Watch on YouTube",
      sublabel: "Full video tutorials + student wins",
      href: external("https://www.youtube.com/@dancewithceech", "youtube"),
      external: true,
      campaign: "youtube",
    },
    {
      label: "Contact Ceech",
      sublabel: "Questions, bookings, collabs",
      href: internal("/contact", "contact"),
      external: false,
      campaign: "contact",
    },
  ];

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-10"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="w-full max-w-md flex flex-col items-center">
        <Image
          src="/logo-mark.png"
          alt="DanceWithCeech"
          width={96}
          height={96}
          className="rounded-full mb-4"
          priority
        />
        <h1 className="text-2xl font-bold mb-1 text-center">DanceWithCeech</h1>
        <p className="text-sm text-center mb-8" style={{ color: "var(--muted)" }}>
          Hip-hop, locking, popping, breaking &amp; house dance · San Jose + online
        </p>

        <div className="w-full flex flex-col gap-3">
          {cards.map((card) => (
            <a
              key={card.campaign}
              href={card.href}
              target={card.external ? "_blank" : undefined}
              rel={card.external ? "noopener noreferrer" : undefined}
              className="block w-full rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-white"
              style={{
                backgroundColor: "#111111",
                border: `1px solid ${card.accent ?? "#1f1f1f"}`,
                textDecoration: "none",
              }}
            >
              <div className="font-semibold text-base" style={{ color: "var(--foreground)" }}>
                {card.label}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {card.sublabel}
              </div>
            </a>
          ))}
        </div>

        <div className="mt-10 flex gap-5 text-xs" style={{ color: "var(--muted)" }}>
          <a
            href={external("https://www.instagram.com/dancewithceech", "social-ig")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Instagram
          </a>
          <a
            href={external("https://www.tiktok.com/@dancewithceech", "social-tt")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            TikTok
          </a>
          <a
            href={external("https://www.facebook.com/dancewithceech", "social-fb")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Facebook
          </a>
        </div>
      </div>
    </main>
  );
}

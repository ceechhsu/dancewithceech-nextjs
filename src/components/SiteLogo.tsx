import Image from "next/image";
import Link from "next/link";

export default function SiteLogo() {
  return (
    <Link href="/" prefetch={false} className="flex min-h-11 shrink-0 items-center gap-2" style={{ textDecoration: "none" }}>
      <Image
        src="/logo-mark.png"
        alt="DanceWithCeech"
        title="DanceWithCeech logo"
        width={36}
        height={36}
      />
      <span style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#F9F9F9", whiteSpace: "nowrap" }}>
        Dance With <span style={{ color: "var(--accent-primary-accessible)" }}>Ceech</span>
      </span>
    </Link>
  );
}

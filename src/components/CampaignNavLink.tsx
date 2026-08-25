import Link from "next/link";

export default function CampaignNavLink() {
  return (
    <Link
      href="/running-man-method"
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-white transition-opacity hover:opacity-90"
      style={{ backgroundColor: "var(--accent-primary)" }}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--accent-gold)" }}>
        NEW
      </span>
      <span>Running Man</span>
    </Link>
  );
}

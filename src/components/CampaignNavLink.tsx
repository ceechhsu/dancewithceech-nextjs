import Link from "next/link";

export default function CampaignNavLink() {
  return (
    <Link
      href="/running-man-method"
      prefetch={false}
      className="inline-flex min-h-11 items-center text-sm text-zinc-400 transition-colors hover:text-white"
    >
      <span>Running Man</span>
    </Link>
  );
}

import Link from "next/link";
import Image from "next/image";
import MobileMenu from "@/components/MobileMenu";
import UserMenu from "@/components/UserMenu";
import SignInButton from "@/components/SignInButton";

type NavUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type Props = {
  user?: NavUser | null;
};

export default function Nav({ user }: Props = {}) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4" style={{ backgroundColor: "var(--background)", borderBottom: "1px solid #1f1f1f" }}>
      <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
        <Image
          src="/logo-mark.png"
          alt="DanceWithCeech"
          width={36}
          height={36}
        />
        <span style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#F9F9F9" }}>
          Dance With <span style={{ color: "#2563EB" }}>Ceech</span>
        </span>
      </Link>
      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: "var(--muted)" }}>
        <Link href="/beat-first" className="hover:text-white transition-colors">BeatFirst</Link>
        <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
        <Link href="/academy" className="hover:text-white transition-colors">Academy</Link>
        <Link href="/private-lessons" className="hover:text-white transition-colors">Private Lessons</Link>
        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        {user ? (
          <UserMenu name={user.name} email={user.email} image={user.image} />
        ) : (
          <SignInButton />
        )}
        <Link href="/beat-first" className="px-4 py-2 rounded-full text-white text-sm font-medium transition-colors hover:opacity-90" style={{ backgroundColor: "var(--accent-primary)" }}>
          Play Free
        </Link>
      </div>
      {/* Mobile: fluid hamburger menu */}
      <MobileMenu />
    </nav>
  );
}

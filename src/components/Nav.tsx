import Link from "next/link";
import Image from "next/image";
import { auth, signIn } from "@/auth";
import MobileMenu from "@/components/MobileMenu";
import UserMenu from "@/components/UserMenu";

export default async function Nav() {
  const session = await auth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4" style={{ backgroundColor: "var(--background)", borderBottom: "1px solid #1f1f1f" }}>
      <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
        <Image
          src="/logo-mark.png"
          alt="DanceWithCeech"
          width={36}
          height={36}
          style={{ filter: "brightness(0) saturate(100%) invert(72%) sepia(98%) saturate(400%) hue-rotate(5deg) brightness(103%) contrast(101%)" }}
        />
        <span style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#F9F9F9" }}>
          DanceWith<span style={{ color: "#FDB515" }}>Ceech</span>
        </span>
      </Link>
      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: "var(--muted)" }}>
        <Link href="/beat-first" className="hover:text-white transition-colors">BeatFirst</Link>
        <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
        <Link href="/academy" className="hover:text-white transition-colors">Academy</Link>
        <Link href="/private-lessons" className="hover:text-white transition-colors">Private Lessons</Link>
        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        {session ? (
          <UserMenu name={session.user?.name} email={session.user?.email} image={session.user?.image} />
        ) : (
          <form action={async () => { "use server"; await signIn("google"); }}>
            <button type="submit" className="hover:text-white transition-colors">
              Sign In
            </button>
          </form>
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

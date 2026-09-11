import Link from "next/link";
import Image from "next/image";
import MobileMenu from "@/components/MobileMenu";
import UserMenu from "@/components/UserMenu";
import SignInButton from "@/components/SignInButton";
import CampaignNavLink from "@/components/CampaignNavLink";
import LearnFreeMenu from "@/components/LearnFreeMenu";
import styles from "./Navigation.module.css";

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
    <nav aria-label="Main navigation" className={`${styles.navigation} fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 sm:px-6`} style={{ backgroundColor: "var(--background)", borderBottom: "1px solid #1f1f1f" }}>
      <Link href="/" prefetch={false} className="flex items-center gap-2" style={{ textDecoration: "none" }}>
        <Image
          src="/logo-mark.png"
          alt="DanceWithCeech"
          title="DanceWithCeech logo"
          width={36}
          height={36}
        />
        <span style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#F9F9F9" }}>
          Dance With <span style={{ color: "var(--accent-primary-accessible)" }}>Ceech</span>
        </span>
      </Link>
      {/* Desktop nav links */}
      <div className="hidden xl:flex items-center gap-5 text-sm whitespace-nowrap" style={{ color: "var(--muted)" }}>
        <Link href="/private-lessons" prefetch={false} className="hover:text-white transition-colors">Private Lessons</Link>
        <LearnFreeMenu />
        <CampaignNavLink />
        <Link href="/about" prefetch={false} className="hover:text-white transition-colors">About Ceech</Link>
        <Link href="/private-lessons#booking" prefetch={false} className={styles.booking}>Book a Free Call</Link>
        <div className="text-xs">
        {user ? (
          <UserMenu name={user.name} email={user.email} image={user.image} />
        ) : (
          <SignInButton />
        )}
        </div>
      </div>
      {/* Mobile: fluid hamburger menu */}
      <MobileMenu user={user} />
    </nav>
  );
}

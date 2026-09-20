"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { canSeeAttendance } from "@/lib/attendance/navigation";
import Link from "next/link";
import SiteLogo from "@/components/SiteLogo";
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
  googleEmailVerified?: boolean;
};

type Props = {
  user?: NavUser | null;
};

export default function Nav({ user: initialUser }: Props = {}) {
  const [user, setUser] = useState<NavUser | null>(initialUser ?? null);
  useEffect(() => {
    let active = true;
    const refresh = () => { void getSession().then(session => {
      if (active) setUser(session?.user ?? null);
    }).catch(() => { if (active) setUser(null); }); };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, []);
  const showAttendance = canSeeAttendance(user);
  return (
    <nav aria-label="Main navigation" className={`${styles.navigation} fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 sm:px-6`} style={{ backgroundColor: "var(--background)", borderBottom: "1px solid #1f1f1f" }}>
      <SiteLogo />
      {/* Desktop nav links */}
      <div className="hidden xl:flex items-center gap-5 text-sm whitespace-nowrap" style={{ color: "var(--muted)" }}>
        <Link href="/private-lessons" prefetch={false} className="hover:text-white transition-colors">Private Lessons</Link>
        <LearnFreeMenu />
        <CampaignNavLink />
        <Link href="/about" prefetch={false} className="hover:text-white transition-colors">About Ceech</Link>
        {/* Fresh document applies attendance permissions and unloads marketing scripts. */}
        {showAttendance && <a href="/attendance/instructor" className="inline-flex min-h-11 items-center font-semibold text-blue-300 hover:text-white">Attendance</a>}
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
      <MobileMenu user={user} showAttendance={showAttendance} />
    </nav>
  );
}

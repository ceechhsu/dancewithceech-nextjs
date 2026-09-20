/* Full navigation isolates private pages from marketing scripts. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { auth } from "@/auth";
import Frame from "@/components/attendance/Frame";
import GoogleLogin from "@/components/attendance/GoogleLogin";
import MyClasses from "@/components/attendance/MyClasses";
import VerifiedAccess from '@/components/attendance/VerifiedAccess';
import styles from "@/components/attendance/Attendance.module.css";
export const metadata = {
  title: "Your Dashboard | Dance With Ceech",
  robots: { index: false, follow: false },
};
export default async function Dashboard() {
  const session = await auth();
  return (
    <Frame user={session?.user ? { name: session.user.name, image: session.user.image, email: session.user.email, googleEmailVerified: (session.user as { googleEmailVerified?: boolean }).googleEmailVerified } : null}>
      <p className={styles.eyebrow}>Your space</p>
      <h1 className={styles.title}>
        {session?.user
          ? `Welcome, ${session.user.name || "dancer"}`
          : "Your Dashboard"}
      </h1>
      {!session?.user ? (
        <GoogleLogin />
      ) : (
        <>
          <VerifiedAccess returnTo="/dashboard"><MyClasses /></VerifiedAccess>
          <section className={styles.card}>
            <h2>Keep exploring</h2>
            <div className={styles.row}>
              <a href="/beat-first#progress">My Progress</a>
              <a href="/blog">Dance articles</a>
              <a href="/attendance/history">My Attendance History</a>
            </div>
          </section>
        </>
      )}
    </Frame>
  );
}

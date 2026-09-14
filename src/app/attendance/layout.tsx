import Frame from "@/components/attendance/Frame";
import { auth } from '@/auth';
export const metadata = {
  title: "Attendance | Dance With Ceech",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
  manifest: "/attendance/manifest.webmanifest",
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user ? { name: session.user.name, image: session.user.image, email: session.user.email, googleEmailVerified: (session.user as { googleEmailVerified?: boolean }).googleEmailVerified } : null;
  return <Frame user={user}>{children}</Frame>;
}

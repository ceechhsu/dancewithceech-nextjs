import CheckIn from "@/components/attendance/CheckIn";
import { auth } from '@/auth';
import GoogleLogin from '@/components/attendance/GoogleLogin';
import { googleAttendanceIdentity } from '@/lib/attendance/google-identity';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  if (!googleAttendanceIdentity(session?.user, process.env.ATTENDANCE_INSTRUCTOR_EMAILS || '')) {
    return <GoogleLogin returnTo={`/attendance/checkin/${encodeURIComponent(token)}`} />;
  }
  if (!(session?.user as { googleProfileReady?: boolean })?.googleProfileReady) {
    return <><p>Please refresh your Google sign-in once to update your name and photo on the class roster.</p><GoogleLogin returnTo={`/attendance/checkin/${encodeURIComponent(token)}`} /></>;
  }
  return <CheckIn key={token} token={token} email={session!.user!.email!} />;
}

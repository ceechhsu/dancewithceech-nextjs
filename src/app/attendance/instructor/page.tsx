import { auth } from "@/auth";
import InstructorConsole from "@/components/attendance/InstructorConsole";
import GoogleLogin from "@/components/attendance/GoogleLogin";
export default async function Page() {
  const session = await auth();
  return session?.user?.email ? (
    <InstructorConsole owner={session.user.email.toLowerCase()} />
  ) : (
    <GoogleLogin returnTo="/attendance/instructor" />
  );
}

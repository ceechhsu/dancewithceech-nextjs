import { auth } from "@/auth";
import InstructorConsole from "@/components/attendance/InstructorConsole";
import GoogleLogin from "@/components/attendance/GoogleLogin";
import InstructorDashboard from "@/components/attendance/InstructorDashboard";
export default async function Page() {
  const session = await auth();
  return session?.user?.email ? (
    <><InstructorDashboard owner={session.user.email.toLowerCase()} /><div id="take-attendance"><InstructorConsole owner={session.user.email.toLowerCase()} /></div></>
  ) : (
    <GoogleLogin returnTo="/attendance/instructor" />
  );
}

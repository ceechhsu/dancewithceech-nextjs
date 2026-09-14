import { auth } from "@/auth";
import AttendanceHistory from "@/components/attendance/AttendanceHistory";
import GoogleLogin from "@/components/attendance/GoogleLogin";
export default async function Page({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return (await auth())?.user ? (
    <AttendanceHistory classId={classId} />
  ) : (
    <GoogleLogin returnTo={`/attendance/history/${classId}`} />
  );
}

import RosterManager from "@/components/attendance/RosterManager";
export default async function Page({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  return <RosterManager classId={(await params).classId} />;
}
